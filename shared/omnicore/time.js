export const OMNICORE_TIME_VERSION = "1.0.0";

export function isoFrom(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError("A valid instant is required.");
  return date.toISOString();
}

export function nowIso(now = Date.now()) {
  return isoFrom(now);
}

export function isIsoInstant(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

export function resolvedTimezone(fallback = "Etc/UTC") {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback; } catch { return fallback; }
}
