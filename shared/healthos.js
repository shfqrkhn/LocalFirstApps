import {
  createInterchangePackage,
  parseInterchangeText,
  validateInterchangePackage
} from "./interchange.js";

export const HEALTHOS_SCHEMA_VERSION = "1.0.0";
export const HEALTHOS_SOURCE_APP = "healthos";
export const HEALTH_RECORD_TYPES = Object.freeze({
  DAILY_STATE: "healthos/daily_state",
  FOCUS_SESSION: "healthos/focus_session"
});
export const LIFE_STATES = Object.freeze(["READY", "FOCUSED", "STRETCHED", "OVERLOADED", "DEGRADED", "RECOVERING", "BLOCKED", "CRISIS"]);

const SCORE_FIELDS = ["mood", "energy", "sleep_quality", "stress", "soreness"];

function timezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function text(value, limit = 5000) {
  const normalized = String(value || "").trim();
  if (normalized.length > limit) throw new Error(`Text must not exceed ${limit.toLocaleString()} characters.`);
  return normalized;
}

function score(value, field) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) throw new Error(`${field} must be an integer from 1 through 5.`);
  return number;
}

function calendarDate(value) {
  const normalized = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized;
}

function validateDailyPayload(payload) {
  if (!calendarDate(payload?.date)) throw new Error("Daily state requires a valid calendar date.");
  if (!LIFE_STATES.includes(payload.life_state)) throw new Error("Daily state has an unsupported life state.");
  for (const field of SCORE_FIELDS) score(payload[field], field);
  if (!Array.isArray(payload.pain_flags) || payload.pain_flags.some((item) => typeof item !== "string" || item.length > 200)) throw new Error("Pain flags must be a list of short observations.");
  for (const field of ["intended_focus", "recovery_need", "notes"]) text(payload[field]);
}

function validateFocusPayload(payload) {
  for (const field of ["planned_minutes", "completed_minutes", "interruptions"]) {
    if (!Number.isFinite(payload?.[field]) || payload[field] < 0) throw new Error(`Focus session ${field} must be zero or greater.`);
  }
  if (!Array.isArray(payload.distraction_notes) || payload.distraction_notes.some((item) => typeof item !== "string" || item.length > 1000)) throw new Error("Focus distraction notes are invalid.");
  for (const field of ["intention", "outcome", "stopped_reason", "mode"]) text(payload[field], 2000);
  for (const field of ["energy_before", "energy_after"]) score(payload[field], field);
  if (typeof payload.started_at !== "string" || !Number.isFinite(Date.parse(payload.started_at)) || typeof payload.ended_at !== "string" || !Number.isFinite(Date.parse(payload.ended_at))) throw new Error("Focus session requires valid start and end instants.");
}

export function validateHealthRecord(record) {
  if (!record || typeof record !== "object") throw new Error("HealthOS record must be an object.");
  if (String(record.schemaVersion || "").split(".")[0] !== "1") throw new Error("HealthOS accepts only 1.x record schemas.");
  if (record.type === HEALTH_RECORD_TYPES.DAILY_STATE) validateDailyPayload(record.payload);
  else if (record.type === HEALTH_RECORD_TYPES.FOCUS_SESSION) validateFocusPayload(record.payload);
  else throw new Error(`Unsupported HealthOS record type: ${String(record.type || "missing")}.`);
  return record;
}

async function portableRecord(type, payload, {
  id = `healthos-${crypto.randomUUID()}`,
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
  recordTimezone = timezone(),
  revision = 0,
  status = "active",
  extensions = {}
} = {}) {
  const record = {
    ...structuredClone(extensions),
    schemaVersion: HEALTHOS_SCHEMA_VERSION,
    id,
    type,
    status,
    truthClass: "user-entered",
    confidence: null,
    owner: "local-user",
    sourceApp: HEALTHOS_SOURCE_APP,
    createdAt,
    updatedAt,
    timezone: recordTimezone,
    units: type === HEALTH_RECORD_TYPES.DAILY_STATE
      ? { mood: "ordinal-1-5", energy: "ordinal-1-5", sleep_quality: "ordinal-1-5", stress: "ordinal-1-5", soreness: "ordinal-1-5" }
      : { planned_minutes: "minute", completed_minutes: "minute", energy_before: "ordinal-1-5", energy_after: "ordinal-1-5" },
    assumptions: [],
    conflicts: [],
    relationships: [],
    tags: [type.replace("healthos/", "")],
    payload: structuredClone(payload),
    revision,
    idempotencyKey: "pending"
  };
  validateHealthRecord(record);
  const packageValue = await createInterchangePackage({ sourceApp: HEALTHOS_SOURCE_APP, timezone: recordTimezone, records: [record] });
  return packageValue.records[0];
}

export async function createDailyStateRecord(input, options = {}) {
  const payload = {
    date: String(input.date || ""),
    life_state: String(input.life_state || "READY"),
    mood: score(input.mood, "mood"),
    energy: score(input.energy, "energy"),
    sleep_quality: score(input.sleep_quality, "sleep_quality"),
    stress: score(input.stress, "stress"),
    soreness: score(input.soreness, "soreness"),
    pain_flags: Array.isArray(input.pain_flags) ? input.pain_flags.map((item) => text(item, 200)).filter(Boolean) : text(input.pain_flags, 2000).split(",").map((item) => item.trim()).filter(Boolean),
    intended_focus: text(input.intended_focus),
    recovery_need: text(input.recovery_need),
    notes: text(input.notes)
  };
  return portableRecord(HEALTH_RECORD_TYPES.DAILY_STATE, payload, options);
}

export async function createFocusSessionRecord(input, options = {}) {
  const payload = {
    intention: text(input.intention, 2000),
    mode: text(input.mode, 100),
    planned_minutes: Number(input.planned_minutes || 0),
    completed_minutes: Number(input.completed_minutes || 0),
    interruptions: Number(input.interruptions || 0),
    distraction_notes: (input.distraction_notes || []).map((item) => text(item, 1000)),
    outcome: text(input.outcome, 5000),
    energy_before: score(input.energy_before, "energy_before"),
    energy_after: score(input.energy_after, "energy_after"),
    stopped_reason: text(input.stopped_reason, 2000),
    started_at: input.started_at,
    ended_at: input.ended_at,
    life_state: LIFE_STATES.includes(input.life_state) ? input.life_state : "READY"
  };
  return portableRecord(HEALTH_RECORD_TYPES.FOCUS_SESSION, payload, options);
}

export async function createHealthPackage(records, { selection = {}, packageTimezone = timezone() } = {}) {
  records.forEach(validateHealthRecord);
  return createInterchangePackage({ sourceApp: HEALTHOS_SOURCE_APP, timezone: packageTimezone, records, selection });
}

export async function parseHealthPackageText(value) {
  const parsed = await parseInterchangeText(value);
  parsed.records.forEach(validateHealthRecord);
  return parsed;
}

export async function validateHealthPackage(value) {
  await validateInterchangePackage(value);
  value.records.forEach(validateHealthRecord);
  return value;
}

function csv(value) {
  const string = String(value ?? "");
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

export function healthRecordsToTsDashCsv(records) {
  const rows = [];
  const correlationNote = "Observational export; correlation does not establish causation.";
  for (const record of records) {
    validateHealthRecord(record);
    if (record.type === HEALTH_RECORD_TYPES.DAILY_STATE) {
      for (const field of SCORE_FIELDS) if (record.payload[field] !== null) rows.push([record.updatedAt, record.payload[field], `healthos.${field}`, "ordinal-1-5", record.sourceApp, record.id, record.truthClass, "direct user observation", correlationNote]);
    } else {
      rows.push([record.payload.ended_at, record.payload.completed_minutes, "healthos.focus.completed_minutes", "minute", record.sourceApp, record.id, record.truthClass, "duration derived from persisted timestamps", correlationNote]);
      for (const field of ["energy_before", "energy_after"]) if (record.payload[field] !== null) rows.push([record.payload.ended_at, record.payload[field], `healthos.focus.${field}`, "ordinal-1-5", record.sourceApp, record.id, record.truthClass, "direct user observation", correlationNote]);
    }
  }
  const header = ["timestamp", "value", "metric", "unit", "source_app", "record_id", "truth_class", "derivation", "correlation_note"];
  return [header, ...rows].map((row) => row.map(csv).join(",")).join("\n") + "\n";
}

export function healthStateGuidance(lifeState) {
  return ({
    READY: "Normal focus options are available.",
    FOCUSED: "Protect the chosen work and suppress optional prompts.",
    STRETCHED: "Consider a shorter focus block and fewer commitments.",
    OVERLOADED: "Freeze additions and prioritize recovery or essentials.",
    DEGRADED: "Use a 5- or 10-minute minimum only if it helps.",
    RECOVERING: "Prefer sleep, relationships, recovery, or low-friction activity.",
    BLOCKED: "Name the blocker; do not fake progress.",
    CRISIS: "Remove productivity pressure. Seek immediate local or trusted qualified support if safety may be at risk."
  })[lifeState] || "Choose the smallest useful action.";
}
