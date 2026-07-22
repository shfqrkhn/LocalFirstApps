import {
  MATTER_CHILD_STORES,
  SCHEMA_VERSION,
  baseRecord,
  getMatterGraph,
  getOne,
  getWorkspaceGraph,
  nowIso,
  uid,
  writeGraphAtomic
} from "./db.js";

export const EXPORT_VERSION = 2;
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

async function digestPayload(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(stable(value)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function finalizeBundle(bundle) {
  return { ...bundle, integrity: { algorithm: "SHA-256", value: await digestPayload(bundle) } };
}

export async function createMatterBundle(matterId) {
  const graph = await getMatterGraph(matterId);
  if (!graph) throw new Error("Matter not found.");
  const workspace = await getOne("workspaces", graph.matter.workspaceId);
  return finalizeBundle({
    app: "commonground",
    bundleKind: "matter",
    exportVersion: EXPORT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    workspaces: [{ workspace, matters: [graph] }]
  });
}

export async function createWorkspaceBundle(workspaceId) {
  const graph = await getWorkspaceGraph(workspaceId);
  if (!graph) throw new Error("Workspace not found.");
  return finalizeBundle({
    app: "commonground",
    bundleKind: "workspace",
    exportVersion: EXPORT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    workspaces: [{ workspace: graph.workspace, matters: graph.matters }]
  });
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJson(filename, value) {
  const text = JSON.stringify(value, null, 2);
  downloadBlob(filename, new Blob([text], { type: "application/json" }));
  return text;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createStoredZip(fileName, content) {
  const encoder = new TextEncoder();
  const name = encoder.encode(fileName);
  const body = encoder.encode(content);
  const crc = crc32(body);
  const local = new Uint8Array(30 + name.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(8, 0, true);
  localView.setUint32(14, crc, true);
  localView.setUint32(18, body.length, true);
  localView.setUint32(22, body.length, true);
  localView.setUint16(26, name.length, true);
  local.set(name, 30);
  const central = new Uint8Array(46 + name.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint32(16, crc, true);
  centralView.setUint32(20, body.length, true);
  centralView.setUint32(24, body.length, true);
  centralView.setUint16(28, name.length, true);
  central.set(name, 46);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, 1, true);
  endView.setUint16(10, 1, true);
  endView.setUint32(12, central.length, true);
  endView.setUint32(16, local.length + body.length, true);
  return new Blob([local, body, central, end], { type: "application/zip" });
}

function extractStoredZip(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 30 || view.getUint32(0, true) !== 0x04034b50) throw new Error("Invalid ZIP snapshot.");
  const flags = view.getUint16(6, true);
  if ((flags & 0x9) !== 0 || view.getUint16(8, true) !== 0) throw new Error("Unsupported ZIP snapshot format.");
  const expectedCrc = view.getUint32(14, true);
  const size = view.getUint32(18, true);
  const nameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  const start = 30 + nameLength + extraLength;
  if (start + size > view.byteLength) throw new Error("ZIP snapshot is truncated.");
  const bytes = new Uint8Array(buffer, start, size);
  if (crc32(bytes) !== expectedCrc) throw new Error("ZIP snapshot checksum failed.");
  return new TextDecoder().decode(bytes);
}

export async function parseBundleFile(file) {
  if (!file || file.size > MAX_IMPORT_BYTES) throw new Error("CommonGround imports must not exceed 25 MB.");
  const text = String(file.name || "").toLowerCase().endsWith(".zip")
    ? extractStoredZip(await file.arrayBuffer())
    : await file.text();
  let bundle;
  try {
    bundle = JSON.parse(text);
  } catch {
    throw new Error("Import file is not valid JSON.");
  }
  if (Number(bundle?.exportVersion) === 1 && bundle?.matter) bundle = await upgradeV1MatterBundle(bundle);
  await validateBundle(bundle);
  return bundle;
}

async function upgradeV1MatterBundle(bundle) {
  const workspaceId = `legacy-workspace-${bundle.matter.workspaceId || uid("source")}`;
  const graph = {
    matter: { ...bundle.matter, workspaceId },
    participants: Array.isArray(bundle.participants) ? bundle.participants : [],
    intakeRecords: Array.isArray(bundle.intakeRecords) ? bundle.intakeRecords : bundle.intakeRecord ? [bundle.intakeRecord] : [],
    issueNodes: Array.isArray(bundle.issueNodes) ? bundle.issueNodes : [],
    sessions: Array.isArray(bundle.sessions) ? bundle.sessions : [],
    commitments: Array.isArray(bundle.commitments) ? bundle.commitments : [],
    followUps: Array.isArray(bundle.followUps) ? bundle.followUps : [],
    exportArtifacts: Array.isArray(bundle.exportArtifacts) ? bundle.exportArtifacts : [],
    decisionBriefs: [],
    decisionItems: []
  };
  return finalizeBundle({
    app: "commonground",
    bundleKind: "matter",
    exportVersion: EXPORT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: bundle.exportedAt || nowIso(),
    workspaces: [{
      workspace: { ...baseRecord("ws"), id: workspaceId, name: "Imported CommonGround", owner: "Local owner", settings: { defaultVisibility: "private" } },
      matters: [graph]
    }]
  });
}

export async function validateBundle(bundle) {
  const errors = [];
  if (!bundle || typeof bundle !== "object") errors.push("Top-level value must be an object.");
  if (bundle?.app !== "commonground") errors.push("Bundle app must be commonground.");
  if (Number(bundle?.exportVersion) !== EXPORT_VERSION) errors.push("Unsupported CommonGround export version.");
  if (Number(bundle?.schemaVersion) > SCHEMA_VERSION) errors.push("Bundle requires a newer CommonGround schema.");
  if (!["matter", "workspace"].includes(bundle?.bundleKind)) errors.push("Bundle kind must be matter or workspace.");
  if (!Array.isArray(bundle?.workspaces) || !bundle.workspaces.length) errors.push("Bundle contains no workspaces.");
  for (const entry of bundle?.workspaces || []) {
    if (!entry.workspace?.id || typeof entry.workspace.name !== "string") errors.push("A workspace record is malformed.");
    if (!Array.isArray(entry.matters)) errors.push("Workspace matters must be an array.");
    for (const graph of entry.matters || []) {
      if (!graph.matter?.id || typeof graph.matter.title !== "string") errors.push("A matter record is malformed.");
      for (const name of MATTER_CHILD_STORES) if (graph[name] !== undefined && !Array.isArray(graph[name])) errors.push(`${name} must be an array.`);
    }
  }
  if (bundle?.integrity?.algorithm !== "SHA-256" || typeof bundle?.integrity?.value !== "string") {
    errors.push("Bundle integrity metadata is missing.");
  } else {
    const { integrity, ...payload } = bundle;
    if (await digestPayload(payload) !== integrity.value) errors.push("Bundle integrity checksum failed.");
  }
  if (errors.length) throw new Error(errors.join(" "));
  return true;
}

export async function restoreBundle(bundle) {
  await validateBundle(bundle);
  const workspaces = [];
  const matters = [];
  const children = Object.fromEntries(MATTER_CHILD_STORES.map((name) => [name, []]));
  for (const workspaceEntry of bundle.workspaces) {
    const workspaceId = uid("ws");
    workspaces.push({ ...workspaceEntry.workspace, id: workspaceId, updatedAt: nowIso(), schemaVersion: SCHEMA_VERSION });
    for (const graph of workspaceEntry.matters) {
      const matterId = uid("matter");
      const participantMap = new Map((graph.participants || []).map((row) => [row.id, uid("participant")]));
      matters.push({ ...graph.matter, id: matterId, workspaceId, updatedAt: nowIso(), schemaVersion: SCHEMA_VERSION });
      for (const name of MATTER_CHILD_STORES) {
        for (const row of graph[name] || []) {
          const id = name === "participants" ? participantMap.get(row.id) : uid(name.replace(/s$/, ""));
          const next = { ...row, id, matterId, updatedAt: nowIso(), schemaVersion: SCHEMA_VERSION };
          if (next.participantId) next.participantId = participantMap.get(next.participantId) || next.participantId;
          if (Array.isArray(next.participantIds)) next.participantIds = next.participantIds.map((value) => participantMap.get(value) || value);
          children[name].push(next);
        }
      }
    }
  }
  await writeGraphAtomic({ workspaces, matters, children });
  return { workspaces: workspaces.length, matters: matters.length };
}

export function matterMarkdown(graph) {
  const matter = graph.matter;
  const lines = [`# ${matter.title}`, "", `Type: ${matter.type}`, `Status: ${matter.status}`, ""];
  if (matter.type === "decision-analysis") {
    const brief = graph.decisionBriefs?.[0] || {};
    const memo = brief.memo || {};
    lines.push("## Decision memo", "", `**Context:** ${memo.context || "shared"}`, "", `**Question:** ${memo.question || ""}`, "", `**Leading choice:** ${memo.choice || ""}`, "", memo.rationale || "", "");
    for (const kind of ["evidence", "assumption", "constraint", "option", "pack-hook"]) {
      lines.push(`## ${kind.replace("-", " ")}`, "");
      for (const item of (graph.decisionItems || []).filter((row) => row.kind === kind)) lines.push(`- ${Object.values(item.data || {}).filter((value) => value !== "").join(" — ")}`);
      lines.push("");
    }
  } else {
    lines.push("## Issues", "", ...(graph.issueNodes || []).map((row) => `- ${row.label}: ${row.notes || ""}`), "", "## Commitments", "", ...(graph.commitments || []).map((row) => `- ${row.text} (${row.status})`), "");
  }
  lines.push(`_Exported from CommonGround ${nowIso()}_`);
  return lines.join("\n");
}

export async function saveOptionalOpfs(filename, content) {
  if (!navigator.storage?.getDirectory) return false;
  try {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle("commonground", { create: true });
    const handle = await directory.getFileHandle(filename, { create: true });
    const writer = await handle.createWritable();
    await writer.write(content);
    await writer.close();
    return true;
  } catch {
    return false;
  }
}

export async function downloadWorkspaceBackup(workspaceId, prefix = "commonground-backup", { download = true } = {}) {
  const bundle = await createWorkspaceBundle(workspaceId);
  const text = JSON.stringify(bundle, null, 2);
  const filename = `${prefix}-${Date.now()}.json`;
  if (download) downloadBlob(filename, new Blob([text], { type: "application/json" }));
  await saveOptionalOpfs(filename, text);
  return { bundle, filename, text };
}
