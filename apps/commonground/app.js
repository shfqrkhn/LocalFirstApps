import {
  baseRecord,
  deleteCommonGroundDatabase,
  deleteMatterGraph,
  getAll,
  getByIndex,
  getMatterGraph,
  getOne,
  nowIso,
  put,
  remove,
  repairIntegrity
} from "./modules/db.js";
import {
  createMatterBundle,
  createStoredZip,
  downloadBlob,
  downloadJson,
  downloadWorkspaceBackup,
  matterMarkdown,
  parseBundleFile,
  restoreBundle,
  saveOptionalOpfs
} from "./modules/exports.js";
import {
  commitLegacyMigration,
  deleteLegacyDatabase,
  detectLegacyMigration,
  exportLegacyDatabaseSnapshot,
  parseLegacyFile,
  prepareLegacyMigration
} from "./modules/legacy.js";
import { MATTER_TYPES, matterRoutes, matterType, nextMatterStep } from "./modules/matter-types.js";

const APP_VERSION = "0.2.0";
const root = document.querySelector("#app");
const statusRegion = document.querySelector("#app-status");

const state = {
  workspaces: [],
  workspace: null,
  matters: [],
  matter: null,
  graph: null,
  route: "dashboard",
  notice: null,
  pendingBundle: null,
  pendingLegacy: null,
  legacyBackupDownloaded: false,
  updateRegistration: null,
  activatingUpdate: false,
  modal: null
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function text(form, name, max = 2000) {
  return String(form.get(name) ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function announce(message, tone = "info") {
  state.notice = { message, tone };
  if (statusRegion) statusRegion.textContent = message;
}

function noticeMarkup() {
  const notice = state.notice ? `<div class="notice notice-${state.notice.tone}" role="status">${escapeHtml(state.notice.message)}</div>` : "";
  const update = state.updateRegistration
    ? '<div class="notice notice-update" role="status"><span>A verified CommonGround update is ready.</span><button class="secondary" data-action="activate-update">Reload to update</button></div>'
    : "";
  return notice + update;
}

function empty(message) {
  return `<div class="empty-state"><p>${escapeHtml(message)}</p></div>`;
}

function typeOptions(selected = "conflict-resolution") {
  return Object.entries(MATTER_TYPES)
    .map(([value, config]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(config.label)}</option>`)
    .join("");
}

async function refreshWorkspace(preferredId = state.workspace?.id) {
  const workspaces = (await getAll("workspaces")).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  state.workspaces = workspaces;
  state.workspace = workspaces.find((row) => row.id === preferredId) || workspaces[0] || null;
  state.matters = state.workspace
    ? (await getByIndex("matters", "workspaceId", state.workspace.id)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    : [];
  if (state.matter && !state.matters.some((row) => row.id === state.matter.id)) {
    state.matter = null;
    state.graph = null;
  }
}

async function refreshMatter(matterId = state.matter?.id) {
  if (!matterId) return;
  state.graph = await getMatterGraph(matterId);
  state.matter = state.graph?.matter || null;
  if (state.matter) {
    const index = state.matters.findIndex((row) => row.id === state.matter.id);
    if (index >= 0) state.matters[index] = state.matter;
  }
}

function onboardingView() {
  return `
    <main class="center-shell" id="main-content">
      <section class="card onboarding-card">
        <p class="eyebrow">Private by default</p>
        <h1>Welcome to CommonGround</h1>
        <p>Set up one local workspace for facilitation and decision analysis. Nothing is uploaded.</p>
        ${noticeMarkup()}
        <form id="workspace-form" class="stack">
          <label>Workspace name<input name="name" maxlength="120" required placeholder="My workspace"></label>
          <label>Workspace owner<input name="owner" maxlength="120" required placeholder="Local owner"></label>
          <button class="primary" type="submit">Create Workspace</button>
        </form>
      </section>
    </main>`;
}

function header() {
  return `
    <header class="app-header">
      <div class="brand"><img src="./icons/icon-32.png" alt="" width="30" height="30"><div><strong>CommonGround</strong><small>Local-first facilitation and decision workspace</small></div></div>
      <label class="workspace-switcher">Workspace<select id="workspace-switcher">${state.workspaces.map((workspace) => `<option value="${workspace.id}" ${workspace.id === state.workspace.id ? "selected" : ""}>${escapeHtml(workspace.name)}</option>`).join("")}</select></label>
      <nav aria-label="Main navigation">
        ${[["dashboard", "Dashboard"], ["matters", "Matters"], ["settings", "Settings"]]
          .map(([route, label]) => `<button class="nav-button ${state.route === route ? "active" : ""}" data-route="${route}" ${state.route === route ? 'aria-current="page"' : ""}>${label}</button>`)
          .join("")}
      </nav>
    </header>`;
}

function dashboardView() {
  const facilitation = state.matters.filter((matter) => matterType(matter.type).family === "facilitation");
  const decisions = state.matters.filter((matter) => matterType(matter.type).family === "decision");
  return `
    <section class="page-header"><div><p class="eyebrow">${escapeHtml(state.workspace.name)}</p><h1>Shared work, clear next steps</h1><p>Owned locally by ${escapeHtml(state.workspace.owner || "Local owner")}</p></div><button class="primary" data-route="create-matter">New Matter</button></section>
    <section class="stat-grid" aria-label="Workspace summary">
      <article class="stat"><span>Active matters</span><strong>${state.matters.filter((matter) => matter.status !== "closed").length}</strong></article>
      <article class="stat"><span>Facilitation</span><strong>${facilitation.length}</strong></article>
      <article class="stat"><span>Decision analysis</span><strong>${decisions.length}</strong></article>
      <article class="stat"><span>Need suitability</span><strong>${facilitation.filter((matter) => matter.suitabilityState === "pending").length}</strong></article>
    </section>
    <section class="section-block"><div class="section-title"><h2>Recent matters</h2><button class="secondary" data-route="matters">View all</button></div>${matterList(state.matters.slice(0, 5))}</section>`;
}

function matterList(matters) {
  if (!matters.length) return empty("No matters yet. Create a facilitation matter or decision analysis.");
  return `<div class="matter-list">${matters.map((matter) => {
    const config = matterType(matter.type);
    const stateLabel = config.family === "decision" ? "Decision workflow" : matter.suitabilityState === "routed-out" ? "Routed out" : matter.suitabilityState === "pending" ? "Suitability pending" : "Facilitation active";
    return `<button class="matter-row" data-open-matter="${matter.id}"><span><strong>${escapeHtml(matter.title)}</strong><small>${escapeHtml(config.label)}</small></span><span class="badge">${escapeHtml(stateLabel)}</span></button>`;
  }).join("")}</div>`;
}

function mattersView() {
  return `<section class="page-header"><div><p class="eyebrow">Workspace</p><h1>Matters</h1><p>Facilitation and decision records share one private workspace.</p></div><button class="primary" data-route="create-matter">New Matter</button></section>${matterList(state.matters)}`;
}

function createMatterView() {
  return `<section class="page-header"><div><p class="eyebrow">New work</p><h1>Create Matter</h1><p>Choose a workflow; CommonGround will show only the relevant steps.</p></div></section>
    <section class="card narrow"><form id="matter-form" class="stack">
      <label>Matter title<input name="title" maxlength="120" required placeholder="Clear, specific title"></label>
      <label>Matter type<select name="type">${typeOptions()}</select></label>
      <div class="form-actions"><button type="button" class="secondary" data-route="matters">Cancel</button><button type="submit" class="primary">Create Matter</button></div>
    </form></section>`;
}

function matterNav() {
  const allowed = matterRoutes(state.matter.type);
  return `<nav class="matter-nav" aria-label="Matter workflow">${allowed.map(([route, label]) => `<button data-route="${route}" class="${state.route === route ? "active" : ""}" ${state.route === route ? 'aria-current="step"' : ""}>${label}</button>`).join("")}</nav>`;
}

function matterShell(content) {
  const config = matterType(state.matter.type);
  return `<section class="matter-heading"><div><p class="eyebrow">${escapeHtml(config.label)}</p><h1>${escapeHtml(state.matter.title)}</h1><p>${config.family === "decision" ? "Decision workflow — suitability not applicable" : `Suitability: ${escapeHtml(state.matter.suitabilityState)}`}</p></div><button class="danger-quiet" data-action="delete-matter">Delete Matter</button></section>${matterNav()}${content}`;
}

function matterOverview() {
  const [route, label] = nextMatterStep(state.matter, state.graph);
  const graph = state.graph;
  const config = matterType(state.matter.type);
  const metrics = config.family === "decision"
    ? [
        ["Evidence", graph.decisionItems.filter((row) => row.kind === "evidence").length],
        ["Assumptions", graph.decisionItems.filter((row) => row.kind === "assumption").length],
        ["Hard constraints", graph.decisionItems.filter((row) => row.kind === "constraint").length],
        ["Options", graph.decisionItems.filter((row) => row.kind === "option").length]
      ]
    : [["Participants", graph.participants.length], ["Issues", graph.issueNodes.length], ["Commitments", graph.commitments.length]];
  return matterShell(`<section class="stat-grid">${metrics.map(([name, count]) => `<article class="stat"><span>${name}</span><strong>${count}</strong></article>`).join("")}</section><section class="card next-step"><p class="eyebrow">Recommended next step</p><h2>${escapeHtml(label)}</h2><button class="primary" data-route="${route}">Continue</button></section>`);
}

function suitabilityView() {
  const routed = state.matter.suitabilityState === "routed-out";
  return matterShell(`<section class="card"><h2>Suitability screening</h2><p>Route out when consent, authority, power balance, or safety is not adequate. CommonGround does not replace professional safety judgment.</p>
    <form id="suitability-form" class="stack">
      ${[["voluntary", "Participation is voluntary"], ["authority", "Participants have authority to engage"], ["balanced", "No severe power imbalance prevents fair participation"], ["safe", "No immediate safety risk requires another route"]].map(([name, label]) => `<label class="check"><input type="checkbox" name="${name}" ${state.matter.suitabilityChecklist?.[name] ? "checked" : ""}>${label}</label>`).join("")}
      <label>Outcome<select name="outcome"><option value="suitable" ${!routed ? "selected" : ""}>Suitable</option><option value="routed-out" ${routed ? "selected" : ""}>Not suitable — route out</option></select></label>
      <label>Rationale and referral notes<textarea name="rationale" maxlength="1200">${escapeHtml(state.matter.suitabilityRationale || "")}</textarea></label>
      <button class="primary" type="submit">Save Suitability</button>
    </form></section>`);
}

function intakeView() {
  return matterShell(`<div class="two-column">
    <section class="card"><h2>Participants</h2><form id="participant-form" class="stack compact"><label>Name<input name="displayName" maxlength="120" required></label><label>Role<input name="role" maxlength="80" placeholder="Participant"></label><label class="check"><input type="checkbox" name="consent">Process consent recorded</label><button class="primary" type="submit">Add Participant</button></form>${recordList(state.graph.participants, (row) => `${row.displayName} — ${row.role || "Participant"}`, "participants")}</section>
    <section class="card"><h2>Intake context</h2><form id="intake-form" class="stack"><label>Context<textarea name="context" maxlength="2000">${escapeHtml(state.graph.intakeRecords[0]?.responses?.context || "")}</textarea></label><label>Shared goals<textarea name="goals" maxlength="1200">${escapeHtml(state.graph.intakeRecords[0]?.responses?.goals || "")}</textarea></label><label>Concerns or risks<textarea name="concerns" maxlength="1200">${escapeHtml(state.graph.intakeRecords[0]?.responses?.concerns || "")}</textarea></label><button class="primary" type="submit">Save Intake</button></form></section>
  </div>`);
}

function recordList(rows, label, store) {
  if (!rows.length) return empty("Nothing recorded yet.");
  return `<ul class="record-list">${rows.map((row) => `<li><span>${escapeHtml(label(row))}</span><button class="icon-button" data-delete-store="${store}" data-delete-id="${row.id}" aria-label="Delete ${escapeHtml(label(row))}">Delete</button></li>`).join("")}</ul>`;
}

function issuesView() {
  return matterShell(`<section class="card"><h2>Issue map</h2><form id="issue-form" class="form-grid"><label>Issue<input name="label" maxlength="120" required></label><label>Priority<select name="priority"><option>medium</option><option>high</option><option>critical</option><option>low</option></select></label><label class="span-all">Notes<textarea name="notes" maxlength="1000"></textarea></label><button class="primary" type="submit">Add Issue</button></form>${recordList(state.graph.issueNodes, (row) => `${row.label} — ${row.priority}`, "issueNodes")}</section>`);
}

function sessionsView() {
  return matterShell(`<section class="card"><h2>Sessions</h2><form id="session-form" class="stack"><label>Agenda items<textarea name="agenda" maxlength="1200" placeholder="One item per line" required></textarea></label><label>Session notes<textarea name="notes" maxlength="2000"></textarea></label><button class="primary" type="submit">Log Session</button></form>${recordList(state.graph.sessions, (row) => `${new Date(row.date).toLocaleDateString()} — ${row.agenda.join(", ")}`, "sessions")}</section>`);
}

function commitmentsView() {
  return matterShell(`<section class="card"><h2>Commitments</h2><form id="commitment-form" class="form-grid"><label class="span-all">Commitment<input name="text" maxlength="500" required></label><label>Owner<input name="owner" maxlength="120" required></label><label>Due date<input name="dueDate" type="date"></label><button class="primary" type="submit">Add Commitment</button></form>${recordList(state.graph.commitments, (row) => `${row.text} — ${row.owner} (${row.status})`, "commitments")}</section>`);
}

function followUpsView() {
  return matterShell(`<section class="card"><h2>Follow-ups</h2><form id="followup-form" class="form-grid"><label>Target date<input name="targetDate" type="date" required></label><label class="span-all">Purpose or outcome<textarea name="result" maxlength="1000"></textarea></label><button class="primary" type="submit">Schedule Follow-up</button></form>${recordList(state.graph.followUps, (row) => `${row.targetDate} — ${row.result || "Scheduled"}`, "followUps")}</section>`);
}

function decisionBrief() {
  return state.graph.decisionBriefs[0] || { memo: {}, matrix: {}, decision: {}, governance: {}, outcome: {} };
}

function decisionFramingView() {
  const brief = decisionBrief();
  return matterShell(`<section class="card"><h2>Decision memo</h2><form id="decision-memo-form" class="stack">
    <label>Decision context<select name="context"><option value="shared" ${brief.memo.context === "shared" || !brief.memo.context ? "selected" : ""}>Shared / general</option><option value="personal" ${brief.memo.context === "personal" ? "selected" : ""}>Personal</option><option value="professional" ${brief.memo.context === "professional" ? "selected" : ""}>Professional</option></select></label>
    <label>Core question<textarea name="question" maxlength="500" required>${escapeHtml(brief.memo.question || "")}</textarea></label>
    <label>Evidence summary<textarea name="evidenceSummary" maxlength="1200">${escapeHtml(brief.memo.evidenceSummary || "")}</textarea></label>
    <label>Assumption summary<textarea name="assumptionSummary" maxlength="1200">${escapeHtml(brief.memo.assumptionSummary || "")}</textarea></label>
    <label>Leading choice<textarea name="choice" maxlength="800">${escapeHtml(brief.memo.choice || "")}</textarea></label>
    <label>Rationale<textarea name="rationale" maxlength="1200">${escapeHtml(brief.memo.rationale || "")}</textarea></label>
    <button class="primary" type="submit">Save Decision Memo</button></form></section>`);
}

function decisionItems(kind) {
  return state.graph.decisionItems.filter((row) => row.kind === kind);
}

function decisionEvidenceView() {
  return matterShell(`<div class="two-column">
    <section class="card"><h2>Evidence</h2><form id="evidence-form" class="stack compact"><label>Type<input name="kind" maxlength="40" required></label><label>Citation<input name="citation" maxlength="140" required></label><label>Notes<textarea name="notes" maxlength="500"></textarea></label><button class="primary">Add Evidence</button></form>${recordList(decisionItems("evidence"), (row) => `${row.data.kind}: ${row.data.citation}`, "decisionItems")}</section>
    <section class="card"><h2>Assumptions</h2><form id="assumption-form" class="stack compact"><label>Statement<textarea name="statement" maxlength="300" required></textarea></label><label>Confidence (0–100)<input name="confidence" type="number" min="0" max="100" value="50" required></label><button class="primary">Add Assumption</button></form>${recordList(decisionItems("assumption"), (row) => `${row.data.statement} — ${row.data.confidence}%`, "decisionItems")}</section>
  </div>`);
}

function decisionOptionsView() {
  const brief = decisionBrief();
  return matterShell(`<div class="two-column">
    <section class="card"><h2>Hard constraints</h2><p>A failed hard constraint cannot be compensated for by a high option score.</p><form id="constraint-form" class="stack compact"><label>Constraint<textarea name="statement" maxlength="300" required></textarea></label><label>Why it is non-negotiable<textarea name="reason" maxlength="300"></textarea></label><button class="primary">Add Hard Constraint</button></form>${recordList(decisionItems("constraint"), (row) => row.data.statement, "decisionItems")}</section>
    <section class="card"><h2>Options</h2><form id="option-form" class="stack compact"><label>Option<input name="name" maxlength="80" required></label><label>Comparative score (0–10)<input name="score" type="number" min="0" max="10" step="0.1" value="5" required></label><label>Tradeoff<textarea name="tradeoff" maxlength="300"></textarea></label><button class="primary">Add Option</button></form>${recordList(decisionItems("option"), (row) => `${row.data.name} — ${row.data.score}/10`, "decisionItems")}</section>
    <section class="card"><h2>Review matrix</h2><form id="matrix-form" class="stack"><label>Dimensions<input name="dimensions" maxlength="300" value="${escapeHtml(brief.matrix.dimensions || "")}" placeholder="Risk, Cost, Feasibility, Time"></label><label>Scoring notes<textarea name="notes" maxlength="600">${escapeHtml(brief.matrix.notes || "")}</textarea></label><button class="primary">Save Matrix</button></form></section>
  </div>`);
}

function decisionGovernanceView() {
  const brief = decisionBrief();
  return matterShell(`<section class="card"><h2>Decision and governance</h2><form id="governance-form" class="stack"><label>Decision<textarea name="choice" maxlength="800" required>${escapeHtml(brief.decision.choice || brief.memo.choice || "")}</textarea></label><label>Rationale<textarea name="rationale" maxlength="1200">${escapeHtml(brief.decision.rationale || brief.memo.rationale || "")}</textarea></label><label>Accountability<textarea name="accountability" maxlength="700">${escapeHtml(brief.governance.accountability || "")}</textarea></label><label>Compliance considerations<textarea name="compliance" maxlength="700">${escapeHtml(brief.governance.compliance || "")}</textarea></label><label>Risk note<textarea name="riskNote" maxlength="700">${escapeHtml(brief.governance.riskNote || "")}</textarea></label><button class="primary">Save Decision and Governance</button></form></section>`);
}

function decisionOutcomeView() {
  const brief = decisionBrief();
  return matterShell(`<section class="card"><h2>Outcome review</h2><form id="outcome-form" class="stack"><label>Expected versus actual<textarea name="expectedVsActual" maxlength="700">${escapeHtml(brief.outcome.expectedVsActual || "")}</textarea></label><label>Lessons<textarea name="lessons" maxlength="700">${escapeHtml(brief.outcome.lessons || "")}</textarea></label><button class="primary">Save Outcome Review</button></form></section>`);
}

function packView() {
  const config = matterType(state.matter.type);
  const graph = state.graph;
  const brief = decisionBrief();
  const content = config.family === "decision"
    ? `<dl class="brief-grid"><div><dt>Context</dt><dd>${escapeHtml(brief.memo.context || "shared")}</dd></div><div><dt>Question</dt><dd>${escapeHtml(brief.memo.question || "Not framed")}</dd></div><div><dt>Decision</dt><dd>${escapeHtml(brief.decision.choice || brief.memo.choice || "Not recorded")}</dd></div><div><dt>Evidence</dt><dd>${decisionItems("evidence").length}</dd></div><div><dt>Hard constraints</dt><dd>${decisionItems("constraint").length}</dd></div><div><dt>Options</dt><dd>${decisionItems("option").length}</dd></div><div><dt>Risk</dt><dd>${escapeHtml(brief.governance.riskNote || "Not recorded")}</dd></div><div><dt>Lessons</dt><dd>${escapeHtml(brief.outcome.lessons || "Not reviewed")}</dd></div></dl>`
    : `<dl class="brief-grid"><div><dt>Suitability</dt><dd>${escapeHtml(state.matter.suitabilityState)}</dd></div><div><dt>Participants</dt><dd>${graph.participants.length}</dd></div><div><dt>Issues</dt><dd>${graph.issueNodes.length}</dd></div><div><dt>Sessions</dt><dd>${graph.sessions.length}</dd></div><div><dt>Open commitments</dt><dd>${graph.commitments.filter((row) => row.status !== "complete").length}</dd></div><div><dt>Follow-ups</dt><dd>${graph.followUps.length}</dd></div></dl>`;
  return matterShell(`<section class="card printable"><p class="eyebrow">${escapeHtml(config.pack || "Briefing Pack")}</p><h2>${escapeHtml(state.matter.title)}</h2>${content}<div class="form-actions no-print"><button class="primary" data-action="export-matter">Export JSON</button><button class="secondary" data-action="export-matter-zip">Export ZIP</button><button class="secondary" data-action="export-markdown">Export Markdown</button><button class="secondary" data-action="print">Print</button></div></section>`);
}

function settingsView() {
  const legacy = state.pendingLegacy;
  return `<section class="page-header"><div><p class="eyebrow">Data control</p><h1>Settings</h1><p>Backups, migration, integrity, and app-scoped recovery.</p></div></section>
    <div class="settings-grid">
      <section class="card"><h2>Workspace backup</h2><p>Export a complete integrity-protected CommonGround backup.</p><div class="form-actions"><button class="primary" data-action="export-workspace">Export JSON</button><button class="secondary" data-action="export-workspace-zip">Export ZIP</button></div><label>Restore CommonGround backup<input id="bundle-file" type="file" accept=".json,.zip,application/json,application/zip"></label>${state.pendingBundle ? `<div class="preview"><strong>Validated ${escapeHtml(state.pendingBundle.bundleKind)} bundle</strong><button class="primary" data-action="commit-bundle">Import as a copy</button></div>` : ""}</section>
      <section class="card"><h2>LedgerSuite migration</h2><p>Legacy data is validated and copied atomically. The source remains untouched.</p>${legacy ? `<div class="preview"><strong>${legacy.alreadyMigrated ? "Already migrated" : "Ready to migrate"}</strong><p>${legacy.counts.workspaces} workspace(s), ${legacy.counts.cases} decision case(s).</p>${legacy.alreadyMigrated ? "" : '<button class="primary" data-action="commit-legacy">Migrate into CommonGround</button>'}</div>` : `<p class="muted">No same-origin LedgerSuite database detected.</p>`}<label>Import LedgerSuite JSON or ZIP<input id="legacy-file" type="file" accept=".json,.zip,application/json,application/zip"></label>${legacy?.source === "file" && !legacy.alreadyMigrated ? '<button class="primary" data-action="commit-legacy">Migrate staged file</button>' : ""}${legacy?.source === "indexeddb" ? `<details><summary>Delete legacy source after migration</summary><p>Download a complete source backup, then type <strong>DELETE LEDGER</strong>.</p><button class="secondary" data-action="export-legacy">Download Legacy Backup</button>${state.legacyBackupDownloaded ? '<p class="notice notice-success">Legacy backup downloaded for this session.</p>' : ""}<label>Confirmation<input id="legacy-delete-phrase" autocomplete="off"></label><button class="danger" data-action="delete-legacy">Delete legacy database</button></details>` : ""}</section>
      <section class="card"><h2>Integrity and cache</h2><p>Remove malformed or orphaned CommonGround records without touching valid data.</p><div class="form-actions"><button class="secondary" data-action="repair">Run Integrity Repair</button><button class="secondary" data-action="clear-cache">Clear CommonGround Cache</button></div></section>
      <section class="card danger-zone"><h2>Factory reset</h2><p>A valid workspace backup is downloaded first. Only CommonGround-owned storage, caches, and workers are cleared.</p><button class="danger" data-action="open-reset">Prepare Factory Reset</button></section>
    </div>`;
}

function modalView() {
  if (!state.modal) return "";
  const matterDelete = state.modal === "delete-matter";
  return `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal-card"><h2 id="modal-title">${matterDelete ? "Delete Matter" : "Factory Reset"}</h2><p>${matterDelete ? "Delete this matter and every linked record from this device." : "Download a backup, then permanently delete CommonGround data on this device."}</p><label>Type DELETE to confirm<input id="modal-phrase" autocomplete="off"></label><div class="form-actions"><button class="secondary" data-action="close-modal">Cancel</button><button class="danger" data-action="${matterDelete ? "confirm-delete-matter" : "confirm-reset"}">${matterDelete ? "Delete Matter" : "Back Up and Reset"}</button></div></section></div>`;
}

function routeView() {
  if (!state.workspace) return onboardingView();
  if (state.route === "dashboard") return dashboardView();
  if (state.route === "matters") return mattersView();
  if (state.route === "create-matter") return createMatterView();
  if (state.route === "settings") return settingsView();
  if (!state.matter || !state.graph) return mattersView();
  const config = matterType(state.matter.type);
  if (state.route === "matter-detail") return matterOverview();
  if (state.route === "pack") return packView();
  if (config.family === "decision") {
    return {
      "decision-framing": decisionFramingView,
      "decision-evidence": decisionEvidenceView,
      "decision-options": decisionOptionsView,
      "decision-governance": decisionGovernanceView,
      "decision-outcome": decisionOutcomeView
    }[state.route]?.() || matterOverview();
  }
  if (state.matter.suitabilityState === "routed-out" && !["suitability", "matter-detail", "pack"].includes(state.route)) return suitabilityView();
  return {
    suitability: suitabilityView,
    intake: intakeView,
    "issue-map": issuesView,
    session: sessionsView,
    commitments: commitmentsView,
    "follow-up": followUpsView
  }[state.route]?.() || matterOverview();
}

function render() {
  if (!state.workspace) {
    root.innerHTML = routeView() + modalView();
  } else {
    root.innerHTML = `${header()}<main id="main-content" class="app-main" tabindex="-1">${noticeMarkup()}${routeView()}</main>${modalView()}<footer>CommonGround v${APP_VERSION} · Local-first · No accounts or telemetry</footer>`;
  }
  root.querySelector(".modal-card input")?.focus();
  document.documentElement.dataset.appReady = "true";
}

async function saveBrief(patch) {
  const current = decisionBrief();
  await put("decisionBriefs", {
    ...baseRecord("brief"),
    ...current,
    id: current.id || baseRecord("brief").id,
    matterId: state.matter.id,
    ...patch,
    updatedAt: nowIso()
  }, current.id ? { expectedRevision: Number(current.revision || 0) } : {});
}

async function handleSubmit(event) {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  if (form.id === "workspace-form") {
    const workspace = await put("workspaces", { ...baseRecord("ws"), name: text(data, "name", 120), owner: text(data, "owner", 120), settings: { defaultVisibility: "private" } });
    await refreshWorkspace(workspace.id);
    state.route = "dashboard";
    announce("Workspace created locally.", "success");
  } else if (form.id === "matter-form") {
    const type = text(data, "type", 60);
    const decision = matterType(type).family === "decision";
    const matter = await put("matters", { ...baseRecord("matter"), workspaceId: state.workspace.id, title: text(data, "title", 120), type, status: "draft", suitabilityState: decision ? "not-applicable" : "pending", currentPhase: decision ? "decision-framing" : "preparation" });
    await refreshWorkspace();
    await refreshMatter(matter.id);
    state.route = "matter-detail";
    announce("Matter created.", "success");
  } else if (form.id === "suitability-form") {
    const checklist = Object.fromEntries(["voluntary", "authority", "balanced", "safe"].map((name) => [name, data.get(name) === "on"]));
    const outcome = text(data, "outcome", 30);
    const rationale = text(data, "rationale", 1200);
    if (outcome === "suitable" && Object.values(checklist).some((value) => !value)) throw new Error("Suitable requires every safety and consent check.");
    if (outcome === "routed-out" && !rationale) throw new Error("Route-out requires rationale and referral notes.");
    await put("matters", { ...state.matter, suitabilityState: outcome, suitabilityChecklist: checklist, suitabilityRationale: rationale, status: outcome === "suitable" ? "active" : "closed", currentPhase: outcome === "suitable" ? "intake" : "route-out", updatedAt: nowIso() }, { expectedRevision: Number(state.matter.revision || 0) });
    announce(outcome === "suitable" ? "Matter is suitable to proceed." : "Matter routed out; facilitation steps are locked.", "success");
  } else if (form.id === "participant-form") {
    await put("participants", { ...baseRecord("participant"), matterId: state.matter.id, displayName: text(data, "displayName", 120), role: text(data, "role", 80) || "Participant", consent: { processConsent: data.get("consent") === "on", recordedAt: nowIso() }, visibility: "private" });
    announce("Participant added.", "success");
  } else if (form.id === "intake-form") {
    const current = state.graph.intakeRecords[0];
    await put("intakeRecords", { ...baseRecord("intake"), ...current, id: current?.id || baseRecord("intake").id, matterId: state.matter.id, participantId: "shared", source: "workspace", responses: { context: text(data, "context"), goals: text(data, "goals", 1200), concerns: text(data, "concerns", 1200) }, riskFlags: [], visibility: "private" }, current?.id ? { expectedRevision: Number(current.revision || 0) } : {});
    announce("Intake saved.", "success");
  } else if (form.id === "issue-form") {
    await put("issueNodes", { ...baseRecord("issue"), matterId: state.matter.id, label: text(data, "label", 120), priority: text(data, "priority", 20), notes: text(data, "notes", 1000), visibility: "private" });
    announce("Issue added.", "success");
  } else if (form.id === "session-form") {
    await put("sessions", { ...baseRecord("session"), matterId: state.matter.id, date: nowIso(), phase: state.matter.currentPhase, agenda: text(data, "agenda", 1200).split(/\r?\n/).map((item) => item.trim()).filter(Boolean), notes: text(data, "notes"), participantIds: state.graph.participants.map((row) => row.id), visibility: "private" });
    announce("Session logged.", "success");
  } else if (form.id === "commitment-form") {
    await put("commitments", { ...baseRecord("commitment"), matterId: state.matter.id, text: text(data, "text", 500), owner: text(data, "owner", 120), dueDate: text(data, "dueDate", 20), status: "open", visibility: "private" });
    announce("Commitment added.", "success");
  } else if (form.id === "followup-form") {
    await put("followUps", { ...baseRecord("followup"), matterId: state.matter.id, targetDate: text(data, "targetDate", 20), result: text(data, "result", 1000), status: "scheduled", visibility: "private" });
    announce("Follow-up scheduled.", "success");
  } else if (form.id === "decision-memo-form") {
    const current = decisionBrief();
    await saveBrief({ memo: { title: state.matter.title, context: ["personal", "professional", "shared"].includes(text(data, "context", 20)) ? text(data, "context", 20) : "shared", question: text(data, "question", 500), evidenceSummary: text(data, "evidenceSummary", 1200), assumptionSummary: text(data, "assumptionSummary", 1200), choice: text(data, "choice", 800), rationale: text(data, "rationale", 1200) }, decision: { ...current.decision, choice: text(data, "choice", 800), rationale: text(data, "rationale", 1200) } });
    announce("Decision memo saved.", "success");
  } else if (["evidence-form", "assumption-form", "constraint-form", "option-form"].includes(form.id)) {
    const kind = { "evidence-form": "evidence", "assumption-form": "assumption", "constraint-form": "constraint", "option-form": "option" }[form.id];
    const itemData = kind === "evidence"
      ? { kind: text(data, "kind", 40), citation: text(data, "citation", 140), notes: text(data, "notes", 500) }
      : kind === "assumption"
        ? { statement: text(data, "statement", 300), confidence: Math.max(0, Math.min(100, Number(data.get("confidence") || 0))), owner: "local" }
        : kind === "constraint"
          ? { statement: text(data, "statement", 300), reason: text(data, "reason", 300), hard: true }
          : { name: text(data, "name", 80), score: Math.max(0, Math.min(10, Number(data.get("score") || 0))), tradeoff: text(data, "tradeoff", 300) };
    await put("decisionItems", { ...baseRecord("decision-item"), matterId: state.matter.id, kind, data: itemData });
    announce(`${kind[0].toUpperCase()}${kind.slice(1)} added.`, "success");
  } else if (form.id === "matrix-form") {
    await saveBrief({ matrix: { dimensions: text(data, "dimensions", 300), notes: text(data, "notes", 600) } });
    announce("Review matrix saved.", "success");
  } else if (form.id === "governance-form") {
    const current = decisionBrief();
    await saveBrief({ decision: { choice: text(data, "choice", 800), rationale: text(data, "rationale", 1200), date: nowIso() }, governance: { accountability: text(data, "accountability", 700), compliance: text(data, "compliance", 700), riskNote: text(data, "riskNote", 700) }, memo: { ...current.memo, choice: text(data, "choice", 800), rationale: text(data, "rationale", 1200) } });
    announce("Decision and governance saved.", "success");
  } else if (form.id === "outcome-form") {
    await saveBrief({ outcome: { expectedVsActual: text(data, "expectedVsActual", 700), lessons: text(data, "lessons", 700) } });
    announce("Outcome review saved.", "success");
  }
  await refreshWorkspace();
  await refreshMatter();
  render();
}

async function setRoute(route) {
  const top = ["dashboard", "matters", "create-matter", "settings"];
  if (!top.includes(route) && !state.matter) route = "matters";
  if (state.matter && !top.includes(route)) {
    const allowed = matterRoutes(state.matter.type).map(([value]) => value);
    if (!allowed.includes(route)) route = "matter-detail";
  }
  state.route = route;
  render();
  root.querySelector("#main-content")?.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: "auto" });
}

async function exportMatter(zip = false) {
  const bundle = await createMatterBundle(state.matter.id);
  const textValue = JSON.stringify(bundle, null, 2);
  const stem = `commonground-${state.matter.id}-${Date.now()}`;
  if (zip) downloadBlob(`${stem}.zip`, createStoredZip("matter.json", textValue));
  else downloadJson(`${stem}.json`, bundle);
  await saveOptionalOpfs(`${stem}.json`, textValue);
  await put("exportArtifacts", { ...baseRecord("export"), matterId: state.matter.id, filename: `${stem}.${zip ? "zip" : "json"}`, format: zip ? "zip" : "json" });
  announce("Matter exported.", "success");
}

async function clearScopedRuntime() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => new URL(registration.scope).pathname.includes("/apps/commonground/")).map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("commonground-")).map((key) => caches.delete(key)));
  }
  for (const storage of [localStorage, sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith("cg.")) storage.removeItem(key);
    }
  }
  if (navigator.storage?.getDirectory) {
    try {
      const rootDirectory = await navigator.storage.getDirectory();
      await rootDirectory.removeEntry("commonground", { recursive: true });
    } catch (error) {
      if (error?.name !== "NotFoundError") throw error;
    }
  }
}

async function handleAction(action, button) {
  if (action === "delete-matter") state.modal = "delete-matter";
  else if (action === "open-reset") state.modal = "factory-reset";
  else if (action === "close-modal") state.modal = null;
  else if (action === "confirm-delete-matter") {
    if (root.querySelector("#modal-phrase")?.value !== "DELETE") throw new Error("Type DELETE exactly to confirm.");
    await deleteMatterGraph(state.matter.id);
    state.matter = null;
    state.graph = null;
    state.modal = null;
    state.route = "matters";
    await refreshWorkspace();
    announce("Matter deleted.", "success");
  } else if (action === "export-matter") await exportMatter(false);
  else if (action === "export-matter-zip") await exportMatter(true);
  else if (action === "export-markdown") {
    const markdown = matterMarkdown(state.graph);
    const filename = `commonground-${state.matter.id}-${Date.now()}.md`;
    downloadBlob(filename, new Blob([markdown], { type: "text/markdown" }));
    await saveOptionalOpfs(filename, markdown);
    announce("Markdown brief exported.", "success");
  } else if (action === "print") window.print();
  else if (action === "export-workspace" || action === "export-workspace-zip") {
    const backup = await downloadWorkspaceBackup(state.workspace.id, "commonground-backup", { download: action === "export-workspace" });
    if (action.endsWith("zip")) downloadBlob(`commonground-backup-${Date.now()}.zip`, createStoredZip("workspace.json", backup.text));
    announce("Workspace backup exported.", "success");
  } else if (action === "commit-bundle") {
    const result = await restoreBundle(state.pendingBundle);
    state.pendingBundle = null;
    await refreshWorkspace();
    announce(`Imported ${result.matters} matter(s) as a safe copy.`, "success");
  } else if (action === "commit-legacy") {
    const result = await commitLegacyMigration(state.pendingLegacy);
    state.pendingLegacy = await detectLegacyMigration();
    await refreshWorkspace();
    announce(`Migrated ${result.matters} LedgerSuite decision case(s).`, "success");
  } else if (action === "export-legacy") {
    const snapshot = await exportLegacyDatabaseSnapshot();
    downloadJson(`ledger-suite-source-backup-${Date.now()}.json`, snapshot);
    state.legacyBackupDownloaded = true;
    announce("Legacy LedgerSuite source backup downloaded.", "success");
  } else if (action === "delete-legacy") {
    if (!state.legacyBackupDownloaded) throw new Error("Download the legacy source backup before deletion.");
    if (root.querySelector("#legacy-delete-phrase")?.value !== "DELETE LEDGER") throw new Error("Type DELETE LEDGER exactly to confirm.");
    await deleteLegacyDatabase();
    state.pendingLegacy = null;
    announce("Legacy LedgerSuite database deleted.", "success");
  } else if (action === "repair") {
    const count = await repairIntegrity();
    await refreshWorkspace();
    await refreshMatter();
    announce(`Integrity repair complete. Removed ${count} invalid record(s).`, "success");
  } else if (action === "clear-cache") {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("commonground-")).map((key) => caches.delete(key)));
    }
    announce("CommonGround cache cleared.", "success");
  } else if (action === "activate-update") {
    const worker = state.updateRegistration?.waiting;
    if (!worker) throw new Error("The staged update is no longer available. Reload to check again.");
    state.activatingUpdate = true;
    worker.postMessage({ type: "SKIP_WAITING" });
  } else if (action === "confirm-reset") {
    if (root.querySelector("#modal-phrase")?.value !== "DELETE") throw new Error("Type DELETE exactly to confirm.");
    await downloadWorkspaceBackup(state.workspace.id, "commonground-pre-reset-backup");
    await clearScopedRuntime();
    await deleteCommonGroundDatabase();
    location.reload();
    return;
  }
  render();
}

async function handleClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  try {
    if (button.dataset.route) await setRoute(button.dataset.route);
    else if (button.dataset.openMatter) {
      await refreshMatter(button.dataset.openMatter);
      await setRoute("matter-detail");
    } else if (button.dataset.deleteStore && button.dataset.deleteId) {
      await remove(button.dataset.deleteStore, button.dataset.deleteId);
      await refreshMatter();
      announce("Record deleted.", "success");
      render();
    } else if (button.dataset.action) await handleAction(button.dataset.action, button);
  } catch (error) {
    announce(error instanceof Error ? error.message : "Action failed.", "error");
    render();
  }
}

async function handleChange(event) {
  const input = event.target;
  if (input.id === "workspace-switcher") {
    state.matter = null;
    state.graph = null;
    state.route = "dashboard";
    await refreshWorkspace(input.value);
    announce(`Opened ${state.workspace.name}.`, "success");
    render();
    return;
  }
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (input.id === "bundle-file") {
      state.pendingBundle = await parseBundleFile(file);
      announce("CommonGround backup validated and staged.", "success");
    } else if (input.id === "legacy-file") {
      const snapshot = await parseLegacyFile(file);
      state.pendingLegacy = await prepareLegacyMigration(snapshot, "file");
      announce("LedgerSuite snapshot validated and staged.", "success");
    }
  } catch (error) {
    if (input.id === "bundle-file") state.pendingBundle = null;
    else state.pendingLegacy = null;
    announce(error instanceof Error ? error.message : "Import failed.", "error");
  }
  input.value = "";
  render();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  try {
    const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    const stageUpdate = () => {
      if (!registration.waiting || !navigator.serviceWorker.controller) return;
      state.updateRegistration = registration;
      announce("A CommonGround update is ready and will apply only when you choose.", "info");
      render();
    };
    stageUpdate();
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed") stageUpdate();
      });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if ((wasControlled || state.activatingUpdate) && !reloading) {
        reloading = true;
        location.reload();
      }
    });
  } catch {
    announce("Offline installation is unavailable; local data features still work.", "warning");
  }
}

async function start() {
  root.addEventListener("submit", (event) => handleSubmit(event).catch((error) => {
    announce(error instanceof Error ? error.message : "Save failed.", "error");
    render();
  }));
  root.addEventListener("click", handleClick);
  root.addEventListener("change", handleChange);
  try {
    await refreshWorkspace();
    state.pendingLegacy = await detectLegacyMigration();
    if (state.pendingLegacy && !state.pendingLegacy.alreadyMigrated) announce("LedgerSuite data is available for guided migration.", "info");
    if (new URLSearchParams(location.search).get("migrate") === "ledger-suite") state.route = "settings";
    render();
    await registerServiceWorker();
  } catch (error) {
    root.innerHTML = `<main class="center-shell"><section class="card"><h1>CommonGround could not start</h1><p>${escapeHtml(error instanceof Error ? error.message : "Unknown storage error")}</p><p>Close other tabs and reload. Your local data has not been changed.</p></section></main>`;
  }
}

start();
