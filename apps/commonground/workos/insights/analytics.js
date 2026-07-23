import { INSIGHTS_RANGE_SECONDS } from "./contract.js";

const DAY_SECONDS = 24 * 60 * 60;

function valuesOf(points) {
  return points.map(({ value }) => value);
}

export function filterRange(points, metricKey, preset = "30d", window = null) {
  const matching = points
    .filter((point) => point.metric_key === metricKey && Number.isFinite(point.timestamp_ms) && Number.isFinite(point.value))
    .sort((left, right) => left.timestamp_ms - right.timestamp_ms);
  if (matching.length === 0) return [];
  if (window) {
    const from = Math.min(window.from, window.to);
    const to = Math.max(window.from, window.to);
    const selected = matching.filter(({ timestamp_ms }) => timestamp_ms >= from && timestamp_ms <= to);
    return selected.length > 0 ? selected : matching;
  }
  if (preset === "all") return matching;
  const seconds = INSIGHTS_RANGE_SECONDS[preset];
  if (!seconds) throw new Error("INSIGHTS_RANGE_PRESET");
  const cutoff = matching.at(-1).timestamp_ms - seconds * 1_000;
  return matching.filter(({ timestamp_ms }) => timestamp_ms >= cutoff);
}

export function metricKpis(points) {
  if (points.length === 0) return { latest: null, avg7d: null, avg30d: null, netChange: null };
  const latestTimestamp = points.at(-1).timestamp_ms;
  const averageSince = (seconds) => {
    const values = points.filter(({ timestamp_ms }) => timestamp_ms >= latestTimestamp - seconds * 1_000).map(({ value }) => value);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  return {
    latest: points.at(-1).value,
    avg7d: averageSince(7 * DAY_SECONDS),
    avg30d: averageSince(30 * DAY_SECONDS),
    netChange: points.length > 1 ? points.at(-1).value - points[0].value : 0
  };
}

export function rangeSummary(values) {
  if (values.length === 0) return { first: null, last: null, min: null, max: null, count: 0, change: null };
  return {
    first: values[0],
    last: values.at(-1),
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
    change: values.at(-1) - values[0]
  };
}

export function seriesStatistics(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return {
    avg: average,
    median,
    std: Math.sqrt(variance),
    count: values.length,
    first: values[0],
    last: values.at(-1),
    net: values.at(-1) - values[0]
  };
}

export function rangeStatistics(values) {
  const statistics = seriesStatistics(values);
  if (!statistics) return { mean: null, median: null, standardDeviation: null, variance: null, min: null, max: null, count: 0 };
  return {
    mean: statistics.avg,
    median: statistics.median,
    standardDeviation: statistics.std,
    variance: statistics.std ** 2,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length
  };
}

export function nearestPoint(timestamps, values, target) {
  if (timestamps.length === 0 || values.length === 0) return null;
  const exact = timestamps.indexOf(target);
  if (exact >= 0) return { mode: "exact", timestamp: timestamps[exact], value: values[exact], deltaSeconds: 0 };
  let index = 0;
  let difference = Math.abs(timestamps[0] - target);
  for (let cursor = 1; cursor < timestamps.length; cursor += 1) {
    const candidate = Math.abs(timestamps[cursor] - target);
    if (candidate < difference) {
      difference = candidate;
      index = cursor;
    }
  }
  return { mode: "nearest", timestamp: timestamps[index], value: values[index], deltaSeconds: difference };
}

export function interpolatePoint(timestamps, values, target) {
  const nearest = nearestPoint(timestamps, values, target);
  if (!nearest || nearest.mode === "exact") return nearest;
  let before = -1;
  let after = -1;
  for (let index = 0; index < timestamps.length; index += 1) {
    if (timestamps[index] <= target) before = index;
    if (timestamps[index] >= target) {
      after = index;
      break;
    }
  }
  if (before < 0 || after < 0 || before === after) return nearest;
  const ratio = (target - timestamps[before]) / (timestamps[after] - timestamps[before]);
  return {
    mode: "interpolated",
    timestamp: target,
    value: values[before] + (values[after] - values[before]) * ratio,
    deltaSeconds: 0
  };
}

export function findThresholdCrossings(values, threshold, timestamps = values.map((_, index) => index)) {
  const crossings = [];
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] < threshold && values[index] >= threshold) crossings.push({ index, timestamp: timestamps[index], direction: "up" });
    if (values[index - 1] >= threshold && values[index] < threshold) crossings.push({ index, timestamp: timestamps[index], direction: "down" });
  }
  return crossings;
}

export function timeInBand(values, minimum, maximum) {
  if (values.length === 0) return { inBandCount: 0, totalCount: 0, ratio: 0 };
  const inBandCount = values.filter((value) => value >= minimum && value <= maximum).length;
  return { inBandCount, totalCount: values.length, ratio: inBandCount / values.length };
}

export function detectPlateaus(values, tolerance = 0.1, minimumLength = 3) {
  const plateaus = [];
  if (values.length === 0) return plateaus;
  let start = 0;
  for (let index = 1; index <= values.length; index += 1) {
    if (index < values.length && Math.abs(values[index] - values[start]) <= tolerance) continue;
    if (index - start >= minimumLength) plateaus.push({ startIndex: start, endIndex: index - 1, value: values[start] });
    start = index;
  }
  return plateaus;
}

export function detectOutliers(values, threshold = 2.5) {
  if (values.length < 3) return [];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  if (standardDeviation === 0) return [];
  return values.flatMap((value, index) => Math.abs((value - average) / standardDeviation) >= threshold ? [index] : []);
}

export function detectExtrema(values, tolerance = 0) {
  const extrema = [];
  if (values.length < 3) return extrema;
  for (let index = 1; index < values.length - 1; index += 1) {
    const previous = values[index - 1];
    const value = values[index];
    const next = values[index + 1];
    if (value > previous && value > next && value - Math.max(previous, next) >= tolerance) extrema.push({ index, value, kind: "peak" });
    if (value < previous && value < next && Math.min(previous, next) - value >= tolerance) extrema.push({ index, value, kind: "trough" });
  }
  return extrema;
}

export function aggregateByDay(points, policy = "none") {
  if (policy === "none") return [...points];
  if (!["day_avg", "day_last"].includes(policy)) throw new Error("INSIGHTS_DAY_AGGREGATION");
  const grouped = new Map();
  for (const point of points) {
    const day = new Date(point.timestamp_ms).toISOString().slice(0, 10);
    const group = grouped.get(day) || { timestamp: point.timestamp_ms, points: [] };
    group.timestamp = Math.max(group.timestamp, point.timestamp_ms);
    group.points.push(point);
    grouped.set(day, group);
  }
  return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, group]) => {
    const last = group.points.at(-1);
    return {
      ...last,
      timestamp_ms: group.timestamp,
      value: policy === "day_last"
        ? last.value
        : group.points.reduce((sum, point) => sum + point.value, 0) / group.points.length
    };
  });
}

export function downsample(points, maximum = 2_000) {
  if (points.length <= maximum || maximum < 3) return [...points];
  const step = Math.ceil(points.length / maximum);
  const sampled = [points[0]];
  for (let start = 1; start < points.length - 1; start += step) {
    const end = Math.min(start + step, points.length - 1);
    const window = points.slice(start, end);
    const minimum = window.reduce((left, right) => right.value < left.value ? right : left);
    const maximumPoint = window.reduce((left, right) => right.value > left.value ? right : left);
    for (const point of minimum.timestamp_ms < maximumPoint.timestamp_ms ? [minimum, maximumPoint] : [maximumPoint, minimum]) {
      if (sampled.at(-1).timestamp_ms !== point.timestamp_ms) sampled.push(point);
    }
  }
  if (sampled.at(-1).timestamp_ms !== points.at(-1).timestamp_ms) sampled.push(points.at(-1));
  return sampled;
}

export function compareRanges(leftValues, rightValues) {
  const left = seriesStatistics(leftValues);
  const right = seriesStatistics(rightValues);
  return !left || !right ? null : {
    a: left,
    b: right,
    avgDelta: left.avg - right.avg,
    medianDelta: left.median - right.median,
    netDelta: left.net - right.net
  };
}

export function milestonePoints(points, days = [7, 30, 90, 180, 365]) {
  if (points.length === 0) return [];
  const timestamps = points.map(({ timestamp_ms }) => timestamp_ms / 1_000);
  const values = valuesOf(points);
  const latest = timestamps.at(-1);
  return days.map((day) => ({
    day,
    ...nearestPoint(timestamps, values, latest - day * DAY_SECONDS)
  }));
}

export function describeInsights(points, tolerance = 0.1) {
  const values = valuesOf(points);
  const crossings = values.length ? findThresholdCrossings(values, values.at(-1), points.map(({ timestamp_ms }) => timestamp_ms)) : [];
  const plateaus = detectPlateaus(values, tolerance, 3);
  const outliers = detectOutliers(values);
  if (!crossings.length && !plateaus.length && !outliers.length) return ["No recent crossings, plateaus, or outliers in this range."];
  return [
    `${crossings.length} threshold crossing${crossings.length === 1 ? "" : "s"} observed.`,
    `${plateaus.length} plateau${plateaus.length === 1 ? "" : "s"} observed.`,
    `${outliers.length} statistical outlier${outliers.length === 1 ? "" : "s"} observed.`
  ];
}
