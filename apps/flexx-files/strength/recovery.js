export const STRENGTH_RECOVERY_VERSION = "1.0.0";
export const LIFEOS_STRENGTH_PREVIEW_VERSION = "1.0.0";

function requireFunctions({ validateImportData, scrubSession }) {
  if (typeof validateImportData !== "function" || typeof scrubSession !== "function") {
    throw new TypeError("Strength recovery requires app-owned validation and scrubbing functions.");
  }
}

export function buildStrengthBackup(sessions, { version, exportDate, type } = {}) {
  if (!Array.isArray(sessions)) throw new TypeError("Strength backup sessions must be an array.");
  const backup = { version };
  if (exportDate !== undefined) backup.exportDate = exportDate;
  if (type !== undefined) backup.type = type;
  backup.sessions = sessions;
  return backup;
}

export function validateStrengthBackup(input, dependencies, errorMessage) {
  requireFunctions(dependencies);
  try {
    const data = typeof input === "string" ? JSON.parse(input) : input;
    const validation = dependencies.validateImportData(data);
    if (!validation.valid) return { valid: false, error: errorMessage, issues: [...(validation.errors || [])] };
    const sessions = Array.isArray(data) ? data : data.sessions;
    const cleanSessions = sessions.map(dependencies.scrubSession).filter(session => session !== null);
    return { valid: true, sessions: cleanSessions };
  } catch (error) {
    return { valid: false, error: errorMessage, issues: [error instanceof Error ? error.message : String(error)] };
  }
}

export function validateStrengthDraft(draft, validateSession) {
  if (draft === null) return { valid: true, draft: null };
  if (typeof validateSession !== "function") throw new TypeError("Strength draft validation requires an app-owned session validator.");
  const validation = validateSession(draft);
  return validation.valid
    ? { valid: true, draft }
    : { valid: false, draft: null, issues: [...(validation.errors || [])] };
}

export function normalizeStrengthBackup(input, dependencies) {
  const result = validateStrengthBackup(input, dependencies, "Invalid Flexx Files backup");
  if (!result.valid) throw new Error(result.issues?.[0] || result.error);
  const source = typeof input === "string" ? JSON.parse(input) : input;
  return {
    version: Array.isArray(source) ? "legacy-array" : String(source.version || "unversioned"),
    exportDate: Array.isArray(source) || source.exportDate === undefined ? null : String(source.exportDate),
    type: Array.isArray(source) || source.type === undefined ? null : String(source.type),
    sessions: result.sessions
  };
}

export function createLifeOsStrengthPreview(input, { at, dependencies } = {}) {
  if (typeof at !== "string" || Number.isNaN(Date.parse(at))) throw new TypeError("Strength preview requires an ISO generatedAt value.");
  const backup = normalizeStrengthBackup(input, dependencies);
  return {
    schemaVersion: LIFEOS_STRENGTH_PREVIEW_VERSION,
    kind: "commonground.lifeos.strength.preview",
    generatedAt: at,
    source: {
      appId: "flexx-files",
      storageVersion: "v3",
      backupVersion: backup.version,
      sessionCount: backup.sessions.length
    },
    proposed: {
      moduleId: "strength",
      strategy: "explicit-file-only",
      sessions: backup.sessions.map(session => ({
        sourceId: session.id,
        date: session.date,
        recoveryStatus: session.recoveryStatus,
        exerciseCount: session.exercises.length,
        totalVolume: session.totalVolume ?? null
      }))
    },
    mutationAllowed: false
  };
}
