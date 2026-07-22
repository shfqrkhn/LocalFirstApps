import { STORAGE_PREFIX, STORAGE_VERSION } from "../js/constants.js";

export const STRENGTH_STORAGE_CONTRACT_VERSION = "1.0.0";

export const STRENGTH_STORAGE_KEYS = Object.freeze({
  SESSIONS: `${STORAGE_PREFIX}sessions_v3`,
  PREFS: `${STORAGE_PREFIX}prefs`,
  MIGRATION_VERSION: `${STORAGE_PREFIX}migration_version`,
  BACKUP: `${STORAGE_PREFIX}backup_snapshot`,
  DRAFT: `${STORAGE_PREFIX}draft_session`
});

export const STRENGTH_STORAGE_INVENTORY = Object.freeze([
  Object.freeze({ key: STRENGTH_STORAGE_KEYS.SESSIONS, shape: "session[]", status: "canonical" }),
  Object.freeze({ key: STRENGTH_STORAGE_KEYS.PREFS, shape: "opaque legacy preference value", status: "reserved-compatible" }),
  Object.freeze({ key: STRENGTH_STORAGE_KEYS.MIGRATION_VERSION, shape: `string:${STORAGE_VERSION}`, status: "canonical" }),
  Object.freeze({ key: STRENGTH_STORAGE_KEYS.BACKUP, shape: "opaque legacy snapshot", status: "reserved-compatible" }),
  Object.freeze({ key: STRENGTH_STORAGE_KEYS.DRAFT, shape: "session", status: "canonical" }),
  Object.freeze({ key: `${STORAGE_PREFIX}audit_log`, shape: "audit-entry[]", status: "diagnostic" }),
  Object.freeze({ key: `${STORAGE_PREFIX}errors`, shape: "error-entry[]", status: "diagnostic" })
]);

export const STRENGTH_STORAGE_BOUNDARY = Object.freeze({
  owner: "flexx-files",
  prefix: STORAGE_PREFIX,
  schemaVersion: STORAGE_VERSION,
  crossAppRead: false,
  crossAppWrite: false,
  hiddenSync: false,
  resetPolicy: "prefix-only"
});

export function validateStrengthStorageContract(inventory = STRENGTH_STORAGE_INVENTORY) {
  if (!Array.isArray(inventory) || inventory.length !== 7) throw new Error("Strength storage inventory must contain exactly seven observed keys.");
  const keys = new Set();
  for (const entry of inventory) {
    if (!entry || typeof entry.key !== "string" || !entry.key.startsWith(STORAGE_PREFIX)) throw new Error("Strength storage keys must remain Flexx-owned.");
    if (keys.has(entry.key)) throw new Error(`Duplicate Strength storage key: ${entry.key}`);
    if (!entry.shape || !entry.status) throw new Error(`Incomplete Strength storage entry: ${entry.key}`);
    keys.add(entry.key);
  }
  return true;
}
