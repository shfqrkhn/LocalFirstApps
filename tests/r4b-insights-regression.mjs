import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  INSIGHTS_CONTRACT,
  INSIGHTS_VERSION,
  applyPreviewCommand,
  buildDatasetPackage,
  buildNormalizedCsv,
  buildViewSummary,
  compareRanges,
  createPreviewState,
  detectExtrema,
  detectOutliers,
  detectPlateaus,
  filterRange,
  findThresholdCrossings,
  inferCsvMapping,
  importDatasetPackage,
  metricKpis,
  normalizeRows,
  parseCsv,
  rangeStatistics,
  rangeSummary,
  timeInBand
} from "../apps/commonground/workos/insights/index.js";
import { WORKOS_MODULES } from "../apps/commonground/workos/catalog.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = JSON.parse(await readFile(new URL("./fixtures/r4b-ts-dash-golden.json", import.meta.url), "utf8"));
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

assert.match(INSIGHTS_VERSION, /^\d+\.\d+\.\d+$/);
assert.equal(INSIGHTS_CONTRACT.owner, "commonground");
assert.equal(INSIGHTS_CONTRACT.status, "parallel-preview");
assert.equal(INSIGHTS_CONTRACT.activation, false);
assert.equal(INSIGHTS_CONTRACT.legacyDatabaseRead, false);
assert.ok(Object.isFrozen(INSIGHTS_CONTRACT));

const insightsModule = WORKOS_MODULES.find(({ id }) => id === "insights");
assert.equal(insightsModule.status, "inactive");
assert.equal(insightsModule.route, null);
assert.equal(insightsModule.mutationOwner, null);

for (const [path, expected] of [
  ["apps/ts-dash/assets/index-Bu3OO-ZO.js", fixture.legacyArtifacts.javascriptSha256],
  ["apps/ts-dash/assets/index-CAzVA2AX.css", fixture.legacyArtifacts.cssSha256],
  ["apps/ts-dash/sw.js", fixture.legacyArtifacts.workerSha256]
]) {
  const digest = createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex");
  assert.equal(digest, expected, `${path} changed`);
}

const parsed = parseCsv(fixture.edgeCsv);
assert.deepEqual(parsed.headers, ["timestamp", "value", "metric", "unit"]);
assert.equal(parsed.rows.length, 6);
assert.equal(parsed.rows.at(-1).value, "1,234");
assert.deepEqual(inferCsvMapping(["recorded_time", "body_weight", "kind", "unit"]), {
  timestampCol: "recorded_time",
  valueCol: "body_weight",
  metricCol: "",
  unitCol: "unit",
  fixedMetric: "weight",
  fixedUnit: "lb"
});
assert.throws(() => parseCsv('"unterminated'), /unclosed quoted field/);
assert.throws(() => parseCsv("a,b\n1,2", { maxCsvBytes: 3, maxRows: 2, maxColumns: 2, maxCellCharacters: 2 }), /size limit/);
assert.throws(() => parseCsv("a,b,c\n1,2,3", { maxCsvBytes: 100, maxRows: 2, maxColumns: 2, maxCellCharacters: 2 }), /too many columns/);
assert.throws(() => parseCsv("a\nlong", { maxCsvBytes: 100, maxRows: 2, maxColumns: 2, maxCellCharacters: 2 }), /cell exceeds/);
assert.throws(() => parseCsv("a\n1\n2", { maxCsvBytes: 100, maxRows: 1, maxColumns: 2, maxCellCharacters: 2 }), /too many rows/);

const normalized = normalizeRows(parsed.rows, {
  datasetId: fixture.normalization.datasetId,
  mapping: fixture.mapping,
  dateOnlyTimezone: fixture.normalization.dateOnlyTimezone,
  conflictPolicy: fixture.normalization.conflictPolicy
});
assert.deepEqual(normalized.points, fixture.normalization.points);
assert.equal(normalized.metricCount, fixture.normalization.metricCount);
assert.deepEqual(normalized.warningCounts, fixture.normalization.warningCounts);
assert.deepEqual(normalized.warnings, fixture.normalization.warnings);

const average = normalizeRows([
  { timestamp: "2026-01-01T00:00:00Z", value: "10", metric: "steps", unit: "count" },
  { timestamp: "2026-01-01T00:00:00Z", value: "20", metric: "steps", unit: "count" },
  { timestamp: "2026-01-01T00:00:00Z", value: "50", metric: "steps", unit: "count" }
], {
  datasetId: "average",
  mapping: fixture.mapping,
  dateOnlyTimezone: "utc",
  conflictPolicy: "average"
});
assert.equal(average.points[0].value, 32.5, "Legacy average is pairwise running average");
assert.equal(average.points[0].raw_value, "10|20|50");
const first = normalizeRows([
  { when: "2026-01-01", amount: "10" },
  { when: "2026-01-01", amount: "20" }
], {
  datasetId: "fixed",
  mapping: { timestampCol: "when", valueCol: "amount", fixedMetric: "steps", fixedUnit: "count" },
  dateOnlyTimezone: "utc",
  conflictPolicy: "first",
  localTimeZone: "UTC"
});
assert.deepEqual(first.points.map(({ metric_key, value, unit }) => ({ metric_key, value, unit })), [
  { metric_key: "steps", value: 10, unit: "count" }
]);
assert.equal(first.warningCounts.conflictCount, 1);

const visible = filterRange(fixture.trendPoints, "weight", "30d");
assert.deepEqual(visible.map(({ value }) => value), [110, 120]);
assert.deepEqual(metricKpis(visible), {
  latest: fixture.trend30d.latest,
  avg7d: fixture.trend30d.avg7d,
  avg30d: fixture.trend30d.avg30d,
  netChange: 10
});
assert.deepEqual(rangeSummary(visible.map(({ value }) => value)), fixture.trend30d.rangeSummary);
assert.deepEqual(rangeStatistics(visible.map(({ value }) => value)), fixture.trend30d.statistics);
assert.deepEqual(findThresholdCrossings([1, 3, 2, 4], 2.5).map(({ direction }) => direction), ["up", "down", "up"]);
assert.deepEqual(timeInBand([1, 2, 3, 4], 2, 3), { inBandCount: 2, totalCount: 4, ratio: 0.5 });
assert.deepEqual(detectPlateaus([4, 4.05, 4.04, 9], 0.1, 3), [{ startIndex: 0, endIndex: 2, value: 4 }]);
assert.deepEqual(detectOutliers([1, 1, 1, 10], 1.5), [3]);
assert.deepEqual(detectExtrema([1, 4, 1, -2, 1], 1), [
  { index: 1, value: 4, kind: "peak" },
  { index: 3, value: -2, kind: "trough" }
]);
assert.equal(compareRanges([1, 2], [3, 4]).avgDelta, -2);

const csv = buildNormalizedCsv("edge", fixture.normalization.points);
assert.equal(csv.filename, fixture.filenames.normalizedCsv);
assert.equal(csv.text.split(/\r?\n/)[0], fixture.normalizedCsvHeader);
assert.ok(csv.text.includes('"1,234"'));

const dataset = {
  id: "golden-dataset",
  name: "edge",
  created_at: 1,
  updated_at: 1,
  timezone: "UTC",
  metric_count: 3,
  row_count: 4,
  import_warnings: fixture.normalization.warnings,
  column_mapping: {}
};
const pkg = buildDatasetPackage(dataset, fixture.normalization.points, "2026-07-23T00:00:00.000Z");
assert.equal(pkg.filename, fixture.filenames.datasetPackage);
const imported = importDatasetPackage(JSON.parse(pkg.text), { existingIds: new Set(), replacementId: "replacement" });
assert.equal(imported.dataset.id, "golden-dataset");
assert.equal(imported.points.length, 4);
assert.throws(() => importDatasetPackage({ unexpected: true }), /Invalid package format\./);
assert.throws(() => importDatasetPackage(JSON.parse(
  '{"dataset":{"id":"unsafe","name":"unsafe","__proto__":{}},"points":[]}'
)), /Invalid package format\./);
assert.throws(() => importDatasetPackage({
  dataset: { id: "too-large", name: "too-large" },
  points: Array(100_001).fill(null)
}), /INSIGHTS_PACKAGE_POINT_LIMIT/);

const summary = buildViewSummary(dataset, fixture.trendPoints, {
  metricKey: "weight",
  rangePreset: "30d",
  exportedAt: "2026-07-23T00:00:00.000Z"
});
assert.equal(summary.filename, fixture.filenames.viewSummary);
assert.deepEqual(JSON.parse(summary.text).kpis.range_summary, fixture.trend30d.rangeSummary);

const original = createPreviewState({ datasets: [], points: [], revision: 2, foreign: { untouched: true } });
const added = applyPreviewCommand(original, {
  type: "import",
  expectedRevision: 2,
  dataset,
  points: fixture.normalization.points
});
assert.equal(added.revision, 3);
assert.equal(added.datasets.length, 1);
assert.deepEqual(added.foreign, original.foreign);
assert.throws(() => applyPreviewCommand(original, { type: "clear", expectedRevision: 1 }), /STALE_PREVIEW_WRITE/);
assert.throws(() => applyPreviewCommand(original, { type: "clear", expectedRevision: 2, fault: "quota" }), /PREVIEW_QUOTA/);
assert.throws(() => applyPreviewCommand(original, { type: "clear", expectedRevision: 2, fault: "partial" }), /PREVIEW_PARTIAL/);
assert.deepEqual(original, createPreviewState({ datasets: [], points: [], revision: 2, foreign: { untouched: true } }));

const sourcePaths = [
  "apps/commonground/workos/insights/contract.js",
  "apps/commonground/workos/insights/csv.js",
  "apps/commonground/workos/insights/normalize.js",
  "apps/commonground/workos/insights/analytics.js",
  "apps/commonground/workos/insights/transfer.js",
  "apps/commonground/workos/insights/state.js",
  "apps/commonground/workos/insights/preview.js",
  "apps/commonground/workos/insights/index.js"
];
const source = (await Promise.all(sourcePaths.map(read))).join("\n");
for (const forbidden of [
  "indexedDB",
  "localStorage",
  "sessionStorage",
  "BroadcastChannel",
  "navigator.serviceWorker",
  "apps/ts-dash",
  "TSDashDB",
  "fetch(",
  "new Function",
  "eval("
]) {
  assert.equal(source.includes(forbidden), false, `Insights preview gained forbidden capability: ${forbidden}`);
}

const app = await read("apps/commonground/app.js");
const adapter = await read("apps/commonground/workos-adapter.js");
assert.equal(app.includes("workos/insights"), false);
assert.equal(adapter.includes("workos/insights"), false);

const shell = JSON.parse(await read("apps/commonground/pwa-shell.json"));
for (const path of sourcePaths.map((value) => `./${value.replace("apps/commonground/", "")}`).concat("./workos/insights/preview.css")) {
  assert.ok(shell.assets.some(({ url }) => url === path), `CommonGround shell missing ${path}`);
}

console.log("R4B readable Insights parsing, normalization, analytics, transfer, isolation, and shell regression passed.");
