import { createHealthPackage, validateHealthPackage, validateHealthRecord } from "./modules/healthos.js";
import { validateFocusTimer } from "./modules/focus-timer.js";
import {
  OmniCoreError,
  abortTransaction,
  assertExpectedRevision,
  assertReceiptCanRollback,
  nowIso,
  requestResult,
  rolledBackReceipt,
  sha256,
  trackTransactionRequest,
  transactionDone
} from "./omnicore-adapter.js";

export const HEALTHOS_DB_NAME = "healthos-focus";
export const HEALTHOS_DB_VERSION = 1;
export const HEALTHOS_TIMER_ID = "active-focus-timer";
export const HEALTHOS_PREFERENCES_KEY = "healthos.preferences.v1";
export const HEALTHOS_PREFERENCE_RESTORE_ID = "pending-preference-restore";

let databasePromise;

export function openHealthDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(HEALTHOS_DB_NAME, HEALTHOS_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const records = db.objectStoreNames.contains("records") ? request.transaction.objectStore("records") : db.createObjectStore("records", { keyPath: "id" });
      if (!records.indexNames.contains("type")) records.createIndex("type", "type");
      if (!records.indexNames.contains("updatedAt")) records.createIndex("updatedAt", "updatedAt");
      if (!records.indexNames.contains("date")) records.createIndex("date", "payload.date");
      const receipts = db.objectStoreNames.contains("receipts") ? request.transaction.objectStore("receipts") : db.createObjectStore("receipts", { keyPath: "id" });
      if (!receipts.indexNames.contains("idempotencyKey")) receipts.createIndex("idempotencyKey", "idempotencyKey", { unique: true });
      if (!db.objectStoreNames.contains("runtime")) db.createObjectStore("runtime", { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); databasePromise = undefined; };
      resolve(db);
    };
    request.onerror = () => { databasePromise = undefined; reject(request.error || new Error("Unable to open HealthOS storage.")); };
    request.onblocked = () => reject(new Error("Close other HealthOS tabs before upgrading storage."));
  });
  return databasePromise;
}

export async function getAllHealthRecords() {
  const db = await openHealthDatabase();
  const tx = db.transaction("records", "readonly");
  const records = await requestResult(tx.objectStore("records").getAll());
  await transactionDone(tx);
  return records.sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

export async function getAllHealthReceipts() {
  const db = await openHealthDatabase();
  const tx = db.transaction("receipts", "readonly");
  const receipts = await requestResult(tx.objectStore("receipts").getAll());
  await transactionDone(tx);
  return receipts.sort((left, right) => String(right.appliedAt).localeCompare(String(left.appliedAt)));
}

export async function createHealthBackup() {
  const [records, receipts, activeTimer] = await Promise.all([getAllHealthRecords(), getAllHealthReceipts(), getActiveTimer()]);
  const value = {
    format: "healthos-complete-backup",
    formatVersion: "1.0.0",
    exportedAt: nowIso(),
    records,
    receipts,
    activeTimer,
    preferences: loadHealthPreferences()
  };
  value.sha256 = await sha256(value);
  return value;
}

export async function validateHealthBackup(value) {
  if (!value || value.format !== "healthos-complete-backup" || String(value.formatVersion || "").split(".")[0] !== "1") throw new Error("Unsupported HealthOS backup format.");
  if (!Array.isArray(value.records) || !Array.isArray(value.receipts)) throw new Error("HealthOS backup records are invalid.");
  value.records.forEach(validateHealthRecord);
  if (value.activeTimer) validateFocusTimer(value.activeTimer);
  const copy = structuredClone(value);
  delete copy.sha256;
  if (typeof value.sha256 !== "string" || await sha256(copy) !== value.sha256) throw new Error("HealthOS backup integrity check failed.");
  return value;
}

export async function restoreHealthBackupAtomic(value, { failureMode } = {}) {
  await validateHealthBackup(value);
  const preferences = normalizeHealthPreferences(value.preferences);
  const recovery = {
    id: HEALTHOS_PREFERENCE_RESTORE_ID,
    value: {
      status: "preferences-pending",
      preferences,
      backupHash: value.sha256,
      createdAt: nowIso()
    }
  };
  const db = await openHealthDatabase();
  const tx = db.transaction(["records", "receipts", "runtime"], "readwrite");
  for (const name of ["records", "receipts", "runtime"]) tx.objectStore(name).clear();
  for (const record of value.records) tx.objectStore("records").add(record);
  for (const receipt of value.receipts) tx.objectStore("receipts").add(receipt);
  if (value.activeTimer) tx.objectStore("runtime").put({ id: HEALTHOS_TIMER_ID, value: value.activeTimer });
  tx.objectStore("runtime").put(recovery);
  if (failureMode === "partial") abortTransaction(tx);
  await transactionDone(tx);
  try {
    if (failureMode === "preferences") throw new DOMException("Synthetic HealthOS preference storage failure.", "QuotaExceededError");
    saveHealthPreferences(preferences);
  } catch (cause) {
    throw new OmniCoreError(
      "HEALTHOS_PREFERENCES_PENDING",
      "Health records were restored, but cue preferences could not be saved. Retry preference recovery to finish.",
      { cause, details: { recoveryId: HEALTHOS_PREFERENCE_RESTORE_ID } }
    );
  }
  await clearPendingPreferenceRestore();
  return { status: "complete", preferences: "restored" };
}

export async function getPendingPreferenceRestore() {
  const db = await openHealthDatabase();
  const tx = db.transaction("runtime", "readonly");
  const row = await requestResult(tx.objectStore("runtime").get(HEALTHOS_PREFERENCE_RESTORE_ID));
  await transactionDone(tx);
  return row?.value || null;
}

async function clearPendingPreferenceRestore() {
  const db = await openHealthDatabase();
  const tx = db.transaction("runtime", "readwrite");
  tx.objectStore("runtime").delete(HEALTHOS_PREFERENCE_RESTORE_ID);
  await transactionDone(tx);
}

export async function retryPendingPreferenceRestore({ failureMode } = {}) {
  const pending = await getPendingPreferenceRestore();
  if (!pending) throw new OmniCoreError("HEALTHOS_PREFERENCES_NOT_PENDING", "No HealthOS preference recovery is pending.");
  try {
    if (failureMode === "preferences") throw new DOMException("Synthetic HealthOS preference storage failure.", "QuotaExceededError");
    saveHealthPreferences(pending.preferences);
  } catch (cause) {
    throw new OmniCoreError(
      "HEALTHOS_PREFERENCES_PENDING",
      "Cue preferences still could not be saved. Restored health records remain available; retry later.",
      { cause, details: { recoveryId: HEALTHOS_PREFERENCE_RESTORE_ID } }
    );
  }
  await clearPendingPreferenceRestore();
  return { status: "complete", preferences: loadHealthPreferences() };
}

export async function putHealthRecord(record, { expectedRevision } = {}) {
  validateHealthRecord(record);
  const db = await openHealthDatabase();
  const tx = db.transaction("records", "readwrite");
  const store = tx.objectStore("records");
  const current = await requestResult(store.get(record.id));
  try {
    assertExpectedRevision(current, expectedRevision, {
      conflictMessage: "This HealthOS record changed in another tab. Reload before saving."
    });
  } catch (error) {
    abortTransaction(tx);
    throw error;
  }
  const next = { ...structuredClone(record), revision: Number(current?.revision ?? record.revision ?? -1) + 1, updatedAt: nowIso() };
  store.put(next);
  await transactionDone(tx);
  return next;
}

export async function getActiveTimer() {
  const db = await openHealthDatabase();
  const tx = db.transaction("runtime", "readonly");
  const timer = await requestResult(tx.objectStore("runtime").get(HEALTHOS_TIMER_ID));
  await transactionDone(tx);
  return timer?.value || null;
}

export async function saveActiveTimer(timer, { expectedRevision } = {}) {
  validateFocusTimer(timer);
  const db = await openHealthDatabase();
  const tx = db.transaction("runtime", "readwrite");
  const store = tx.objectStore("runtime");
  const row = await requestResult(store.get(HEALTHOS_TIMER_ID));
  const current = row?.value || null;
  if (expectedRevision === undefined && current) {
    abortTransaction(tx);
    throw new Error("A HealthOS timer is already active. Reload instead of starting a duplicate.");
  }
  try {
    assertExpectedRevision(current, expectedRevision, {
      conflictMessage: "The timer changed in another tab. Reload before changing it."
    });
  } catch (error) {
    abortTransaction(tx);
    throw error;
  }
  const next = { ...structuredClone(timer), revision: Number(current?.revision ?? -1) + 1, updatedAt: nowIso() };
  store.put({ id: HEALTHOS_TIMER_ID, value: next });
  await transactionDone(tx);
  return next;
}

export async function discardActiveTimer({ expectedRevision } = {}) {
  const db = await openHealthDatabase();
  const tx = db.transaction("runtime", "readwrite");
  const store = tx.objectStore("runtime");
  const row = await requestResult(store.get(HEALTHOS_TIMER_ID));
  try {
    assertExpectedRevision(row?.value || null, expectedRevision, {
      conflictMessage: "The timer changed in another tab. Reload before changing it."
    });
  } catch (error) {
    abortTransaction(tx);
    throw error;
  }
  store.delete(HEALTHOS_TIMER_ID);
  await transactionDone(tx);
}

export async function completeActiveTimer(sessionRecord, { expectedRevision, nextTimer = null } = {}) {
  validateHealthRecord(sessionRecord);
  const db = await openHealthDatabase();
  const tx = db.transaction(["records", "runtime"], "readwrite");
  const records = tx.objectStore("records");
  const runtime = tx.objectStore("runtime");
  const existing = await requestResult(records.get(sessionRecord.id));
  if (existing) {
    await transactionDone(tx);
    return { record: existing, duplicate: true };
  }
  const row = await requestResult(runtime.get(HEALTHOS_TIMER_ID));
  try {
    assertExpectedRevision(row?.value || null, expectedRevision, {
      conflictMessage: "The timer changed in another tab. Reload before completing it."
    });
  } catch (error) {
    abortTransaction(tx);
    throw error;
  }
  records.add(sessionRecord);
  if (nextTimer) runtime.put({ id: HEALTHOS_TIMER_ID, value: { ...nextTimer, revision: 0 } });
  else runtime.delete(HEALTHOS_TIMER_ID);
  await transactionDone(tx);
  return { record: sessionRecord, duplicate: false };
}

export async function applyHealthPackageAtomic(packageValue, { failureMode } = {}) {
  await validateHealthPackage(packageValue);
  const existingDb = await openHealthDatabase();
  const checkTx = existingDb.transaction("receipts", "readonly");
  const existingReceipt = await requestResult(checkTx.objectStore("receipts").index("idempotencyKey").get(packageValue.manifest.idempotencyKey));
  await transactionDone(checkTx);
  if (existingReceipt) throw new Error("This HealthOS transfer was already applied.");
  const importedAt = nowIso();
  const remapped = packageValue.records.map((record) => ({
    ...structuredClone(record),
    id: `healthos-import-${crypto.randomUUID()}`,
    sourceRecordId: record.id,
    importedAt,
    revision: 0,
    updatedAt: importedAt,
    idempotencyKey: "pending"
  }));
  const normalized = (await createHealthPackage(remapped, { selection: { sourceTransferId: packageValue.transferId }, packageTimezone: packageValue.timezone })).records;
  const receipt = {
    id: `healthos-receipt-${crypto.randomUUID()}`,
    idempotencyKey: packageValue.manifest.idempotencyKey,
    packageHash: packageValue.manifest.packageHash,
    transferId: packageValue.transferId,
    sourceApp: packageValue.sourceApp,
    createdIds: normalized.map((record) => record.id),
    status: "applied",
    appliedAt: importedAt,
    rolledBackAt: null
  };
  const db = existingDb;
  const tx = db.transaction(["records", "receipts"], "readwrite");
  let requestError;
  try {
    for (const record of normalized) trackTransactionRequest(tx, tx.objectStore("records").add(record));
    const receiptRequest = trackTransactionRequest(tx, tx.objectStore("receipts").add(receipt));
    receiptRequest.addEventListener("error", (event) => { requestError = event.target.error; }, { once: true });
    if (failureMode === "partial") abortTransaction(tx);
    if (failureMode === "quota") throw new DOMException("Synthetic HealthOS quota failure.", "QuotaExceededError");
    await transactionDone(tx);
    return receipt;
  } catch (error) {
    abortTransaction(tx);
    if (error?.name === "ConstraintError" || requestError?.name === "ConstraintError") throw new Error("This HealthOS transfer was already applied.");
    throw error;
  }
}

export async function rollbackHealthReceipt(receiptId) {
  const db = await openHealthDatabase();
  const tx = db.transaction(["records", "receipts"], "readwrite");
  const receipts = tx.objectStore("receipts");
  const receipt = await requestResult(receipts.get(receiptId));
  try {
    assertReceiptCanRollback(receipt, {
      missingMessage: "HealthOS import receipt not found.",
      alreadyRolledBackMessage: "This HealthOS import was already rolled back."
    });
  } catch (error) {
    abortTransaction(tx);
    throw error;
  }
  for (const id of receipt.createdIds || []) tx.objectStore("records").delete(id);
  receipts.put(rolledBackReceipt(receipt));
  await transactionDone(tx);
}

export function normalizeHealthPreferences(value) {
  return {
    audio: value?.audio === true,
    vibration: value?.vibration === true,
    notifications: value?.notifications === true,
    wakeLock: value?.wakeLock === true
  };
}

export function loadHealthPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(HEALTHOS_PREFERENCES_KEY) || "{}");
    return normalizeHealthPreferences(value);
  } catch {
    return normalizeHealthPreferences();
  }
}

export function saveHealthPreferences(value) {
  localStorage.setItem(HEALTHOS_PREFERENCES_KEY, JSON.stringify(normalizeHealthPreferences(value)));
}

export async function deleteHealthDatabase() {
  const db = await databasePromise?.catch(() => null);
  db?.close();
  databasePromise = undefined;
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(HEALTHOS_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Unable to delete HealthOS storage."));
    request.onblocked = () => reject(new Error("Close other HealthOS tabs before resetting."));
  });
}
