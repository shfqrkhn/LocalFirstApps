import { INSIGHTS_LIMITS } from "./contract.js";
import { filterRange, metricKpis, rangeSummary } from "./analytics.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function safeObject(value) {
  if (!isPlainObject(value)) return false;
  return !Object.keys(value).some((key) => ["__proto__", "constructor", "prototype"].includes(key));
}

function quoteCsv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function exportFilenames(name) {
  return {
    normalizedCsv: `${name}_normalized.csv`,
    datasetPackage: `${name}_package.json`,
    chart: `${name}_chart.png`,
    viewSummary: `${name}_view_summary.json`
  };
}

export function buildNormalizedCsv(name, points) {
  const header = "dataset_id,timestamp_iso,metric_key,value,raw_value,unit,is_interpolated";
  const rows = [...points].sort((left, right) => left.timestamp_ms - right.timestamp_ms).map((point) => [
    point.dataset_id,
    new Date(point.timestamp_ms).toISOString(),
    point.metric_key,
    String(point.value),
    String(point.raw_value ?? ""),
    point.unit,
    String(point.is_interpolated)
  ].map(quoteCsv).join(","));
  return {
    filename: exportFilenames(name).normalizedCsv,
    mediaType: "text/csv;charset=utf-8",
    text: [header, ...rows].join("\n")
  };
}

export function buildDatasetPackage(dataset, points, exportedAt = new Date().toISOString()) {
  return {
    filename: exportFilenames(dataset.name).datasetPackage,
    mediaType: "application/json;charset=utf-8",
    text: JSON.stringify({ exported_at: exportedAt, dataset: clone(dataset), points: clone(points) }, null, 2)
  };
}

export function importDatasetPackage(value, {
  existingIds = new Set(),
  replacementId
} = {}) {
  if (!safeObject(value) || !safeObject(value.dataset) || !Array.isArray(value.points)) throw new Error("Invalid package format.");
  if (value.points.length > INSIGHTS_LIMITS.maxPackagePoints) throw new Error("INSIGHTS_PACKAGE_POINT_LIMIT");
  const originalId = value.dataset.id;
  if (typeof originalId !== "string" || !originalId || typeof value.dataset.name !== "string") throw new Error("Invalid package format.");
  const id = existingIds.has(originalId) ? replacementId : originalId;
  if (!id) throw new Error("INSIGHTS_PACKAGE_ID_CONFLICT");
  const points = value.points.filter((point) => safeObject(point) && typeof point.timestamp_ms === "number" && typeof point.value === "number")
    .map((point) => ({ ...clone(point), id: undefined, dataset_id: id }));
  return {
    dataset: { ...clone(value.dataset), id, row_count: points.length },
    points
  };
}

export function buildViewSummary(dataset, points, {
  metricKey,
  rangePreset = "30d",
  exportedAt = new Date().toISOString(),
  visibleWindow = null,
  dateComparison = null,
  rangeComparison = null
}) {
  const visible = filterRange(points, metricKey, rangePreset, visibleWindow);
  const kpis = metricKpis(visible);
  const summary = rangeSummary(visible.map(({ value }) => value));
  const payload = {
    exported_at: exportedAt,
    dataset: { id: dataset.id, name: dataset.name },
    view: {
      metric_key: metricKey,
      range_preset: rangePreset,
      is_zoomed: Boolean(visibleWindow),
      visible_window: visible.length ? {
        from_iso: new Date(visible[0].timestamp_ms).toISOString(),
        to_iso: new Date(visible.at(-1).timestamp_ms).toISOString(),
        points: visible.length
      } : null
    },
    kpis: {
      latest: kpis.latest,
      avg_7d: kpis.avg7d,
      avg_30d: kpis.avg30d,
      range_summary: summary
    },
    comparisons: {
      date_compare: dateComparison,
      range_compare: rangeComparison
    }
  };
  return {
    filename: exportFilenames(dataset.name).viewSummary,
    mediaType: "application/json;charset=utf-8",
    text: JSON.stringify(payload, null, 2)
  };
}
