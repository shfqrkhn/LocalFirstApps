import { SCHEMA_VERSION, baseRecord, getByIndex, nowIso, uid, writeGraphAtomic } from "./db.js";
import { requestResult as coreRequestResult, sha256, transactionDone as coreTransactionDone } from "./omnicore-adapter.js";

const LEGACY_DB_NAME = "ledger-suite";
const LEGACY_MAX_BYTES = 5 * 1024 * 1024;
const LEGACY_STORES = [
  "meta",
  "workspaces",
  "cases",
  "evidenceItems",
  "assumptions",
  "optionSets",
  "reviewMatrices",
  "decisionRecords",
  "outcomeReviews",
  "governanceReviews",
  "packHooks",
  "recoveryLogs"
];

function requestResult(request) {
  return coreRequestResult(request, "Legacy storage read failed.");
}

function transactionDone(transaction) {
  return coreTransactionDone(transaction, {
    failureMessage: "Legacy storage transaction failed.",
    abortMessage: "Legacy storage transaction aborted."
  });
}

async function legacyDatabaseExists() {
  if (!indexedDB.databases) return false;
  const databases = await indexedDB.databases();
  return databases.some((database) => database.name === LEGACY_DB_NAME);
}

async function readLegacyDatabase() {
  if (!(await legacyDatabaseExists())) return null;
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open legacy LedgerSuite storage."));
  });
  try {
    const available = LEGACY_STORES.filter((name) => db.objectStoreNames.contains(name));
    const tx = db.transaction(available, "readonly");
    const entities = {};
    for (const name of LEGACY_STORES) {
      entities[name] = available.includes(name) ? await requestResult(tx.objectStore(name).getAll()) : [];
    }
    await transactionDone(tx);
    return { schemaVersion: 1, appVersion: "legacy-db", entities, source: "indexeddb" };
  } finally {
    db.close();
  }
}

export async function exportLegacyDatabaseSnapshot() {
  const snapshot = await readLegacyDatabase();
  if (!snapshot) throw new Error("No same-origin LedgerSuite database is available.");
  return snapshot;
}

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

export function validateLegacySnapshot(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== "object") return { valid: false, errors: ["Top-level value must be an object."] };
  if (![1, 2].includes(Number(snapshot.schemaVersion))) errors.push("LedgerSuite schemaVersion must be 1 or 2.");
  if (!snapshot.entities || typeof snapshot.entities !== "object") errors.push("LedgerSuite entities are missing.");
  const entities = snapshot.entities || {};
  for (const name of LEGACY_STORES) {
    if (entities[name] !== undefined && !Array.isArray(entities[name])) errors.push(`${name} must be an array.`);
  }
  const workspaceIds = new Set(array(entities.workspaces).filter((row) => row && typeof row.id === "string" && typeof row.name === "string").map((row) => row.id));
  const cases = array(entities.cases).filter((row) => row && typeof row.id === "string" && typeof row.workspaceId === "string" && typeof row.title === "string");
  const caseIds = new Set(cases.map((row) => row.id));
  if (workspaceIds.size !== array(entities.workspaces).length) errors.push("A workspace record is malformed or duplicated.");
  if (caseIds.size !== array(entities.cases).length) errors.push("A case record is malformed or duplicated.");
  if (cases.some((row) => !workspaceIds.has(row.workspaceId))) errors.push("A case references a missing workspace.");
  for (const name of ["evidenceItems", "assumptions", "optionSets", "reviewMatrices", "decisionRecords", "outcomeReviews", "governanceReviews", "packHooks"]) {
    if (array(entities[name]).some((row) => !row || typeof row.id !== "string" || !caseIds.has(row.caseId))) {
      errors.push(`${name} contains a malformed or orphaned record.`);
    }
  }
  if (array(entities.recoveryLogs).some((row) => !row || typeof row.id !== "string" || typeof row.message !== "string")) {
    errors.push("recoveryLogs contains a malformed record.");
  }
  if (Number(snapshot.schemaVersion) === 2) {
    const expected = snapshot.integrity?.value;
    const payload = { schemaVersion: snapshot.schemaVersion, appVersion: snapshot.appVersion, entities: snapshot.entities };
    if (!expected || fnv1a32(JSON.stringify(payload)) !== expected) errors.push("LedgerSuite integrity checksum is missing or invalid.");
  }
  return { valid: errors.length === 0, errors };
}

function extractStoredZip(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 30 || view.getUint32(0, true) !== 0x04034b50) throw new Error("ZIP does not contain a readable local file header.");
  const flags = view.getUint16(6, true);
  const method = view.getUint16(8, true);
  if ((flags & 0x9) !== 0 || method !== 0) throw new Error("Only LedgerSuite stored ZIP snapshots are supported.");
  const expectedCrc = view.getUint32(14, true);
  const compressedSize = view.getUint32(18, true);
  const nameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  const start = 30 + nameLength + extraLength;
  if (start + compressedSize > view.byteLength) throw new Error("ZIP snapshot is truncated.");
  const bytes = new Uint8Array(buffer, start, compressedSize);
  if (crc32(bytes) !== expectedCrc) throw new Error("LedgerSuite ZIP snapshot checksum failed.");
  return new TextDecoder().decode(bytes);
}

export async function parseLegacyFile(file) {
  if (!file || file.size > LEGACY_MAX_BYTES) throw new Error("LedgerSuite imports must not exceed 5 MB.");
  const lowerName = String(file.name || "").toLowerCase();
  const text = lowerName.endsWith(".zip") ? extractStoredZip(await file.arrayBuffer()) : await file.text();
  let snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch {
    throw new Error("LedgerSuite import is not valid JSON.");
  }
  const validation = validateLegacySnapshot(snapshot);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return snapshot;
}

function normalizeDate(value, fallback) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function itemData(kind, row) {
  if (kind === "evidence") return { kind: row.kind || "Evidence", citation: row.citation, notes: row.notes || "" };
  if (kind === "assumption") return { statement: row.statement, confidence: Number(row.confidence || 0), owner: row.owner || "local" };
  if (kind === "option") return { name: row.name, score: Number(row.score || 0), tradeoff: row.tradeoff || "" };
  return { hookType: row.hookType, contractNote: row.contractNote || "", status: row.status || "ready" };
}

export async function prepareLegacyMigration(snapshot, source = "file") {
  const validation = validateLegacySnapshot(snapshot);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  const entities = snapshot.entities;
  const fingerprint = await sha256({ source: LEGACY_DB_NAME, schemaVersion: snapshot.schemaVersion, entities });
  const prior = await getByIndex("migrationReceipts", "sourceFingerprint", fingerprint);
  const counts = Object.fromEntries(LEGACY_STORES.map((name) => [name, array(entities[name]).length]));
  return { snapshot, source, fingerprint, counts, alreadyMigrated: prior.length > 0 };
}

export async function detectLegacyMigration() {
  const snapshot = await readLegacyDatabase();
  return snapshot ? prepareLegacyMigration(snapshot, "indexeddb") : null;
}

export async function commitLegacyMigration(prepared) {
  if (!prepared || prepared.alreadyMigrated) throw new Error("This LedgerSuite source was already migrated.");
  const { entities } = prepared.snapshot;
  const workspaceMap = new Map();
  const matterMap = new Map();
  const workspaces = array(entities.workspaces).map((row) => {
    const id = uid("ws");
    workspaceMap.set(row.id, id);
    return {
      ...baseRecord("unused"),
      id,
      name: row.name,
      owner: row.owner || "Local owner",
      settings: row.settings || { defaultVisibility: "private" },
      createdAt: normalizeDate(row.createdAt, nowIso()),
      updatedAt: normalizeDate(row.updatedAt, nowIso())
    };
  });
  const matters = array(entities.cases).map((row) => {
    const id = uid("matter");
    matterMap.set(row.id, id);
    return {
      ...baseRecord("unused"),
      id,
      workspaceId: workspaceMap.get(row.workspaceId),
      title: row.title,
      type: "decision-analysis",
      status: ["draft", "active", "closed"].includes(row.status) ? row.status : "draft",
      suitabilityState: "not-applicable",
      currentPhase: "decision-framing",
      createdAt: normalizeDate(row.createdAt, nowIso()),
      updatedAt: normalizeDate(row.updatedAt, nowIso())
    };
  });
  const byCase = (name, caseId) => array(entities[name]).filter((row) => row.caseId === caseId);
  const decisionBriefs = [];
  const decisionItems = [];
  for (const row of array(entities.cases)) {
    const matterId = matterMap.get(row.id);
    const matrix = byCase("reviewMatrices", row.id)[0] || {};
    const decision = byCase("decisionRecords", row.id)[0] || {};
    const outcome = byCase("outcomeReviews", row.id)[0] || {};
    const governance = byCase("governanceReviews", row.id)[0] || {};
    decisionBriefs.push({
      ...baseRecord("brief"),
      matterId,
      memo: {
        title: row.title,
        context: "shared",
        question: row.question || "",
        evidenceSummary: row.evidenceSummary || "",
        assumptionSummary: row.assumptionSummary || "",
        choice: row.choice || decision.choice || "",
        rationale: row.rationale || decision.rationale || ""
      },
      matrix: { dimensions: matrix.dimensions || "", notes: matrix.notes || "" },
      decision: { choice: decision.choice || row.choice || "", rationale: decision.rationale || row.rationale || "", date: decision.date || "" },
      governance: { accountability: governance.accountability || "", compliance: governance.compliance || "", riskNote: governance.riskNote || "" },
      outcome: { expectedVsActual: outcome.expectedVsActual || "", lessons: outcome.lessons || "" },
      updatedAt: normalizeDate(row.updatedAt, nowIso())
    });
    for (const [storeName, kind] of [["evidenceItems", "evidence"], ["assumptions", "assumption"], ["optionSets", "option"], ["packHooks", "pack-hook"]]) {
      for (const item of byCase(storeName, row.id)) {
        decisionItems.push({
          ...baseRecord("decision-item"),
          matterId,
          kind,
          data: itemData(kind, item),
          createdAt: normalizeDate(item.createdAt, nowIso()),
          updatedAt: normalizeDate(item.updatedAt || item.createdAt, nowIso())
        });
      }
    }
  }
  const receipt = {
    ...baseRecord("migration"),
    source: prepared.source,
    sourceDatabase: LEGACY_DB_NAME,
    sourceFingerprint: prepared.fingerprint,
    migratedAt: nowIso(),
    counts: prepared.counts,
    workspaceMap: Object.fromEntries(workspaceMap),
    matterMap: Object.fromEntries(matterMap)
  };
  await writeGraphAtomic({
    workspaces,
    matters,
    children: { decisionBriefs, decisionItems },
    receipts: [receipt]
  });
  return { workspaces: workspaces.length, matters: matters.length, items: decisionItems.length, fingerprint: prepared.fingerprint };
}

export async function deleteLegacyDatabase() {
  if (!(await legacyDatabaseExists())) return;
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Unable to delete legacy LedgerSuite storage."));
    request.onblocked = () => reject(new Error("Close old LedgerSuite tabs before deleting legacy storage."));
  });
}
