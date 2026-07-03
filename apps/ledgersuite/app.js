const VERSION = "0.1.46";
const DB_NAME = "ledger-suite";
const DB_VERSION = 3;
const SCHEMA_VERSION = 2;
const SUPPORTED_IMPORT_SCHEMAS = [1, 2];
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const STORE_NAMES = [
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

const ENTITY_STORES = STORE_NAMES.filter((name) => name !== "recoveryLogs");

const appState = {
  db: null,
  selectedWorkspaceId: "",
  selectedCaseId: "",
  pendingImport: null,
  swRegistration: null,
  reloadingForUpdate: false
};

const elements = {
  status: document.getElementById("status"),
  version: document.getElementById("app-version"),
  workspaceSelect: document.getElementById("workspace-select"),
  caseSelect: document.getElementById("case-select"),
  newWorkspaceBtn: document.getElementById("new-workspace-btn"),
  newCaseBtn: document.getElementById("new-case-btn"),
  memoForm: document.getElementById("memo-form"),
  evidenceForm: document.getElementById("evidence-form"),
  assumptionForm: document.getElementById("assumption-form"),
  optionForm: document.getElementById("option-form"),
  matrixForm: document.getElementById("matrix-form"),
  outcomeForm: document.getElementById("outcome-form"),
  governanceForm: document.getElementById("governance-form"),
  packHookForm: document.getElementById("pack-hook-form"),
  evidenceList: document.getElementById("evidence-list"),
  assumptionList: document.getElementById("assumption-list"),
  optionList: document.getElementById("option-list"),
  packHookList: document.getElementById("pack-hook-list"),
  exportJsonBtn: document.getElementById("export-json-btn"),
  exportZipBtn: document.getElementById("export-zip-btn"),
  exportMdBtn: document.getElementById("export-md-btn"),
  printBriefBtn: document.getElementById("print-brief-btn"),
  importFile: document.getElementById("import-file"),
  commitImportBtn: document.getElementById("commit-import-btn"),
  importPreview: document.getElementById("import-preview"),
  opfsStatus: document.getElementById("opfs-status"),
  storageHealth: document.getElementById("storage-health"),
  runRepairBtn: document.getElementById("run-repair-btn"),
  resetLocalBtn: document.getElementById("reset-local-btn"),
  clearCacheBtn: document.getElementById("clear-cache-btn"),
  runRcCheckBtn: document.getElementById("run-rc-check-btn"),
  applyUpdateBtn: document.getElementById("apply-update-btn"),
  rcCheckOutput: document.getElementById("rc-check-output"),
  printBrief: document.getElementById("print-brief")
};

if (elements.version) {
  elements.version.textContent = `v${VERSION}`;
}

const validators = {
  meta: (row) => row && typeof row.key === "string",
  workspaces: (row) => row && typeof row.id === "string" && typeof row.name === "string",
  cases: (row) => row && typeof row.id === "string" && typeof row.workspaceId === "string" && typeof row.title === "string",
  evidenceItems: (row) => row && typeof row.id === "string" && typeof row.caseId === "string" && typeof row.citation === "string",
  assumptions: (row) => row && typeof row.id === "string" && typeof row.caseId === "string" && typeof row.statement === "string",
  optionSets: (row) => row && typeof row.id === "string" && typeof row.caseId === "string" && typeof row.name === "string",
  reviewMatrices: (row) => row && typeof row.id === "string" && typeof row.caseId === "string",
  decisionRecords: (row) => row && typeof row.id === "string" && typeof row.caseId === "string",
  outcomeReviews: (row) => row && typeof row.id === "string" && typeof row.caseId === "string",
  governanceReviews: (row) => row && typeof row.id === "string" && typeof row.caseId === "string",
  packHooks: (row) => row && typeof row.id === "string" && typeof row.caseId === "string" && typeof row.hookType === "string",
  recoveryLogs: (row) => row && typeof row.id === "string" && typeof row.message === "string"
};

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function sanitizeText(value, maxLength) {
  const compact = String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return compact.trim().slice(0, maxLength);
}

function utf8ByteLength(text) {
  return new TextEncoder().encode(String(text || "")).length;
}

function announce(message) {
  elements.status.textContent = message;
}

function setRcOutput(text) {
  elements.rcCheckOutput.textContent = text;
}

function resetImportFileInput() {
  if (elements.importFile) {
    elements.importFile.value = "";
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("workspaces")) {
        db.createObjectStore("workspaces", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cases")) {
        const store = db.createObjectStore("cases", { keyPath: "id" });
        store.createIndex("workspaceId", "workspaceId", { unique: false });
      }
      if (!db.objectStoreNames.contains("evidenceItems")) {
        const store = db.createObjectStore("evidenceItems", { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: false });
      }
      if (!db.objectStoreNames.contains("assumptions")) {
        const store = db.createObjectStore("assumptions", { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: false });
      }
      if (!db.objectStoreNames.contains("optionSets")) {
        const store = db.createObjectStore("optionSets", { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: false });
      }
      if (!db.objectStoreNames.contains("reviewMatrices")) {
        const store = db.createObjectStore("reviewMatrices", { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: true });
      }
      if (!db.objectStoreNames.contains("decisionRecords")) {
        const store = db.createObjectStore("decisionRecords", { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: true });
      }
      if (!db.objectStoreNames.contains("outcomeReviews")) {
        const store = db.createObjectStore("outcomeReviews", { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: true });
      }
      if (!db.objectStoreNames.contains("governanceReviews")) {
        const store = db.createObjectStore("governanceReviews", { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: true });
      }
      if (!db.objectStoreNames.contains("packHooks")) {
        const store = db.createObjectStore("packHooks", { keyPath: "id" });
        store.createIndex("caseId", "caseId", { unique: false });
        store.createIndex("caseIdHookType", ["caseId", "hookType"], { unique: false });
      } else {
        const store = req.transaction.objectStore("packHooks");
        if (!store.indexNames.contains("caseIdHookType")) {
          store.createIndex("caseIdHookType", ["caseId", "hookType"], { unique: false });
        }
      }
      if (!db.objectStoreNames.contains("recoveryLogs")) {
        const store = db.createObjectStore("recoveryLogs", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("transaction aborted"));
  });
}

function requestValue(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(storeName, record) {
  const tx = appState.db.transaction([storeName], "readwrite");
  tx.objectStore(storeName).put(record);
  await txDone(tx);
}

async function clearStore(storeName) {
  const tx = appState.db.transaction([storeName], "readwrite");
  tx.objectStore(storeName).clear();
  await txDone(tx);
}

async function deleteRecord(storeName, key) {
  const tx = appState.db.transaction([storeName], "readwrite");
  tx.objectStore(storeName).delete(key);
  await txDone(tx);
}

async function getRecord(storeName, key) {
  const tx = appState.db.transaction([storeName], "readonly");
  const result = await requestValue(tx.objectStore(storeName).get(key));
  await txDone(tx);
  return result || null;
}

async function getAll(storeName) {
  const tx = appState.db.transaction([storeName], "readonly");
  const result = await requestValue(tx.objectStore(storeName).getAll());
  await txDone(tx);
  return result || [];
}

async function getByIndex(storeName, indexName, key) {
  const tx = appState.db.transaction([storeName], "readonly");
  const result = await requestValue(tx.objectStore(storeName).index(indexName).getAll(key));
  await txDone(tx);
  return result || [];
}

async function getPackHooksByCaseAndType(caseId, hookType) {
  try {
    return await getByIndex("packHooks", "caseIdHookType", [caseId, hookType]);
  } catch {
    const rows = await getByIndex("packHooks", "caseId", caseId);
    return rows.filter((row) => row.hookType === hookType);
  }
}

async function logRecovery(message, details) {
  await putRecord("recoveryLogs", {
    id: uid("recovery"),
    message,
    details: sanitizeText(details || "", 1200),
    createdAt: nowIso()
  });
}
async function ensureMetaAndMigrate() {
  const meta = await getRecord("meta", "schema");
  if (!meta) {
    await putRecord("meta", {
      key: "schema",
      schemaVersion: SCHEMA_VERSION,
      appVersion: VERSION,
      updatedAt: nowIso()
    });
    return;
  }

  if (Number(meta.schemaVersion) < SCHEMA_VERSION) {
    await putRecord("meta", {
      ...meta,
      schemaVersion: SCHEMA_VERSION,
      appVersion: VERSION,
      updatedAt: nowIso()
    });
    await logRecovery("schema-migrated", `Migrated schema from ${meta.schemaVersion} to ${SCHEMA_VERSION}.`);
  }
}

async function ensureDefaultData() {
  const workspaces = await getAll("workspaces");
  if (workspaces.length > 0) {
    return;
  }

  const ws = {
    id: uid("ws"),
    name: "Default Workspace",
    settings: {},
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await putRecord("workspaces", ws);

  const caseFile = {
    id: uid("case"),
    workspaceId: ws.id,
    title: "Initial Decision Memo",
    type: "decision-memo",
    status: "draft",
    owner: "local",
    question: "",
    evidenceSummary: "",
    assumptionSummary: "",
    choice: "",
    rationale: "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await putRecord("cases", caseFile);
}

async function scanStoreAndRepair(storeName) {
  const rows = await getAll(storeName);
  const validator = validators[storeName];
  let removed = 0;
  for (const row of rows) {
    if (!validator(row)) {
      const key = row?.id || row?.key;
      if (key) {
        await deleteRecord(storeName, key);
        removed += 1;
      }
    }
  }
  return removed;
}

async function runIntegrityRepair() {
  let removedTotal = 0;
  for (const storeName of ENTITY_STORES) {
    removedTotal += await scanStoreAndRepair(storeName);
  }

  const workspaces = await getAll("workspaces");
  const workspaceIds = new Set(workspaces.map((row) => row.id));
  const cases = await getAll("cases");

  for (const row of cases) {
    if (!workspaceIds.has(row.workspaceId)) {
      await deleteRecord("cases", row.id);
      removedTotal += 1;
    }
  }

  const repairedCases = await getAll("cases");
  const caseIds = new Set(repairedCases.map((row) => row.id));

  for (const storeName of ["evidenceItems", "assumptions", "optionSets", "reviewMatrices", "decisionRecords", "outcomeReviews", "governanceReviews", "packHooks"]) {
    const rows = await getAll(storeName);
    for (const row of rows) {
      if (!caseIds.has(row.caseId)) {
        await deleteRecord(storeName, row.id);
        removedTotal += 1;
      }
    }
  }

  for (const singletonStore of ["reviewMatrices", "decisionRecords", "outcomeReviews", "governanceReviews"]) {
    const rows = await getAll(singletonStore);
    const groups = new Map();
    for (const row of rows) {
      const list = groups.get(row.caseId) || [];
      list.push(row);
      groups.set(row.caseId, list);
    }
    for (const list of groups.values()) {
      if (list.length < 2) {
        continue;
      }
      list.sort(
        (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || String(a.id).localeCompare(String(b.id))
      );
      for (let i = 1; i < list.length; i += 1) {
        await deleteRecord(singletonStore, list[i].id);
        removedTotal += 1;
      }
    }
  }

  const hooks = await getAll("packHooks");
  const groups = new Map();
  for (const row of hooks) {
    const key = `${row.caseId}::${row.hookType}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    if (list.length < 2) {
      continue;
    }
    list.sort(
      (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || String(a.id).localeCompare(String(b.id))
    );
    for (let i = 1; i < list.length; i += 1) {
      await deleteRecord("packHooks", list[i].id);
      removedTotal += 1;
    }
  }

  if (removedTotal > 0) {
    await logRecovery("integrity-repair", `Removed ${removedTotal} invalid records.`);
  }
  return removedTotal;
}

function setSelectOptions(select, rows, labelKey) {
  select.replaceChildren();
  for (const row of rows) {
    const opt = document.createElement("option");
    opt.value = row.id;
    opt.textContent = sanitizeText(row[labelKey] || "", 120) || "Untitled";
    select.appendChild(opt);
  }
}

function getMemoPayload() {
  const fd = new FormData(elements.memoForm);
  return {
    title: sanitizeText(fd.get("title"), 120),
    question: sanitizeText(fd.get("question"), 500),
    evidenceSummary: sanitizeText(fd.get("evidenceSummary"), 1200),
    assumptionSummary: sanitizeText(fd.get("assumptionSummary"), 1200),
    choice: sanitizeText(fd.get("choice"), 800),
    rationale: sanitizeText(fd.get("rationale"), 1200)
  };
}

function renderList(listEl, items, toLine) {
  listEl.replaceChildren();
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = toLine(item);
    listEl.appendChild(li);
  }
}

function sortRowsById(rows) {
  return [...(rows || [])].sort((a, b) => String(a?.id || "").localeCompare(String(b?.id || "")));
}

function applyMemo(caseFile, matrix, outcome, governance) {
  const f = elements.memoForm.elements;
  f.title.value = caseFile?.title || "";
  f.question.value = caseFile?.question || "";
  f.evidenceSummary.value = caseFile?.evidenceSummary || "";
  f.assumptionSummary.value = caseFile?.assumptionSummary || "";
  f.choice.value = caseFile?.choice || "";
  f.rationale.value = caseFile?.rationale || "";

  const mf = elements.matrixForm.elements;
  mf.dimensions.value = matrix?.dimensions || "";
  mf.notes.value = matrix?.notes || "";

  const of = elements.outcomeForm.elements;
  of.expectedVsActual.value = outcome?.expectedVsActual || "";
  of.lessons.value = outcome?.lessons || "";

  const gf = elements.governanceForm.elements;
  gf.accountability.value = governance?.accountability || "";
  gf.compliance.value = governance?.compliance || "";
  gf.riskNote.value = governance?.riskNote || "";
}

async function loadWorkspaces() {
  const workspaces = (await getAll("workspaces")).sort((a, b) => a.name.localeCompare(b.name));
  setSelectOptions(elements.workspaceSelect, workspaces, "name");
  if (!appState.selectedWorkspaceId || !workspaces.find((row) => row.id === appState.selectedWorkspaceId)) {
    appState.selectedWorkspaceId = workspaces[0]?.id || "";
  }
  elements.workspaceSelect.value = appState.selectedWorkspaceId;
}

async function loadCases() {
  const cases = (await getByIndex("cases", "workspaceId", appState.selectedWorkspaceId)).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  setSelectOptions(elements.caseSelect, cases, "title");
  if (!appState.selectedCaseId || !cases.find((row) => row.id === appState.selectedCaseId)) {
    appState.selectedCaseId = cases[0]?.id || "";
  }
  elements.caseSelect.value = appState.selectedCaseId;
}

async function getCurrentCaseBundle() {
  if (!appState.selectedCaseId) {
    return null;
  }

  const [caseFile, evidenceRows, assumptionRows, optionRows, matrixRows, decisionRows, outcomeRows, governanceRows, packHookRows] =
    await Promise.all([
      getRecord("cases", appState.selectedCaseId),
      getByIndex("evidenceItems", "caseId", appState.selectedCaseId),
      getByIndex("assumptions", "caseId", appState.selectedCaseId),
      getByIndex("optionSets", "caseId", appState.selectedCaseId),
      getByIndex("reviewMatrices", "caseId", appState.selectedCaseId),
      getByIndex("decisionRecords", "caseId", appState.selectedCaseId),
      getByIndex("outcomeReviews", "caseId", appState.selectedCaseId),
      getByIndex("governanceReviews", "caseId", appState.selectedCaseId),
      getByIndex("packHooks", "caseId", appState.selectedCaseId)
    ]);

  const evidence = sortRowsById(evidenceRows);
  const assumptions = sortRowsById(assumptionRows);
  const options = sortRowsById(optionRows);
  const matrix = matrixRows[0] || null;
  const decision = decisionRows[0] || null;
  const outcome = outcomeRows[0] || null;
  const governance = governanceRows[0] || null;
  const packHooks = sortRowsById(packHookRows);

  return { caseFile, evidence, assumptions, options, matrix, decision, outcome, governance, packHooks };
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createTextNode(text) {
  return document.createTextNode(text || "(not set)");
}

function createElementWithText(tag, text) {
  const el = document.createElement(tag);
  el.appendChild(createTextNode(text));
  return el;
}

function createHtmlList(items, formatFn) {
  const ul = document.createElement("ul");
  if (!items || items.length === 0) {
    ul.appendChild(createElementWithText("li", "(none)"));
    return ul;
  }
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = formatFn(item);
    ul.appendChild(li);
  }
  return ul;
}

function renderPrintableBrief(bundle) {
  elements.printBrief.replaceChildren();

  if (!bundle || !bundle.caseFile) {
    elements.printBrief.appendChild(createElementWithText("h2", "No case selected"));
    return;
  }

  const container = document.createDocumentFragment();

  container.appendChild(createElementWithText("h2", bundle.caseFile.title || "(not set)"));
  container.appendChild(createElementWithText("h3", "Core Question"));
  container.appendChild(createElementWithText("p", bundle.caseFile.question));
  container.appendChild(createElementWithText("h3", "Evidence Summary"));
  container.appendChild(createElementWithText("p", bundle.caseFile.evidenceSummary));
  container.appendChild(createElementWithText("h3", "Assumption Summary"));
  container.appendChild(createElementWithText("p", bundle.caseFile.assumptionSummary));

  container.appendChild(createElementWithText("h3", "Decision"));
  const pChoice = document.createElement("p");
  const sChoice = document.createElement("strong");
  sChoice.textContent = "Choice: ";
  pChoice.appendChild(sChoice);
  pChoice.appendChild(createTextNode(bundle.decision?.choice || bundle.caseFile.choice));
  container.appendChild(pChoice);

  const pRationale = document.createElement("p");
  const sRationale = document.createElement("strong");
  sRationale.textContent = "Rationale: ";
  pRationale.appendChild(sRationale);
  pRationale.appendChild(createTextNode(bundle.decision?.rationale || bundle.caseFile.rationale));
  container.appendChild(pRationale);

  container.appendChild(createElementWithText("h3", "Evidence Items"));
  container.appendChild(createHtmlList(bundle.evidence, (row) => `${row.kind}: ${row.citation}`));

  container.appendChild(createElementWithText("h3", "Assumptions"));
  container.appendChild(createHtmlList(bundle.assumptions, (row) => `${row.statement} (${row.confidence}%)`));

  container.appendChild(createElementWithText("h3", "Option Set"));
  container.appendChild(createHtmlList(bundle.options, (row) => `${row.name} [${row.score}/10] ${row.tradeoff}`));

  container.appendChild(createElementWithText("h3", "Outcome Review"));
  const pExp = document.createElement("p");
  const sExp = document.createElement("strong");
  sExp.textContent = "Expected vs Actual: ";
  pExp.appendChild(sExp);
  pExp.appendChild(createTextNode(bundle.outcome?.expectedVsActual));
  container.appendChild(pExp);

  const pLess = document.createElement("p");
  const sLess = document.createElement("strong");
  sLess.textContent = "Lessons: ";
  pLess.appendChild(sLess);
  pLess.appendChild(createTextNode(bundle.outcome?.lessons));
  container.appendChild(pLess);

  container.appendChild(createElementWithText("h3", "Governance Review"));
  const pAcc = document.createElement("p");
  const sAcc = document.createElement("strong");
  sAcc.textContent = "Accountability: ";
  pAcc.appendChild(sAcc);
  pAcc.appendChild(createTextNode(bundle.governance?.accountability));
  container.appendChild(pAcc);

  const pComp = document.createElement("p");
  const sComp = document.createElement("strong");
  sComp.textContent = "Compliance: ";
  pComp.appendChild(sComp);
  pComp.appendChild(createTextNode(bundle.governance?.compliance));
  container.appendChild(pComp);

  const pRisk = document.createElement("p");
  const sRisk = document.createElement("strong");
  sRisk.textContent = "Risk Note: ";
  pRisk.appendChild(sRisk);
  pRisk.appendChild(createTextNode(bundle.governance?.riskNote));
  container.appendChild(pRisk);

  container.appendChild(createElementWithText("h3", "Pack Hooks"));
  container.appendChild(createHtmlList(bundle.packHooks, (row) => `${row.hookType}: ${row.contractNote || ""} (${row.status || "ready"})`));

  elements.printBrief.appendChild(container);
}

async function loadCurrentCase() {
  const bundle = await getCurrentCaseBundle();
  if (!bundle || !bundle.caseFile) {
    return;
  }

  applyMemo(bundle.caseFile, bundle.matrix, bundle.outcome, bundle.governance);
  renderList(elements.evidenceList, bundle.evidence, (row) => `${row.kind}: ${row.citation}`);
  renderList(elements.assumptionList, bundle.assumptions, (row) => `${row.statement} (${row.confidence}%)`);
  renderList(elements.optionList, bundle.options, (row) => `${row.name} [${row.score}/10] ${row.tradeoff}`);
  renderList(elements.packHookList, bundle.packHooks || [], (row) => `${row.hookType}: ${row.contractNote || ""} (${row.status || "ready"})`);
  renderPrintableBrief(bundle);
}

function sortedRows(rows, key = "id") {
  return [...rows].sort((a, b) => String(a[key] || "").localeCompare(String(b[key] || "")));
}

function computeChecksum(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function buildIntegrityPayload(data) {
  return {
    schemaVersion: data.schemaVersion,
    appVersion: data.appVersion,
    entities: data.entities
  };
}

async function snapshot(includeVolatile = true) {
  const [meta, workspaces, cases, evidenceItems, assumptions, optionSets, reviewMatrices, decisionRecords, outcomeReviews, governanceReviews, packHooks] =
    await Promise.all([
      getAll("meta"),
      getAll("workspaces"),
      getAll("cases"),
      getAll("evidenceItems"),
      getAll("assumptions"),
      getAll("optionSets"),
      getAll("reviewMatrices"),
      getAll("decisionRecords"),
      getAll("outcomeReviews"),
      getAll("governanceReviews"),
      getAll("packHooks")
    ]);

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    appVersion: VERSION,
    entities: {
      meta: sortedRows(meta, "key"),
      workspaces: sortedRows(workspaces),
      cases: sortedRows(cases),
      evidenceItems: sortedRows(evidenceItems),
      assumptions: sortedRows(assumptions),
      optionSets: sortedRows(optionSets),
      reviewMatrices: sortedRows(reviewMatrices),
      decisionRecords: sortedRows(decisionRecords),
      outcomeReviews: sortedRows(outcomeReviews),
      governanceReviews: sortedRows(governanceReviews),
      packHooks: sortedRows(packHooks),
      recoveryLogs: []
    }
  };

  payload.integrity = {
    algorithm: "fnv1a-32",
    value: computeChecksum(JSON.stringify(buildIntegrityPayload(payload)))
  };

  if (includeVolatile) {
    payload.exportedAt = nowIso();
  }

  return payload;
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipSingleFile(fileName, content) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(fileName);
  const contentBytes = encoder.encode(content);
  const crc = crc32(contentBytes);

  const localHeader = new Uint8Array(30 + nameBytes.length);
  const localView = new DataView(localHeader.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(6, 0, true);
  localView.setUint16(8, 0, true);
  localView.setUint16(10, 0, true);
  localView.setUint16(12, 0, true);
  localView.setUint32(14, crc, true);
  localView.setUint32(18, contentBytes.length, true);
  localView.setUint32(22, contentBytes.length, true);
  localView.setUint16(26, nameBytes.length, true);
  localView.setUint16(28, 0, true);
  localHeader.set(nameBytes, 30);

  const centralHeader = new Uint8Array(46 + nameBytes.length);
  const centralView = new DataView(centralHeader.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(8, 0, true);
  centralView.setUint16(10, 0, true);
  centralView.setUint16(12, 0, true);
  centralView.setUint16(14, 0, true);
  centralView.setUint32(16, crc, true);
  centralView.setUint32(20, contentBytes.length, true);
  centralView.setUint32(24, contentBytes.length, true);
  centralView.setUint16(28, nameBytes.length, true);
  centralView.setUint16(30, 0, true);
  centralView.setUint16(32, 0, true);
  centralView.setUint16(34, 0, true);
  centralView.setUint16(36, 0, true);
  centralView.setUint32(38, 0, true);
  centralView.setUint32(42, 0, true);
  centralHeader.set(nameBytes, 46);

  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, 1, true);
  endView.setUint16(10, 1, true);
  endView.setUint32(12, centralHeader.length, true);
  endView.setUint32(16, localHeader.length + contentBytes.length, true);
  endView.setUint16(20, 0, true);

  return new Blob([localHeader, contentBytes, centralHeader, endHeader], { type: "application/zip" });
}

async function parseZipSnapshot(file) {
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_IMPORT_BYTES) {
    throw new Error("ZIP file exceeds import size limit.");
  }
  const view = new DataView(buffer);
  if (buffer.byteLength < 30) {
    throw new Error("Invalid ZIP payload.");
  }
  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error("Invalid ZIP signature.");
  }
  const flags = view.getUint16(6, true);
  if ((flags & 0x1) !== 0 || (flags & 0x8) !== 0) {
    throw new Error("Unsupported ZIP flags.");
  }
  const compressionMethod = view.getUint16(8, true);
  if (compressionMethod !== 0) {
    throw new Error("Unsupported ZIP compression method.");
  }
  const crc = view.getUint32(14, true);
  const compressedSize = view.getUint32(18, true);
  const uncompressedSize = view.getUint32(22, true);
  const fileNameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  if (compressedSize !== uncompressedSize) {
    throw new Error("ZIP size mismatch.");
  }
  const fileNameStart = 30;
  const fileNameEnd = fileNameStart + fileNameLength;
  if (fileNameEnd > buffer.byteLength) {
    throw new Error("ZIP header is truncated.");
  }
  const embeddedName = new TextDecoder().decode(new Uint8Array(buffer.slice(fileNameStart, fileNameEnd)));
  const normalizedName = embeddedName.toLowerCase().replace(/\u0000/g, "").trim();
  if (!normalizedName || normalizedName.includes("/") || normalizedName.includes("\\") || normalizedName.includes("..")) {
    throw new Error("ZIP entry name is unsafe.");
  }
  if (!normalizedName.endsWith(".json")) {
    throw new Error("ZIP does not contain a JSON payload.");
  }
  const start = 30 + fileNameLength + extraLength;
  const end = start + compressedSize;
  if (start > buffer.byteLength || end > buffer.byteLength) {
    throw new Error("ZIP file is truncated.");
  }
  const bytes = new Uint8Array(buffer.slice(start, end));
  if (crc32(bytes) !== crc) {
    throw new Error("ZIP CRC check failed.");
  }
  return new TextDecoder().decode(bytes);
}

async function saveArtifactToOpfs(fileName, content, mimeType) {
  if (!navigator.storage?.getDirectory) {
    elements.opfsStatus.textContent = "OPFS unavailable in this browser.";
    return;
  }
  try {
    const root = await navigator.storage.getDirectory();
    const exportDir = await root.getDirectoryHandle("ledger-suite-exports", { create: true });
    const fileHandle = await exportDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([content], { type: mimeType }));
    await writable.close();
    elements.opfsStatus.textContent = `Saved to OPFS: ${fileName}`;
  } catch {
    elements.opfsStatus.textContent = "Failed saving artifact to OPFS.";
  }
}

function normalizeImportData(rawData) {
  const schemaVersion = Number(rawData?.schemaVersion);
  if (!SUPPORTED_IMPORT_SCHEMAS.includes(schemaVersion)) {
    return { data: null, error: `Unsupported schemaVersion. Supported: ${SUPPORTED_IMPORT_SCHEMAS.join(", ")}.` };
  }

  if (schemaVersion === SCHEMA_VERSION) {
    if (!rawData.integrity) {
      return { data: null, error: "Schema v2 imports must include integrity metadata." };
    }
    return { data: rawData, error: "" };
  }

  if (schemaVersion === 1) {
    const migrated = {
      ...rawData,
      schemaVersion: SCHEMA_VERSION,
      appVersion: VERSION,
      entities: {
        ...rawData.entities,
        recoveryLogs: Array.isArray(rawData?.entities?.recoveryLogs) ? rawData.entities.recoveryLogs : []
      },
      integrity: rawData.integrity || null
    };
    return { data: migrated, error: "" };
  }

  return { data: null, error: "Unsupported import payload." };
}

function validateImportShape(data) {
  if (!data || typeof data !== "object") {
    return "Import must be a JSON object.";
  }
  if (Number(data.schemaVersion) !== SCHEMA_VERSION) {
    return `Import must be normalized to schemaVersion ${SCHEMA_VERSION}.`;
  }
  if (!data.entities || typeof data.entities !== "object") {
    return "Missing entities payload.";
  }
  for (const key of Object.keys(data.entities)) {
    if (!STORE_NAMES.includes(key)) {
      return `Import contains unsupported entity store: ${key}.`;
    }
  }

  for (const storeName of STORE_NAMES) {
    const rows = data.entities[storeName];
    if (!Array.isArray(rows)) {
      return `entities.${storeName} must be an array.`;
    }
    const validator = validators[storeName];
    for (const row of rows) {
      if (!validator(row)) {
        return `Invalid row found in ${storeName}.`;
      }
    }

    const keyField = storeName === "meta" ? "key" : "id";
    const seenKeys = new Set();
    for (const row of rows) {
      const keyValue = row?.[keyField];
      if (seenKeys.has(keyValue)) {
        return `Import contains duplicate ${keyField} entries in ${storeName}.`;
      }
      seenKeys.add(keyValue);
    }
  }

  const workspaceIds = new Set(data.entities.workspaces.map((row) => row.id));
  const caseIds = new Set(data.entities.cases.map((row) => row.id));

  for (const singletonStore of ["reviewMatrices", "decisionRecords", "outcomeReviews", "governanceReviews"]) {
    const seenCaseIds = new Set();
    for (const row of data.entities[singletonStore]) {
      if (seenCaseIds.has(row.caseId)) {
        return `Import contains duplicate ${singletonStore} entries for case ${row.caseId}.`;
      }
      seenCaseIds.add(row.caseId);
    }
  }

  for (const row of data.entities.cases) {
    if (!workspaceIds.has(row.workspaceId)) {
      return "Case references an unknown workspace.";
    }
  }

  for (const storeName of ["evidenceItems", "assumptions", "optionSets", "reviewMatrices", "decisionRecords", "outcomeReviews", "governanceReviews", "packHooks"]) {
    for (const row of data.entities[storeName]) {
      if (!caseIds.has(row.caseId)) {
        return `${storeName} references an unknown case.`;
      }
    }
  }

  if (data.integrity) {
    if (data.integrity.algorithm !== "fnv1a-32" || typeof data.integrity.value !== "string") {
      return "Invalid integrity metadata.";
    }
    const expected = computeChecksum(JSON.stringify(buildIntegrityPayload(data)));
    if (data.integrity.value !== expected) {
      return "Snapshot integrity check failed.";
    }
  }

  return "";
}

function previewImport(data) {
  const counts = STORE_NAMES.map((store) => `${store}: ${data.entities[store].length}`).join(" | ");
  elements.importPreview.textContent = `Import staged. ${counts}`;
}

async function refreshStorageHealth() {
  if (!navigator.storage || !navigator.storage.estimate) {
    elements.storageHealth.textContent = "Storage usage: not available in this browser.";
    return;
  }

  const estimate = await navigator.storage.estimate();
  const usedMb = ((estimate.usage || 0) / 1024 / 1024).toFixed(2);
  const quotaMb = ((estimate.quota || 0) / 1024 / 1024).toFixed(2);
  elements.storageHealth.textContent = `Storage usage: ${usedMb} MB / ${quotaMb} MB`;
}

async function refreshSelectorsAndCase() {
  await loadWorkspaces();
  await loadCases();
  await loadCurrentCase();
  await refreshStorageHealth();
}

function captureQuotaError(error, context) {
  const message = String(error?.message || error || "unknown").toLowerCase();
  if (message.includes("quota") || error?.name === "QuotaExceededError") {
    announce(`Storage quota reached while ${context}. Free space or export and reset local data.`);
    return true;
  }
  return false;
}

async function saveMemo(event) {
  event.preventDefault();
  if (!elements.memoForm.reportValidity()) {
    announce("Complete required fields before saving memo.");
    return;
  }

  try {
    const existing = await getRecord("cases", appState.selectedCaseId);
    const payload = getMemoPayload();
    await putRecord("cases", {
      ...existing,
      ...payload,
      updatedAt: nowIso()
    });

    const decisionRows = await getByIndex("decisionRecords", "caseId", appState.selectedCaseId);
    await putRecord("decisionRecords", {
      id: decisionRows[0]?.id || uid("decision"),
      caseId: appState.selectedCaseId,
      choice: payload.choice,
      rationale: payload.rationale,
      date: nowIso(),
      updatedAt: nowIso()
    });

    await loadCases();
    await loadCurrentCase();
    announce("Decision memo saved locally.");
  } catch (error) {
    if (!captureQuotaError(error, "saving memo")) {
      announce("Save failed. Run Integrity Repair and try again.");
    }
  }
}

async function addEvidence(event) {
  event.preventDefault();
  if (!elements.evidenceForm.reportValidity()) {
    return;
  }

  try {
    const fd = new FormData(elements.evidenceForm);
    await putRecord("evidenceItems", {
      id: uid("ev"),
      caseId: appState.selectedCaseId,
      kind: sanitizeText(fd.get("kind"), 40),
      citation: sanitizeText(fd.get("citation"), 140),
      notes: sanitizeText(fd.get("notes"), 500),
      createdAt: nowIso()
    });
    elements.evidenceForm.reset();
    await loadCurrentCase();
    announce("Evidence item added.");
  } catch (error) {
    if (!captureQuotaError(error, "adding evidence")) {
      announce("Could not add evidence item.");
    }
  }
}

async function addAssumption(event) {
  event.preventDefault();
  if (!elements.assumptionForm.reportValidity()) {
    return;
  }

  try {
    const fd = new FormData(elements.assumptionForm);
    await putRecord("assumptions", {
      id: uid("as"),
      caseId: appState.selectedCaseId,
      statement: sanitizeText(fd.get("statement"), 300),
      confidence: clampNumber(fd.get("confidence"), 0, 100),
      owner: "local",
      createdAt: nowIso()
    });
    elements.assumptionForm.reset();
    await loadCurrentCase();
    announce("Assumption added.");
  } catch (error) {
    if (!captureQuotaError(error, "adding assumption")) {
      announce("Could not add assumption.");
    }
  }
}

async function addOption(event) {
  event.preventDefault();
  if (!elements.optionForm.reportValidity()) {
    return;
  }

  try {
    const fd = new FormData(elements.optionForm);
    await putRecord("optionSets", {
      id: uid("opt"),
      caseId: appState.selectedCaseId,
      name: sanitizeText(fd.get("name"), 80),
      score: clampNumber(fd.get("score"), 0, 10),
      tradeoff: sanitizeText(fd.get("tradeoff"), 300),
      createdAt: nowIso()
    });
    elements.optionForm.reset();
    await loadCurrentCase();
    announce("Option added.");
  } catch (error) {
    if (!captureQuotaError(error, "adding option")) {
      announce("Could not add option.");
    }
  }
}

async function saveMatrix(event) {
  event.preventDefault();
  if (!appState.selectedCaseId) {
    announce("Select or create a case first.");
    return;
  }
  const fd = new FormData(elements.matrixForm);
  const rows = await getByIndex("reviewMatrices", "caseId", appState.selectedCaseId);
  await putRecord("reviewMatrices", {
    id: rows[0]?.id || uid("matrix"),
    caseId: appState.selectedCaseId,
    dimensions: sanitizeText(fd.get("dimensions"), 300),
    notes: sanitizeText(fd.get("notes"), 600),
    updatedAt: nowIso()
  });
  announce("Review matrix saved.");
}

async function saveOutcome(event) {
  event.preventDefault();
  if (!appState.selectedCaseId) {
    announce("Select or create a case first.");
    return;
  }
  const fd = new FormData(elements.outcomeForm);
  const rows = await getByIndex("outcomeReviews", "caseId", appState.selectedCaseId);
  await putRecord("outcomeReviews", {
    id: rows[0]?.id || uid("outcome"),
    caseId: appState.selectedCaseId,
    expectedVsActual: sanitizeText(fd.get("expectedVsActual"), 700),
    lessons: sanitizeText(fd.get("lessons"), 700),
    updatedAt: nowIso()
  });
  announce("Outcome review saved.");
}

async function saveGovernance(event) {
  event.preventDefault();
  if (!appState.selectedCaseId) {
    announce("Select or create a case first.");
    return;
  }
  const fd = new FormData(elements.governanceForm);
  const rows = await getByIndex("governanceReviews", "caseId", appState.selectedCaseId);
  await putRecord("governanceReviews", {
    id: rows[0]?.id || uid("governance"),
    caseId: appState.selectedCaseId,
    accountability: sanitizeText(fd.get("accountability"), 700),
    compliance: sanitizeText(fd.get("compliance"), 700),
    riskNote: sanitizeText(fd.get("riskNote"), 700),
    updatedAt: nowIso()
  });
  announce("Governance review saved.");
}

async function savePackHook(event) {
  event.preventDefault();
  if (!appState.selectedCaseId) {
    announce("Select or create a case first.");
    return;
  }
  const fd = new FormData(elements.packHookForm);
  const hookType = sanitizeText(fd.get("hookType"), 80);
  const existing = await getPackHooksByCaseAndType(appState.selectedCaseId, hookType);
  await putRecord("packHooks", {
    id: existing[0]?.id || uid("hook"),
    caseId: appState.selectedCaseId,
    hookType,
    contractNote: sanitizeText(fd.get("contractNote"), 600),
    status: sanitizeText(fd.get("status"), 60) || "ready",
    updatedAt: nowIso()
  });
  for (let i = 1; i < existing.length; i += 1) {
    await deleteRecord("packHooks", existing[i].id);
  }
  await loadCurrentCase();
  announce("Pack hook saved.");
}

async function newWorkspace() {
  const name = window.prompt("Workspace name", "New Workspace");
  if (!name) {
    return;
  }

  const ws = {
    id: uid("ws"),
    name: sanitizeText(name, 120),
    settings: {},
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await putRecord("workspaces", ws);

  const caseFile = {
    id: uid("case"),
    workspaceId: ws.id,
    title: "New Decision",
    type: "decision-memo",
    status: "draft",
    owner: "local",
    question: "",
    evidenceSummary: "",
    assumptionSummary: "",
    choice: "",
    rationale: "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await putRecord("cases", caseFile);

  appState.selectedWorkspaceId = ws.id;
  appState.selectedCaseId = caseFile.id;
  await refreshSelectorsAndCase();
  announce("Workspace created.");
}

async function newCase() {
  if (!appState.selectedWorkspaceId) {
    return;
  }

  const title = window.prompt("Case title", "New Case File");
  if (!title) {
    return;
  }

  const caseFile = {
    id: uid("case"),
    workspaceId: appState.selectedWorkspaceId,
    title: sanitizeText(title, 120),
    type: "case-analysis",
    status: "draft",
    owner: "local",
    question: "",
    evidenceSummary: "",
    assumptionSummary: "",
    choice: "",
    rationale: "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  await putRecord("cases", caseFile);
  appState.selectedCaseId = caseFile.id;
  await refreshSelectorsAndCase();
  announce("Case file created.");
}

async function exportJson() {
  const data = await snapshot(true);
  const filename = `ledger-suite-snapshot-${Date.now()}.json`;
  const payload = JSON.stringify(data, null, 2);
  downloadText(filename, payload, "application/json");
  await saveArtifactToOpfs(filename, payload, "application/json");
  announce("JSON snapshot exported.");
}

async function exportZip() {
  const data = await snapshot(true);
  const payload = JSON.stringify(data, null, 2);
  const filename = `ledger-suite-snapshot-${Date.now()}.zip`;
  const zipBlob = createZipSingleFile("snapshot.json", payload);
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  await saveArtifactToOpfs(filename, await zipBlob.arrayBuffer(), "application/zip");
  announce("ZIP snapshot exported.");
}

async function exportMarkdown() {
  const bundle = await getCurrentCaseBundle();
  if (!bundle || !bundle.caseFile) {
    announce("No active case to export.");
    return;
  }

  const md = [
    `# ${bundle.caseFile.title}`,
    "",
    "## Core Question",
    bundle.caseFile.question || "(not set)",
    "",
    "## Evidence Summary",
    bundle.caseFile.evidenceSummary || "(not set)",
    "",
    "## Assumption Summary",
    bundle.caseFile.assumptionSummary || "(not set)",
    "",
    "## Evidence Items",
    ...bundle.evidence.map((row) => `- ${row.kind}: ${row.citation}`),
    "",
    "## Assumptions",
    ...bundle.assumptions.map((row) => `- ${row.statement} (${row.confidence}%)`),
    "",
    "## Option Set",
    ...bundle.options.map((row) => `- ${row.name} [${row.score}/10] ${row.tradeoff}`),
    "",
    "## Decision",
    `- Choice: ${bundle.decision?.choice || bundle.caseFile.choice || "(not set)"}`,
    `- Rationale: ${bundle.decision?.rationale || bundle.caseFile.rationale || "(not set)"}`,
    "",
    "## Outcome Review",
    `- Expected vs Actual: ${bundle.outcome?.expectedVsActual || "(not set)"}`,
    `- Lessons: ${bundle.outcome?.lessons || "(not set)"}`,
    "",
    "## Governance Review",
    `- Accountability: ${bundle.governance?.accountability || "(not set)"}`,
    `- Compliance: ${bundle.governance?.compliance || "(not set)"}`,
    `- Risk Note: ${bundle.governance?.riskNote || "(not set)"}`,
    "",
    "## Pack Hooks",
    ...(bundle.packHooks || []).map((row) => `- ${row.hookType}: ${row.contractNote || ""} (${row.status || "ready"})`),
    "",
    `Generated by Ledger Suite v${VERSION} at ${nowIso()}`
  ].join("\n");

  const filename = `ledger-suite-brief-${Date.now()}.md`;
  downloadText(filename, md, "text/markdown");
  await saveArtifactToOpfs(filename, md, "text/markdown");
  announce("Markdown brief exported.");
}

async function printBrief() {
  const bundle = await getCurrentCaseBundle();
  renderPrintableBrief(bundle);
  window.print();
}

async function onImportFileChange(event) {
  const file = event.target.files[0];
  appState.pendingImport = null;
  elements.commitImportBtn.disabled = true;
  elements.importPreview.textContent = "";

  if (!file) {
    return;
  }

  try {
    const lowerName = file.name.toLowerCase();
    const isZip = lowerName.endsWith(".zip") || String(file.type || "").includes("zip");
    const isJson = lowerName.endsWith(".json") || String(file.type || "").includes("json");
    if (!isZip && !isJson) {
      announce("Unsupported import type. Use JSON or ZIP.");
      return;
    }
    if (Number(file.size || 0) > MAX_IMPORT_BYTES) {
      announce("Import file exceeds size limit.");
      return;
    }
    const text = isZip ? await parseZipSnapshot(file) : await file.text();
    if (!isZip && utf8ByteLength(text) > MAX_IMPORT_BYTES) {
      announce("Import file exceeds size limit.");
      return;
    }
    const parsed = JSON.parse(text);
    const normalized = normalizeImportData(parsed);
    if (normalized.error) {
      announce(normalized.error);
      return;
    }

    const data = normalized.data;
    const errorMessage = validateImportShape(data);
    if (errorMessage) {
      announce(errorMessage);
      return;
    }

    appState.pendingImport = data;
    elements.commitImportBtn.disabled = false;
    previewImport(data);
    announce("Import file validated and staged.");
  } catch {
    announce("Failed to parse import file.");
  } finally {
    resetImportFileInput();
  }
}

async function commitImport() {
  if (!appState.pendingImport) {
    return;
  }

  const tx = appState.db.transaction(STORE_NAMES, "readwrite");
  try {
    for (const storeName of STORE_NAMES) {
      const store = tx.objectStore(storeName);
      store.clear();
      for (const row of appState.pendingImport.entities[storeName]) {
        store.put(row);
      }
    }
    await txDone(tx);
    appState.pendingImport = null;
    elements.commitImportBtn.disabled = true;
    elements.importPreview.textContent = "";
    await refreshSelectorsAndCase();
    await logRecovery("import-committed", "Validated staged import committed.");
    announce("Import committed successfully.");
  } catch {
    announce("Import failed and was not committed.");
  } finally {
    resetImportFileInput();
  }
}

async function resetLocalData() {
  const accepted = window.confirm("Reset all local data? This cannot be undone.");
  if (!accepted) {
    return;
  }

  try {
    const backup = await snapshot(true);
    downloadText(
      `ledger-suite-pre-reset-backup-${Date.now()}.json`,
      JSON.stringify(backup, null, 2),
      "application/json"
    );
  } catch {
    announce("Could not generate pre-reset backup. Reset cancelled.");
    return;
  }

  const confirmed = window.confirm("Backup downloaded. Continue and wipe local data?");
  if (!confirmed) {
    announce("Reset cancelled after backup export.");
    return;
  }

  for (const storeName of STORE_NAMES) {
    await clearStore(storeName);
  }

  await ensureMetaAndMigrate();
  await ensureDefaultData();
  await logRecovery("local-reset", "User reset local data.");
  await refreshSelectorsAndCase();
  announce("Local data reset complete.");
}

async function clearAppCache() {
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }

    if (appState.swRegistration) {
      await appState.swRegistration.unregister();
    }

    announce("App cache cleared. Reloading...");
    window.location.reload();
  } catch {
    announce("Cache clear failed.");
  }
}

async function runRcCheck() {
  const results = [];
  const snapA = await snapshot(false);
  const snapB = await snapshot(false);

  const deterministic = JSON.stringify(snapA) === JSON.stringify(snapB);
  results.push({ name: "Deterministic snapshot", pass: deterministic });

  const importShapeValid = !validateImportShape({ ...snapA, exportedAt: nowIso() });
  results.push({ name: "Import validation", pass: importShapeValid });

  const buttons = Array.from(document.querySelectorAll("button"));
  const interactables = Array.from(document.querySelectorAll("button, a, summary, input, textarea, select"));
  const allInteractablesManipulation =
    interactables.length > 0 &&
    interactables.every((el) => window.getComputedStyle(el).touchAction.includes("manipulation"));
  results.push({ name: "Mobile touch manipulation", pass: allInteractablesManipulation });

  const meta = await getRecord("meta", "schema");
  results.push({ name: "Schema version pinned", pass: Number(meta?.schemaVersion) === SCHEMA_VERSION });

  const failures = results.filter((row) => !row.pass);
  const summary = results.map((row) => `${row.pass ? "PASS" : "FAIL"}: ${row.name}`).join(" | ");
  setRcOutput(summary);

  if (failures.length === 0) {
    announce("RC check passed for implemented gates.");
  } else {
    announce(`RC check has ${failures.length} failing gate(s).`);
  }
}

function handleRegistration(registration) {
  appState.swRegistration = registration;

  const markWaiting = () => {
    if (registration.waiting) {
      elements.applyUpdateBtn.disabled = false;
      announce("Update available. Use Apply Update to refresh safely.");
    }
  };

  if (registration.waiting) {
    markWaiting();
  }

  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) {
      return;
    }

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        markWaiting();
      }
    });
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("sw.js");
    handleRegistration(registration);

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_ACTIVATED") {
        announce(`Service worker active (${event.data.cacheName}).`);
      }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!appState.reloadingForUpdate) {
        appState.reloadingForUpdate = true;
        window.location.reload();
      }
    });
  } catch {
    announce("Service worker registration failed.");
  }
}

function applyUpdate() {
  const waiting = appState.swRegistration?.waiting;
  if (!waiting) {
    announce("No update waiting.");
    return;
  }

  waiting.postMessage({ type: "SKIP_WAITING" });
}

function wireEvents() {
  elements.workspaceSelect.addEventListener("change", async () => {
    appState.selectedWorkspaceId = elements.workspaceSelect.value;
    appState.selectedCaseId = "";
    await loadCases();
    await loadCurrentCase();
  });

  elements.caseSelect.addEventListener("change", async () => {
    appState.selectedCaseId = elements.caseSelect.value;
    await loadCurrentCase();
  });

  elements.newWorkspaceBtn.addEventListener("click", newWorkspace);
  elements.newCaseBtn.addEventListener("click", newCase);
  elements.memoForm.addEventListener("submit", saveMemo);
  elements.evidenceForm.addEventListener("submit", addEvidence);
  elements.assumptionForm.addEventListener("submit", addAssumption);
  elements.optionForm.addEventListener("submit", addOption);
  elements.matrixForm.addEventListener("submit", saveMatrix);
  elements.outcomeForm.addEventListener("submit", saveOutcome);
  elements.governanceForm.addEventListener("submit", saveGovernance);
  elements.packHookForm.addEventListener("submit", savePackHook);
  elements.exportJsonBtn.addEventListener("click", exportJson);
  elements.exportZipBtn.addEventListener("click", exportZip);
  elements.exportMdBtn.addEventListener("click", exportMarkdown);
  elements.printBriefBtn.addEventListener("click", printBrief);
  elements.importFile.addEventListener("change", onImportFileChange);
  elements.commitImportBtn.addEventListener("click", commitImport);
  elements.runRepairBtn.addEventListener("click", async () => {
    const removed = await runIntegrityRepair();
    await refreshSelectorsAndCase();
    announce(`Integrity repair complete. Removed ${removed} record(s).`);
  });
  elements.resetLocalBtn.addEventListener("click", resetLocalData);
  elements.clearCacheBtn.addEventListener("click", clearAppCache);
  elements.runRcCheckBtn.addEventListener("click", runRcCheck);
  elements.applyUpdateBtn.addEventListener("click", applyUpdate);
}

async function boot() {
  try {
    appState.db = await openDatabase();
    await ensureMetaAndMigrate();
    await ensureDefaultData();
    const repaired = await runIntegrityRepair();
    if (repaired > 0) {
      announce(`Integrity auto-repair removed ${repaired} invalid record(s).`);
    }

    wireEvents();
    await refreshSelectorsAndCase();
    await registerServiceWorker();
    announce("Ledger Suite RC candidate is ready for offline decision analysis.");
  } catch (error) {
    await logRecovery("startup-failure", String(error?.message || error));
    announce(`Startup error: ${String(error?.message || error)}`);
  }
}

boot();
