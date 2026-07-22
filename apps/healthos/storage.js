import { createHealthPackage, validateHealthPackage, validateHealthRecord } from "../../shared/healthos.js";
import { canonicalJson, sha256 } from "../../shared/interchange.js";
import { validateFocusTimer } from "../../shared/focus-timer.js";

export const HEALTHOS_DB_NAME = "healthos-focus";
export const HEALTHOS_DB_VERSION = 1;
export const HEALTHOS_TIMER_ID = "active-focus-timer";
export const HEALTHOS_PREFERENCES_KEY = "healthos.preferences.v1";

let databasePromise;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("HealthOS storage request failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("HealthOS storage transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("HealthOS storage transaction was aborted."));
  });
}

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
    exportedAt: new Date().toISOString(),
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
  const db = await openHealthDatabase();
  const tx = db.transaction(["records", "receipts", "runtime"], "readwrite");
  for (const name of ["records", "receipts", "runtime"]) tx.objectStore(name).clear();
  for (const record of value.records) tx.objectStore("records").add(record);
  for (const receipt of value.receipts) tx.objectStore("receipts").add(receipt);
  if (value.activeTimer) tx.objectStore("runtime").put({ id: HEALTHOS_TIMER_ID, value: value.activeTimer });
  if (failureMode === "partial") tx.abort();
  try {
    await transactionDone(tx);
    saveHealthPreferences(value.preferences || {});
  } catch (error) {
    throw error;
  }
}

export async function putHealthRecord(record, { expectedRevision } = {}) {
  validateHealthRecord(record);
  const db = await openHealthDatabase();
  const tx = db.transaction("records", "readwrite");
  const store = tx.objectStore("records");
  const current = await requestResult(store.get(record.id));
  if (expectedRevision !== undefined && Number(current?.revision) !== Number(expectedRevision)) {
    tx.abort();
    throw new Error("This HealthOS record changed in another tab. Reload before saving.");
  }
  const next = { ...structuredClone(record), revision: Number(current?.revision ?? record.revision ?? -1) + 1, updatedAt: new Date().toISOString() };
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
    tx.abort();
    throw new Error("A HealthOS timer is already active. Reload instead of starting a duplicate.");
  }
  if (expectedRevision !== undefined && Number(current?.revision) !== Number(expectedRevision)) {
    tx.abort();
    throw new Error("The timer changed in another tab. Reload before changing it.");
  }
  const next = { ...structuredClone(timer), revision: Number(current?.revision ?? -1) + 1, updatedAt: new Date().toISOString() };
  store.put({ id: HEALTHOS_TIMER_ID, value: next });
  await transactionDone(tx);
  return next;
}

export async function discardActiveTimer({ expectedRevision } = {}) {
  const db = await openHealthDatabase();
  const tx = db.transaction("runtime", "readwrite");
  const store = tx.objectStore("runtime");
  const row = await requestResult(store.get(HEALTHOS_TIMER_ID));
  if (expectedRevision !== undefined && Number(row?.value?.revision) !== Number(expectedRevision)) {
    tx.abort();
    throw new Error("The timer changed in another tab. Reload before changing it.");
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
  if (expectedRevision !== undefined && Number(row?.value?.revision) !== Number(expectedRevision)) {
    tx.abort();
    throw new Error("The timer changed in another tab. Reload before completing it.");
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
  const importedAt = new Date().toISOString();
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
    for (const record of normalized) tx.objectStore("records").add(record);
    tx.objectStore("receipts").add(receipt).addEventListener("error", (event) => { requestError = event.target.error; }, { once: true });
    if (failureMode === "partial") tx.abort();
    if (failureMode === "quota") throw new DOMException("Synthetic HealthOS quota failure.", "QuotaExceededError");
    await transactionDone(tx);
    return receipt;
  } catch (error) {
    if (tx.readyState !== "done") try { tx.abort(); } catch {}
    if (error?.name === "ConstraintError" || requestError?.name === "ConstraintError") throw new Error("This HealthOS transfer was already applied.");
    throw error;
  }
}

export async function rollbackHealthReceipt(receiptId) {
  const db = await openHealthDatabase();
  const tx = db.transaction(["records", "receipts"], "readwrite");
  const receipts = tx.objectStore("receipts");
  const receipt = await requestResult(receipts.get(receiptId));
  if (!receipt) { tx.abort(); throw new Error("HealthOS import receipt not found."); }
  if (receipt.status !== "applied") { tx.abort(); throw new Error("This HealthOS import was already rolled back."); }
  for (const id of receipt.createdIds || []) tx.objectStore("records").delete(id);
  receipts.put({ ...receipt, status: "rolled-back", rolledBackAt: new Date().toISOString() });
  await transactionDone(tx);
}

export function loadHealthPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(HEALTHOS_PREFERENCES_KEY) || "{}");
    return {
      audio: value.audio === true,
      vibration: value.vibration === true,
      notifications: value.notifications === true,
      wakeLock: value.wakeLock === true
    };
  } catch {
    return { audio: false, vibration: false, notifications: false, wakeLock: false };
  }
}

export function saveHealthPreferences(value) {
  localStorage.setItem(HEALTHOS_PREFERENCES_KEY, JSON.stringify({
    audio: value.audio === true,
    vibration: value.vibration === true,
    notifications: value.notifications === true,
    wakeLock: value.wakeLock === true
  }));
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
