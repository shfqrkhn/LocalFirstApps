import {
  INTERCHANGE_VERSION,
  createInterchangePackage,
  parseInterchangeFile,
  splitRecordExtensions,
  validateInterchangePackage
} from "../../../shared/interchange.js";
import {
  MATTER_CHILD_STORES,
  SCHEMA_VERSION,
  baseRecord,
  getByIndex,
  getMatterGraph,
  getOne,
  nowIso,
  rollbackInterchangeReceipt,
  uid,
  writeInterchangeAtomic
} from "./db.js";

const TYPE = "commonground/matter";

function timezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC"; } catch { return "Etc/UTC"; }
}

function cleanSourceGraph(graph) {
  const copy = structuredClone(graph);
  if (copy?.matter) delete copy.matter.interchangeExtensions;
  return copy;
}

export async function createCommonGroundInterchange(matterId) {
  const graph = await getMatterGraph(matterId);
  if (!graph) throw new Error("Matter not found.");
  const workspace = await getOne("workspaces", graph.matter.workspaceId);
  if (!workspace) throw new Error("Matter workspace not found.");
  const savedExtensions = graph.matter.interchangeExtensions || {};
  const sourceId = savedExtensions.sourceRecordId || `urn:lfa:commonground:matter:${graph.matter.id}`;
  const graphRows = [graph.matter, ...MATTER_CHILD_STORES.flatMap((name) => graph[name] || [])];
  const latestGraphUpdate = graphRows.map((row) => row.updatedAt).filter(Boolean).sort().at(-1) || graph.matter.updatedAt || nowIso();
  const localRevision = Math.max(0, ...graphRows.map((row) => Number(row.revision || 0)));
  const changedAfterImport = savedExtensions.importedAt && latestGraphUpdate > savedExtensions.importedAt;
  const record = {
    ...structuredClone(savedExtensions.record || {}),
    schemaVersion: INTERCHANGE_VERSION,
    id: sourceId,
    type: TYPE,
    status: graph.matter.status || "active",
    truthClass: savedExtensions.truthClass || "user-authored",
    confidence: savedExtensions.confidence ?? null,
    owner: workspace.owner || "Local owner",
    sourceApp: savedExtensions.sourceApp || "commonground",
    createdAt: savedExtensions.createdAt || graph.matter.createdAt || nowIso(),
    updatedAt: changedAfterImport ? latestGraphUpdate : savedExtensions.updatedAt || latestGraphUpdate,
    timezone: savedExtensions.timezone || timezone(),
    units: structuredClone(savedExtensions.units || {}),
    assumptions: (graph.decisionItems || []).filter((row) => row.kind === "assumption").map((row) => ({ id: row.id, ...structuredClone(row.data || {}) })),
    conflicts: structuredClone(savedExtensions.conflicts || []),
    relationships: [{ type: "belongs-to", targetId: `urn:lfa:commonground:workspace:${workspace.id}` }],
    tags: Array.isArray(graph.matter.tags) ? structuredClone(graph.matter.tags) : [],
    payload: { ...structuredClone(savedExtensions.payload || {}), workspace: { ...workspace }, graph: cleanSourceGraph(graph) },
    revision: Number(savedExtensions.sourceRevision || 0) + localRevision,
    idempotencyKey: ""
  };
  return createInterchangePackage({
    sourceApp: "commonground",
    timezone: record.timezone,
    records: [record],
    selection: { sourceMatterIds: [graph.matter.id] }
  });
}

export async function stageCommonGroundInterchange(file) {
  return prepareCommonGroundInterchange(await parseInterchangeFile(file));
}

export async function prepareCommonGroundInterchange(value) {
  const validation = await validateInterchangePackage(value);
  const unsupported = value.records.filter((record) => record.type !== TYPE);
  if (unsupported.length) throw new Error(`CommonGround cannot import record type ${unsupported[0].type}.`);
  for (const record of value.records) {
    const { workspace, graph } = record.payload || {};
    if (!workspace || typeof workspace.name !== "string" || !graph?.matter || typeof graph.matter.title !== "string" || typeof graph.matter.type !== "string") {
      throw new Error(`Record ${record.id} has no valid CommonGround matter payload.`);
    }
    for (const name of MATTER_CHILD_STORES) if (graph[name] !== undefined && !Array.isArray(graph[name])) throw new Error(`Record ${record.id} has invalid ${name}.`);
  }
  return {
    package: structuredClone(value),
    exactJson: JSON.stringify(value, null, 2),
    recordCount: value.records.length,
    recordIds: value.records.map((record) => record.id),
    idempotencyKey: value.manifest.idempotencyKey,
    forwardMinor: validation.forwardMinor
  };
}

function remapRecord(record, workspaceId, matterId) {
  const sourceGraph = record.payload.graph;
  const importInstant = nowIso();
  const participantMap = new Map((sourceGraph.participants || []).map((row) => [row.id, uid("participant")]));
  const matter = {
    ...structuredClone(sourceGraph.matter),
    id: matterId,
    workspaceId,
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    createdAt: importInstant,
    updatedAt: importInstant,
    title: `${sourceGraph.matter.title} (Imported)`,
    interchangeExtensions: {
      sourceRecordId: record.id,
      sourceApp: record.sourceApp,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      sourceRevision: record.revision,
      importedAt: importInstant,
      record: splitRecordExtensions(record),
      truthClass: record.truthClass,
      confidence: record.confidence,
      timezone: record.timezone,
      units: structuredClone(record.units),
      conflicts: structuredClone(record.conflicts),
      payload: Object.fromEntries(Object.entries(record.payload).filter(([key]) => !["workspace", "graph"].includes(key)))
    }
  };
  const children = Object.fromEntries(MATTER_CHILD_STORES.map((name) => [name, []]));
  for (const name of MATTER_CHILD_STORES) {
    for (const row of sourceGraph[name] || []) {
      const id = name === "participants" ? participantMap.get(row.id) : uid(name.replace(/s$/, ""));
      const next = { ...structuredClone(row), id, matterId, schemaVersion: SCHEMA_VERSION, revision: 0, createdAt: importInstant, updatedAt: importInstant };
      if (next.participantId) next.participantId = participantMap.get(next.participantId) || next.participantId;
      if (Array.isArray(next.participantIds)) next.participantIds = next.participantIds.map((value) => participantMap.get(value) || value);
      children[name].push(next);
    }
  }
  return { matter, children };
}

export async function applyCommonGroundInterchange(staged, { failureMode } = {}) {
  const prepared = staged?.package ? staged : await prepareCommonGroundInterchange(staged);
  await validateInterchangePackage(prepared.package);
  if ((await getByIndex("transferReceipts", "idempotencyKey", prepared.idempotencyKey)).length) {
    throw new Error("This interchange package was already imported; no duplicate data was written.");
  }
  const workspaceId = uid("ws");
  const firstWorkspace = prepared.package.records[0].payload.workspace;
  const workspace = {
    ...structuredClone(firstWorkspace),
    id: workspaceId,
    name: `${firstWorkspace.name || "Imported CommonGround"} (Imported)`,
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  const matters = [];
  const children = Object.fromEntries(MATTER_CHILD_STORES.map((name) => [name, []]));
  for (const record of prepared.package.records) {
    const mapped = remapRecord(record, workspaceId, uid("matter"));
    matters.push(mapped.matter);
    for (const name of MATTER_CHILD_STORES) children[name].push(...mapped.children[name]);
  }
  const createdIds = { workspaces: [workspace.id], matters: matters.map((row) => row.id) };
  for (const name of MATTER_CHILD_STORES) createdIds[name] = children[name].map((row) => row.id);
  const receipt = {
    ...baseRecord("transfer-receipt"),
    transferId: prepared.package.transferId,
    idempotencyKey: prepared.idempotencyKey,
    packageHash: prepared.package.manifest.packageHash,
    sourceApp: prepared.package.sourceApp,
    recordIds: prepared.recordIds,
    createdIds,
    status: "applied",
    appliedAt: nowIso()
  };
  try {
    await writeInterchangeAtomic({ workspaces: [workspace], matters, children, receipt, failureMode });
  } catch (error) {
    if (error?.name === "ConstraintError") {
      throw new Error("This interchange package was already imported or conflicted with another tab; no duplicate data was written.");
    }
    if (error?.name === "QuotaExceededError") throw new Error("Local storage quota prevented this import; no data was written.");
    throw error;
  }
  return { receipt, workspaces: 1, matters: matters.length };
}

export async function rollbackCommonGroundInterchange(receiptId) {
  return rollbackInterchangeReceipt(receiptId);
}
