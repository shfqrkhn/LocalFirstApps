export const FOCUS_TIMER_SCHEMA_VERSION = 1;

export const FOCUS_MODES = Object.freeze({
  "25-5": Object.freeze({ label: "25 / 5", focusMinutes: 25, breakMinutes: 5 }),
  "50-10": Object.freeze({ label: "50 / 10", focusMinutes: 50, breakMinutes: 10 }),
  "minimum-5": Object.freeze({ label: "5-minute minimum", focusMinutes: 5, breakMinutes: 0 }),
  "minimum-10": Object.freeze({ label: "10-minute minimum", focusMinutes: 10, breakMinutes: 0 }),
  custom: Object.freeze({ label: "Custom", focusMinutes: null, breakMinutes: null }),
  open: Object.freeze({ label: "Open stopwatch", focusMinutes: null, breakMinutes: 0 })
});

function instant(value) {
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error("A valid timer instant is required.");
  return ms;
}

function iso(value) {
  return new Date(instant(value)).toISOString();
}

function boundedMinutes(value, label, { allowZero = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < (allowZero ? 0 : 1) || number > 720) throw new Error(`${label} must be ${allowZero ? "0 through" : "1 through"} 720 minutes.`);
  return number;
}

export function validateFocusTimer(timer) {
  if (!timer || typeof timer !== "object" || timer.schemaVersion !== FOCUS_TIMER_SCHEMA_VERSION) throw new Error("Unsupported focus timer state.");
  if (!FOCUS_MODES[timer.mode]) throw new Error("Focus timer mode is unsupported.");
  if (!["focus", "break"].includes(timer.segment)) throw new Error("Focus timer segment is unsupported.");
  if (!["running", "paused", "review", "cancelled"].includes(timer.status)) throw new Error("Focus timer status is unsupported.");
  if (typeof timer.id !== "string" || !timer.id.trim()) throw new Error("Focus timer ID is required.");
  for (const field of ["createdAt", "updatedAt", "segmentStartedAt", "lastObservedAt"]) instant(timer[field]);
  for (const field of ["accumulatedMs", "lastElapsedMs"]) if (!Number.isFinite(timer[field]) || timer[field] < 0) throw new Error(`Focus timer ${field} is invalid.`);
  if (!Number.isInteger(timer.revision) || timer.revision < 0) throw new Error("Focus timer revision is invalid.");
  if (!Number.isInteger(timer.interruptions) || timer.interruptions < 0) throw new Error("Focus timer interruption count is invalid.");
  if (!Array.isArray(timer.distractionNotes) || timer.distractionNotes.some((note) => typeof note !== "string" || note.length > 1000)) throw new Error("Focus timer distraction notes are invalid.");
  if (timer.mode !== "open") boundedMinutes(timer.focusMinutes, "Focus duration");
  boundedMinutes(timer.breakMinutes, "Break duration", { allowZero: true });
  if (timer.segment === "break" && !timer.breakMinutes) throw new Error("A break timer requires a break duration.");
  return timer;
}

export function createFocusTimer({
  id = `healthos-timer-${crypto.randomUUID()}`,
  mode = "25-5",
  intention = "",
  lifeState = "READY",
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  customFocusMinutes,
  customBreakMinutes,
  segment = "focus",
  now = Date.now()
} = {}) {
  const preset = FOCUS_MODES[mode];
  if (!preset) throw new Error("Unsupported focus mode.");
  const focusMinutes = mode === "custom" ? boundedMinutes(customFocusMinutes, "Focus duration") : preset.focusMinutes;
  const breakMinutes = mode === "custom" ? boundedMinutes(customBreakMinutes, "Break duration", { allowZero: true }) : preset.breakMinutes;
  if (segment === "break" && !breakMinutes) throw new Error("This mode has no break segment.");
  const startedAt = iso(now);
  return {
    schemaVersion: FOCUS_TIMER_SCHEMA_VERSION,
    id,
    mode,
    segment,
    status: "running",
    intention: String(intention).trim().slice(0, 500),
    lifeState,
    timezone,
    focusMinutes,
    breakMinutes,
    createdAt: startedAt,
    updatedAt: startedAt,
    segmentStartedAt: startedAt,
    accumulatedMs: 0,
    lastObservedAt: startedAt,
    lastElapsedMs: 0,
    interruptions: 0,
    distractionNotes: [],
    revision: 0
  };
}

export function plannedMs(timer) {
  if (timer.segment === "break") return Number(timer.breakMinutes) * 60000;
  return timer.mode === "open" ? null : Number(timer.focusMinutes) * 60000;
}

export function reconcileFocusTimer(timer, now = Date.now()) {
  validateFocusTimer(timer);
  const nowMs = instant(now);
  const observedMs = instant(timer.lastObservedAt || timer.updatedAt || timer.createdAt);
  const segmentStartMs = instant(timer.segmentStartedAt || timer.updatedAt || timer.createdAt);
  const clockAnomaly = nowMs < observedMs || nowMs < segmentStartMs;
  const runningDelta = timer.status === "running" && !clockAnomaly ? Math.max(0, nowMs - segmentStartMs) : 0;
  const elapsedMs = Math.max(Number(timer.lastElapsedMs || 0), Number(timer.accumulatedMs || 0) + runningDelta);
  const targetMs = plannedMs(timer);
  return {
    elapsedMs,
    remainingMs: targetMs === null ? null : Math.max(0, targetMs - elapsedMs),
    targetMs,
    complete: targetMs !== null && elapsedMs >= targetMs,
    clockAnomaly,
    timezoneChanged: Boolean(timer.timezone && timer.timezone !== (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"))
  };
}

export function applyFocusTimerAction(timer, action, now = Date.now()) {
  const current = structuredClone(timer);
  const view = reconcileFocusTimer(current, now);
  const timestamp = iso(now);
  const next = { ...current, updatedAt: timestamp, lastObservedAt: timestamp, lastElapsedMs: view.elapsedMs };
  if (action.type === "pause") {
    if (current.status !== "running") throw new Error("Only a running timer can be paused.");
    next.status = "paused";
    next.accumulatedMs = view.elapsedMs;
  } else if (action.type === "resume") {
    if (current.status !== "paused") throw new Error("Only a paused timer can be resumed.");
    next.status = "running";
    next.accumulatedMs = view.elapsedMs;
    next.segmentStartedAt = timestamp;
  } else if (action.type === "correct") {
    const minutes = boundedMinutes(action.minutes, "Corrected elapsed duration", { allowZero: true });
    next.accumulatedMs = minutes * 60000;
    next.lastElapsedMs = next.accumulatedMs;
    next.segmentStartedAt = timestamp;
  } else if (action.type === "restart") {
    next.status = "running";
    next.accumulatedMs = 0;
    next.lastElapsedMs = 0;
    next.segmentStartedAt = timestamp;
  } else if (action.type === "interrupt") {
    next.interruptions = Number(current.interruptions || 0) + 1;
  } else if (action.type === "distraction") {
    const note = String(action.note || "").trim();
    if (!note) throw new Error("Enter a distraction note first.");
    if (note.length > 1000) throw new Error("Distraction notes must not exceed 1,000 characters.");
    next.distractionNotes = [...(current.distractionNotes || []), note];
  } else if (action.type === "finish" || action.type === "skip" || action.type === "cancel") {
    next.status = action.type === "cancel" ? "cancelled" : "review";
    next.accumulatedMs = view.elapsedMs;
  } else {
    throw new Error("Unsupported timer action.");
  }
  return next;
}

export function createBreakTimer(timer, now = Date.now()) {
  if (!Number(timer.breakMinutes)) return null;
  return createFocusTimer({
    id: `healthos-break-${crypto.randomUUID()}`,
    mode: timer.mode,
    intention: "Recovery break",
    lifeState: timer.lifeState,
    timezone: timer.timezone,
    customFocusMinutes: timer.focusMinutes,
    customBreakMinutes: timer.breakMinutes,
    segment: "break",
    now
  });
}

export function formatTimerDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
