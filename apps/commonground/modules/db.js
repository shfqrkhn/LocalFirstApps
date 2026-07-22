export const DB_NAME = "commonground-suite";
export const DB_VERSION = 4;
export const SCHEMA_VERSION = 4;

export const STORE_DEFINITIONS = [
  ["workspaces", []],
  ["matters", [["workspaceId", "workspaceId"], ["status", "status"], ["type", "type"]]],
  ["participants", [["matterId", "matterId"]]],
  ["intakeRecords", [["matterId", "matterId"], ["participantId", "participantId"]]],
  ["issueNodes", [["matterId", "matterId"], ["priority", "priority"]]],
  ["sessions", [["matterId", "matterId"]]],
  ["commitments", [["matterId", "matterId"], ["status", "status"]]],
  ["followUps", [["matterId", "matterId"]]],
  ["exportArtifacts", [["matterId", "matterId"]]],
  ["decisionBriefs", [["matterId", "matterId", true]]],
  ["decisionItems", [["matterId", "matterId"], ["matterKind", ["matterId", "kind"]]]],
  ["migrationReceipts", [["sourceFingerprint", "sourceFingerprint", true]]],
  ["transferReceipts", [["idempotencyKey", "idempotencyKey", true], ["status", "status"]]]
];

export const STORE_NAMES = STORE_DEFINITIONS.map(([name]) => name);
export const MATTER_CHILD_STORES = [
  "participants",
  "intakeRecords",
  "issueNodes",
  "sessions",
  "commitments",
  "followUps",
  "exportArtifacts",
  "decisionBriefs",
  "decisionItems"
];

let databasePromise;
const transactionRequestErrors = new WeakMap();

export function uid(prefix = "cg") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function baseRecord(prefix) {
  const timestamp = nowIso();
  return { id: uid(prefix), createdAt: timestamp, updatedAt: timestamp, schemaVersion: SCHEMA_VERSION, revision: 0 };
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || transactionRequestErrors.get(transaction) || new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error || transactionRequestErrors.get(transaction) || new Error("IndexedDB transaction aborted."));
  });
}

function trackTransactionRequest(transaction, request) {
  request.addEventListener("error", () => transactionRequestErrors.set(transaction, request.error), { once: true });
  return request;
}

function ensureIndex(store, name, keyPath, unique = false) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, { unique });
}

export function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, indexes] of STORE_DEFINITIONS) {
        const store = db.objectStoreNames.contains(name)
          ? request.transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: "id" });
        ensureIndex(store, "createdAt", "createdAt");
        ensureIndex(store, "updatedAt", "updatedAt");
        ensureIndex(store, "schemaVersion", "schemaVersion");
        for (const [indexName, keyPath, unique = false] of indexes) ensureIndex(store, indexName, keyPath, unique);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        databasePromise = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error || new Error("Unable to open CommonGround storage."));
    };
    request.onblocked = () => reject(new Error("Close other CommonGround tabs before upgrading storage."));
  });
  return databasePromise;
}

export async function getAll(storeName) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readonly");
  const rows = await requestResult(tx.objectStore(storeName).getAll());
  await transactionDone(tx);
  return rows;
}

export async function getOne(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readonly");
  const row = await requestResult(tx.objectStore(storeName).get(id));
  await transactionDone(tx);
  return row || null;
}

export async function getByIndex(storeName, indexName, value) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readonly");
  const rows = await requestResult(tx.objectStore(storeName).index(indexName).getAll(value));
  await transactionDone(tx);
  return rows;
}

export async function put(storeName, value, { expectedRevision } = {}) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  const current = value.id ? await requestResult(store.get(value.id)) : null;
  if (expectedRevision !== undefined) {
    if (!current) throw new Error("This record was deleted in another tab. Reload before continuing.");
    if (Number(current.revision || 0) !== Number(expectedRevision)) {
      throw new Error("This record changed in another tab. Reload before saving so the newer version is preserved.");
    }
  }
  const record = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: value.createdAt || nowIso(),
    ...value,
    updatedAt: nowIso(),
    revision: Number(current?.revision || 0) + 1
  };
  store.put(record);
  await transactionDone(tx);
  return record;
}

export async function remove(storeName, id) {
  const db = await openDatabase();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(id);
  await transactionDone(tx);
}

export async function deleteMatterGraph(matterId) {
  const db = await openDatabase();
  const tx = db.transaction(["matters", ...MATTER_CHILD_STORES], "readwrite");
  for (const storeName of MATTER_CHILD_STORES) {
    const store = tx.objectStore(storeName);
    const keys = await requestResult(store.index("matterId").getAllKeys(matterId));
    for (const key of keys) store.delete(key);
  }
  tx.objectStore("matters").delete(matterId);
  await transactionDone(tx);
}

export async function clearAllStores() {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAMES, "readwrite");
  for (const name of STORE_NAMES) tx.objectStore(name).clear();
  await transactionDone(tx);
}

export async function getMatterGraph(matterId) {
  const matter = await getOne("matters", matterId);
  if (!matter) return null;
  const entries = await Promise.all(MATTER_CHILD_STORES.map(async (name) => [name, await getByIndex(name, "matterId", matterId)]));
  return { matter, ...Object.fromEntries(entries) };
}

export async function getWorkspaceGraph(workspaceId) {
  const workspace = await getOne("workspaces", workspaceId);
  if (!workspace) return null;
  const matters = await getByIndex("matters", "workspaceId", workspaceId);
  const matterGraphs = await Promise.all(matters.map((matter) => getMatterGraph(matter.id)));
  return { workspace, matters: matterGraphs.filter(Boolean) };
}

export async function writeGraphAtomic({ workspaces = [], matters = [], children = {}, receipts = [] }) {
  const names = new Set(["workspaces", "matters", "migrationReceipts"]);
  for (const [name, rows] of Object.entries(children)) if (rows.length) names.add(name);
  const db = await openDatabase();
  const tx = db.transaction([...names], "readwrite");
  for (const row of workspaces) tx.objectStore("workspaces").add(row);
  for (const row of matters) tx.objectStore("matters").add(row);
  for (const [name, rows] of Object.entries(children)) for (const row of rows) tx.objectStore(name).add(row);
  for (const row of receipts) tx.objectStore("migrationReceipts").add(row);
  await transactionDone(tx);
}

export async function writeInterchangeAtomic({ workspaces = [], matters = [], children = {}, receipt, failureMode } = {}) {
  if (!receipt) throw new Error("An interchange receipt is required.");
  if (failureMode === "quota") throw new DOMException("Simulated storage quota failure.", "QuotaExceededError");
  const names = new Set(["workspaces", "matters", "transferReceipts"]);
  for (const [name, rows] of Object.entries(children)) if (rows.length) names.add(name);
  const db = await openDatabase();
  const tx = db.transaction([...names], "readwrite");
  for (const row of workspaces) trackTransactionRequest(tx, tx.objectStore("workspaces").add(row));
  for (const row of matters) trackTransactionRequest(tx, tx.objectStore("matters").add(row));
  for (const [name, rows] of Object.entries(children)) for (const row of rows) trackTransactionRequest(tx, tx.objectStore(name).add(row));
  trackTransactionRequest(tx, tx.objectStore("transferReceipts").add(receipt));
  if (failureMode === "partial") tx.abort();
  await transactionDone(tx);
  return receipt;
}

export async function rollbackInterchangeReceipt(receiptId) {
  const db = await openDatabase();
  const tx = db.transaction(["workspaces", "matters", ...MATTER_CHILD_STORES, "transferReceipts"], "readwrite");
  const receiptStore = tx.objectStore("transferReceipts");
  const receipt = await requestResult(receiptStore.get(receiptId));
  if (!receipt) throw new Error("Interchange receipt not found.");
  if (receipt.status === "rolled-back") throw new Error("This interchange import was already rolled back.");
  const matterIds = new Set(receipt.createdIds?.matters || []);
  for (const matterId of matterIds) {
    for (const storeName of MATTER_CHILD_STORES) {
      const store = tx.objectStore(storeName);
      const keys = await requestResult(store.index("matterId").getAllKeys(matterId));
      for (const key of keys) store.delete(key);
    }
    tx.objectStore("matters").delete(matterId);
  }
  for (const workspaceId of receipt.createdIds?.workspaces || []) {
    const workspaceMatterKeys = await requestResult(tx.objectStore("matters").index("workspaceId").getAllKeys(workspaceId));
    if (workspaceMatterKeys.every((id) => matterIds.has(id))) tx.objectStore("workspaces").delete(workspaceId);
  }
  receiptStore.put({ ...receipt, status: "rolled-back", rolledBackAt: nowIso(), updatedAt: nowIso(), revision: Number(receipt.revision || 0) + 1 });
  await transactionDone(tx);
  return { ...receipt, status: "rolled-back" };
}

function validBase(row) {
  return row && typeof row.id === "string" && row.id.length > 0;
}

function validRecord(name, row) {
  if (!validBase(row)) return false;
  if (name === "workspaces") return typeof row.name === "string";
  if (name === "matters") return typeof row.workspaceId === "string" && typeof row.title === "string" && typeof row.type === "string";
  if (name === "migrationReceipts") return typeof row.sourceFingerprint === "string";
  if (name === "transferReceipts") return typeof row.idempotencyKey === "string" && ["applied", "rolled-back"].includes(row.status);
  if (MATTER_CHILD_STORES.includes(name)) return typeof row.matterId === "string";
  return true;
}

export async function repairIntegrity() {
  const rowsByStore = Object.fromEntries(await Promise.all(STORE_NAMES.map(async (name) => [name, await getAll(name)])));
  const workspaceIds = new Set(rowsByStore.workspaces.filter((row) => validRecord("workspaces", row)).map((row) => row.id));
  const matterIds = new Set(
    rowsByStore.matters
      .filter((row) => validRecord("matters", row) && workspaceIds.has(row.workspaceId))
      .map((row) => row.id)
  );
  const removals = [];
  for (const [name, rows] of Object.entries(rowsByStore)) {
    const seenSingleton = new Set();
    for (const row of rows) {
      let valid = validRecord(name, row);
      if (name === "matters") valid &&= workspaceIds.has(row.workspaceId);
      if (MATTER_CHILD_STORES.includes(name)) valid &&= matterIds.has(row.matterId);
      if (name === "decisionBriefs" && valid) {
        if (seenSingleton.has(row.matterId)) valid = false;
        seenSingleton.add(row.matterId);
      }
      if (!valid) removals.push([name, row?.id]);
    }
  }
  for (const [name, id] of removals) if (id) await remove(name, id);
  return removals.length;
}

export async function ensureDefaultWorkspace() {
  const workspaces = await getAll("workspaces");
  if (workspaces.length) return workspaces[0];
  return put("workspaces", { ...baseRecord("ws"), name: "My Workspace", owner: "Local owner", settings: { defaultVisibility: "private" } });
}

export function closeDatabase() {
  if (!databasePromise) return;
  databasePromise.then((db) => db.close()).catch(() => {});
  databasePromise = undefined;
}

export async function deleteCommonGroundDatabase() {
  closeDatabase();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Unable to delete CommonGround storage."));
    request.onblocked = () => reject(new Error("Close other CommonGround tabs before resetting."));
  });
}
