export const INSIGHTS_VERSION = "1.0.0";

const freeze = (value) => Object.freeze(value);

export const INSIGHTS_RANGE_SECONDS = freeze({
  "7d": 7 * 24 * 60 * 60,
  "30d": 30 * 24 * 60 * 60,
  "90d": 90 * 24 * 60 * 60,
  "180d": 180 * 24 * 60 * 60,
  "270d": 270 * 24 * 60 * 60,
  "365d": 365 * 24 * 60 * 60,
  "730d": 730 * 24 * 60 * 60,
  "1095d": 1095 * 24 * 60 * 60,
  "1825d": 1825 * 24 * 60 * 60
});

export const INSIGHTS_METRIC_PROFILES = freeze({
  weight: freeze({ key: "weight", class: "continuous", canonicalUnit: "lb", defaultTolerance: 0.1, interpolationEnabled: true, maxInterpolationGapDays: 7 }),
  glucose: freeze({ key: "glucose", class: "continuous", canonicalUnit: "mg/dl", defaultTolerance: 1, interpolationEnabled: true, maxInterpolationGapDays: 1 }),
  blood_pressure: freeze({ key: "blood_pressure", class: "continuous", canonicalUnit: "mmhg", defaultTolerance: 1, interpolationEnabled: true, maxInterpolationGapDays: 3 }),
  calories: freeze({ key: "calories", class: "additive_daily_total", canonicalUnit: "kcal", defaultTolerance: 0, interpolationEnabled: false, maxInterpolationGapDays: null }),
  steps: freeze({ key: "steps", class: "additive_daily_total", canonicalUnit: "count", defaultTolerance: 0, interpolationEnabled: false, maxInterpolationGapDays: null })
});

export const INSIGHTS_LIMITS = freeze({
  maxCsvBytes: 10 * 1024 * 1024,
  maxRows: 100_000,
  maxColumns: 128,
  maxCellCharacters: 65_536,
  maxPackagePoints: 100_000
});

export const INSIGHTS_CONTRACT = freeze({
  version: INSIGHTS_VERSION,
  owner: "commonground",
  status: "parallel-preview",
  activation: false,
  route: null,
  mutationAuthority: null,
  legacyDatabaseRead: false,
  transfer: "explicit-file-only",
  claims: "descriptive-non-causal",
  storage: "none-in-r4b",
  safeFailure: "reject-without-partial-preview-mutation",
  rollback: "code-test-document-only"
});

export function metricProfile(metricKey) {
  const key = String(metricKey || "").trim().toLowerCase();
  return INSIGHTS_METRIC_PROFILES[key] || freeze({
    key: key || "value",
    class: "continuous",
    canonicalUnit: "unit",
    defaultTolerance: 0,
    interpolationEnabled: true,
    maxInterpolationGapDays: 7
  });
}
