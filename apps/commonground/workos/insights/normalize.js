import { INSIGHTS_LIMITS, metricProfile } from "./contract.js";

export const KILOGRAMS_TO_POUNDS = 2.2046226218;

export function normalizeUnit(unit) {
  const value = String(unit || "").trim().toLowerCase();
  if (["kgs", "kilogram", "kilograms"].includes(value)) return "kg";
  if (["lbs", "pound", "pounds"].includes(value)) return "lb";
  if (["cal", "kcals", "kcalories", "calories"].includes(value)) return "kcal";
  return value || "unit";
}

export function normalizeMetricValue(metricKey, value, unit) {
  const profile = metricProfile(metricKey);
  const normalizedUnit = normalizeUnit(unit);
  if (profile.key === "weight") {
    return normalizedUnit === "kg"
      ? { value: value * KILOGRAMS_TO_POUNDS, unit: profile.canonicalUnit }
      : { value, unit: profile.canonicalUnit };
  }
  if (profile.key === "calories") return { value, unit: "kcal" };
  return {
    value,
    unit: profile.canonicalUnit === "unit" ? normalizedUnit : profile.canonicalUnit
  };
}

export function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

export function parseTimestamp(value, dateOnlyTimezone = "local") {
  const normalized = String(value || "").trim();
  if (isDateOnly(normalized)) {
    return dateOnlyTimezone === "utc"
      ? new Date(`${normalized}T00:00:00.000Z`).getTime()
      : new Date(`${normalized}T00:00:00`).getTime();
  }
  return new Date(normalized).getTime();
}

export function warningMessages(counts, dateOnlyTimezone, conflictPolicy, localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const warnings = [];
  if (counts.invalidTimestampCount > 0) warnings.push(`${counts.invalidTimestampCount} rows had invalid timestamps and were skipped.`);
  if (counts.invalidValueCount > 0) warnings.push(`${counts.invalidValueCount} rows had invalid numeric values and were skipped.`);
  if (counts.dateOnlyCount > 0) warnings.push(`${counts.dateOnlyCount} date-only rows were parsed using ${dateOnlyTimezone === "utc" ? "UTC" : localTimeZone}.`);
  if (counts.conflictCount > 0) warnings.push(`${counts.conflictCount} duplicate timestamp conflicts resolved using "${conflictPolicy}" policy.`);
  return warnings;
}

export function normalizeRows(rows, {
  datasetId,
  mapping,
  dateOnlyTimezone = "local",
  conflictPolicy = "latest",
  localTimeZone
}) {
  if (!datasetId) throw new Error("INSIGHTS_DATASET_ID_REQUIRED");
  if (!mapping?.timestampCol || !mapping?.valueCol) throw new Error("Timestamp and value columns are required.");
  if (!["local", "utc"].includes(dateOnlyTimezone)) throw new Error("INSIGHTS_TIMEZONE_POLICY");
  if (!["latest", "first", "average"].includes(conflictPolicy)) throw new Error("INSIGHTS_CONFLICT_POLICY");
  if (!Array.isArray(rows) || rows.length > INSIGHTS_LIMITS.maxRows) throw new Error("INSIGHTS_ROW_LIMIT");

  const counts = {
    invalidTimestampCount: 0,
    invalidValueCount: 0,
    dateOnlyCount: 0,
    conflictCount: 0
  };
  const fixedMetric = String(mapping.fixedMetric || "").trim() || "value";
  const fixedUnit = String(mapping.fixedUnit || "").trim() || "unit";

  const candidates = rows.map((row) => {
    const timestampSource = row[mapping.timestampCol];
    if (isDateOnly(timestampSource)) counts.dateOnlyCount += 1;
    const timestamp = parseTimestamp(timestampSource, dateOnlyTimezone);
    const value = Number.parseFloat(row[mapping.valueCol]);
    if (Number.isNaN(timestamp)) counts.invalidTimestampCount += 1;
    if (Number.isNaN(value)) counts.invalidValueCount += 1;
    const rawMetric = mapping.metricCol ? row[mapping.metricCol] : fixedMetric;
    const rawUnit = mapping.unitCol ? row[mapping.unitCol] : fixedUnit;
    const metricKey = String(rawMetric || fixedMetric).toLowerCase().replace(/\s+/g, "_");
    const normalized = Number.isNaN(value)
      ? { value, unit: rawUnit || fixedUnit }
      : normalizeMetricValue(metricKey, value, rawUnit || fixedUnit);
    return {
      dataset_id: datasetId,
      timestamp_ms: timestamp,
      metric_key: metricKey,
      value: normalized.value,
      raw_value: row[mapping.valueCol],
      unit: normalized.unit,
      is_interpolated: 0
    };
  }).filter(({ timestamp_ms, value }) => !Number.isNaN(timestamp_ms) && !Number.isNaN(value));

  const unique = new Map();
  for (const point of candidates) {
    const key = `${point.metric_key}::${point.timestamp_ms}`;
    const prior = unique.get(key);
    if (!prior) {
      unique.set(key, point);
      continue;
    }
    if (prior.value !== point.value) counts.conflictCount += 1;
    if (conflictPolicy === "latest") unique.set(key, point);
    if (conflictPolicy === "average") {
      unique.set(key, {
        ...prior,
        value: (prior.value + point.value) / 2,
        raw_value: `${prior.raw_value}|${point.raw_value}`
      });
    }
  }

  const points = [...unique.values()].sort((left, right) => left.timestamp_ms - right.timestamp_ms);
  return {
    points,
    metricCount: new Set(points.map(({ metric_key }) => metric_key)).size,
    warningCounts: counts,
    warnings: warningMessages(counts, dateOnlyTimezone, conflictPolicy, localTimeZone)
  };
}
