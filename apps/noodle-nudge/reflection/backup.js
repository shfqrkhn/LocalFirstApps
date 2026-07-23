export const NOODLE_BACKUP_COMPAT_VERSION = "1.0.0";
export const LIFEOS_REFLECTION_PREVIEW_VERSION = "1.0.0";

const REQUIRED_KEYS = ["assessments", "dailyContent", "userAnswers", "userResults", "appConfig"];
const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, "userHistory", "settings", "viewDate", "debugLog"]);

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertSafeKeys(input) {
  const queue = [input];
  let nodes = 0;
  while (queue.length) {
    const current = queue.pop();
    if (!plainObject(current) && !Array.isArray(current)) continue;
    nodes += 1;
    if (nodes > 100000) throw new Error("Invalid backup: Structure is too complex.");
    for (const key of Object.keys(current)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("Invalid backup: Unsafe key detected.");
      const value = current[key];
      if (plainObject(value) || Array.isArray(value)) queue.push(value);
    }
  }
}

export function normalizeNoodleBackup(value) {
  if (!plainObject(value)) throw new Error("Invalid backup: Top-level value must be an object.");
  const unexpected = Object.keys(value).filter((key) => !ALLOWED_KEYS.has(key));
  if (unexpected.length) throw new Error("Invalid backup: Unexpected keys.");
  const missing = REQUIRED_KEYS.filter((key) => !(key in value));
  if (missing.length) throw new Error("Invalid backup: Missing keys.");
  for (const key of ["assessments", "dailyContent", "userAnswers", "userResults", "appConfig"]) if (!plainObject(value[key])) throw new Error(`Invalid ${key} structure.`);
  if (value.userHistory !== undefined && !plainObject(value.userHistory)) throw new Error("Invalid userHistory structure.");
  assertSafeKeys(value);
  return { ...structuredClone(value), userHistory: structuredClone(value.userHistory || {}) };
}

export function persistentNoodleBackupState(value) {
  const normalized = normalizeNoodleBackup(value);
  const { assessments, dailyContent, debugLog, ...persistent } = normalized;
  return persistent;
}

export function createLifeOsReflectionPreview(value, { at } = {}) {
  const normalized = normalizeNoodleBackup(value);
  const assessmentIds = [...new Set([
    ...Object.keys(normalized.userAnswers),
    ...Object.keys(normalized.userResults),
    ...Object.keys(normalized.userHistory)
  ])].sort();
  return {
    format: "commonground-lifeos-reflection-preview",
    formatVersion: LIFEOS_REFLECTION_PREVIEW_VERSION,
    previewOnly: true,
    mutationAllowed: false,
    generatedAt: at || new Date().toISOString(),
    source: {
      app: "noodle-nudge",
      database: "NoodleNudgeDB",
      schemaVersion: 1,
      appVersion: String(normalized.appConfig.version || "unknown")
    },
    selection: { mode: "explicit", assessmentIds },
    summary: {
      assessmentDefinitions: Object.keys(normalized.assessments).length,
      answerSets: Object.keys(normalized.userAnswers).length,
      resultSets: Object.keys(normalized.userResults).length,
      historySets: Object.keys(normalized.userHistory).length
    },
    proposedRecords: assessmentIds.map((assessmentId) => ({
      proposedType: "lifeos/reflection_assessment",
      sourceAssessmentId: assessmentId,
      mappingStatus: "preview-only",
      hasAnswers: Object.hasOwn(normalized.userAnswers, assessmentId),
      hasResult: Object.hasOwn(normalized.userResults, assessmentId),
      hasHistory: Object.hasOwn(normalized.userHistory, assessmentId)
    }))
  };
}
