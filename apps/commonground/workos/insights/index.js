export {
  INSIGHTS_CONTRACT,
  INSIGHTS_LIMITS,
  INSIGHTS_METRIC_PROFILES,
  INSIGHTS_RANGE_SECONDS,
  INSIGHTS_VERSION,
  metricProfile
} from "./contract.js";
export { inferCsvMapping, parseCsv } from "./csv.js";
export {
  KILOGRAMS_TO_POUNDS,
  isDateOnly,
  normalizeMetricValue,
  normalizeRows,
  normalizeUnit,
  parseTimestamp,
  warningMessages
} from "./normalize.js";
export {
  aggregateByDay,
  compareRanges,
  describeInsights,
  detectExtrema,
  detectOutliers,
  detectPlateaus,
  downsample,
  filterRange,
  findThresholdCrossings,
  interpolatePoint,
  metricKpis,
  milestonePoints,
  nearestPoint,
  rangeStatistics,
  rangeSummary,
  seriesStatistics,
  timeInBand
} from "./analytics.js";
export {
  buildDatasetPackage,
  buildNormalizedCsv,
  buildViewSummary,
  exportFilenames,
  importDatasetPackage
} from "./transfer.js";
export { applyPreviewCommand, createPreviewState } from "./state.js";
export { mountInsightsPreview } from "./preview.js";
