import {
  HEALTH_RECORD_TYPES,
  LIFE_STATES,
  createDailyStateRecord,
  createFocusSessionRecord,
  createHealthPackage,
  healthRecordsToTsDashCsv,
  healthStateGuidance,
  parseHealthPackageText
} from "../../shared/healthos.js";
import {
  FOCUS_MODES,
  applyFocusTimerAction,
  createBreakTimer,
  createFocusTimer,
  formatTimerDuration,
  plannedMs,
  reconcileFocusTimer
} from "../../shared/focus-timer.js";
import { splitRecordExtensions } from "../../shared/interchange.js";
import {
  activatePwaUpdate,
  clearOwnedPwaCaches,
  formatBytes,
  getPwaHealth,
  registerPwaAssurance
} from "../../shared/pwa-assurance.js";
import {
  HEALTHOS_PREFERENCES_KEY,
  applyHealthPackageAtomic,
  completeActiveTimer,
  createHealthBackup,
  deleteHealthDatabase,
  discardActiveTimer,
  getActiveTimer,
  getAllHealthReceipts,
  getAllHealthRecords,
  loadHealthPreferences,
  putHealthRecord,
  restoreHealthBackupAtomic,
  rollbackHealthReceipt,
  saveActiveTimer,
  saveHealthPreferences,
  validateHealthBackup
} from "./storage.js";

const root = document.querySelector("#app");
const liveStatus = document.querySelector("#app-status");
const runtimeChannel = "BroadcastChannel" in window ? new BroadcastChannel("healthos-runtime-v1") : null;
const state = {
  route: "focus",
  records: [],
  receipts: [],
  timer: null,
  preferences: loadHealthPreferences(),
  pendingExport: null,
  pendingCsv: null,
  pendingImport: null,
  pendingBackup: null,
  notice: null,
  externalChange: false,
  modal: null,
  updateRegistration: null,
  updateCompatible: true,
  pwaRegistration: null,
  pwaHealth: null
};

let tickHandle;
let wakeLock;
let completionNotifiedId;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function announce(message, tone = "info") {
  state.notice = { message, tone };
  if (liveStatus) liveStatus.textContent = message;
}

function downloadText(filename, content, type = "application/json") {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function scoreOptions(selected) {
  return ['<option value="">Not recorded</option>', ...[1, 2, 3, 4, 5].map((value) => `<option value="${value}"${Number(selected) === value ? " selected" : ""}>${value}</option>`)].join("");
}

function navMarkup() {
  return [["focus", "Focus"], ["daily", "Daily state"], ["history", "History"], ["transfer", "Transfer & recovery"]]
    .map(([route, label]) => `<button class="${state.route === route ? "active" : ""}" data-route="${route}"${state.route === route ? ' aria-current="page"' : ""}>${label}</button>`).join("");
}

function noticeMarkup() {
  const notices = [];
  if (state.notice) notices.push(`<div class="notice notice-${escapeHtml(state.notice.tone)}" role="status">${escapeHtml(state.notice.message)}</div>`);
  if (state.externalChange) notices.push('<div class="notice notice-warning" role="status">Another HealthOS tab changed the timer or records. Your current screen was not overwritten. <button class="secondary" data-action="reload-state">Reload current state</button></div>');
  if (state.updateRegistration) notices.push(state.updateCompatible
    ? '<div class="notice notice-update" role="status"><span>A verified HealthOS update is ready.</span><button class="secondary" data-action="activate-update">Reload to update</button></div>'
    : '<div class="notice notice-warning" role="status">A staged HealthOS shell is incompatible with this data schema and was not activated.</div>');
  return notices.join("");
}

function moduleCards() {
  return `<section class="module-grid" aria-label="HealthOS modules">
    <a class="module-card" href="../noodle-nudge/"><strong>Noodle Nudge</strong><small>Reflection and self-inquiry stays independently owned.</small></a>
    <a class="module-card" href="../flexx-files/"><strong>Flexx Files</strong><small>Strength, readiness, and progression stays independently owned.</small></a>
    <button class="module-card" data-route="focus"><strong>Focus timer</strong><small>Timestamp-reconciled local focus sessions.</small></button>
  </section>`;
}

function focusSetupView() {
  const latestDaily = state.records.find((record) => record.type === HEALTH_RECORD_TYPES.DAILY_STATE);
  const lifeState = latestDaily?.payload.life_state || "READY";
  return `${moduleCards()}
    <section class="grid">
      <form class="panel" id="focus-start-form">
        <p class="eyebrow">New session</p><h2>Choose a bounded focus mode</h2>
        <div class="form-grid">
          <label>Mode<select id="focus-mode">${Object.entries(FOCUS_MODES).map(([value, mode]) => `<option value="${value}">${escapeHtml(mode.label)}</option>`).join("")}</select></label>
          <label>Observed life state<select id="focus-life-state">${LIFE_STATES.map((value) => `<option value="${value}"${value === lifeState ? " selected" : ""}>${value}</option>`).join("")}</select></label>
          <label class="span-all">Intention<input id="focus-intention" maxlength="500" placeholder="What is the smallest useful outcome?"></label>
          <label>Custom focus minutes<input id="custom-focus" type="number" min="1" max="720" value="25"></label>
          <label>Custom break minutes<input id="custom-break" type="number" min="0" max="720" value="5"></label>
          <label>Energy before (1–5)<select id="energy-before">${scoreOptions(null)}</select></label>
        </div>
        <p id="focus-guidance" class="guidance${lifeState === "CRISIS" ? " crisis" : ""}">${escapeHtml(healthStateGuidance(lifeState))}</p>
        <p class="muted">HealthOS suggests; it does not diagnose, prescribe, or reward streaks.</p>
        <button class="primary" type="submit">Start focus</button>
      </form>
      ${capabilitiesView()}
    </section>`;
}

function activeTimerView() {
  const timer = state.timer;
  const view = reconcileFocusTimer(timer);
  const isReview = ["review", "cancelled"].includes(timer.status);
  if (isReview) return sessionReviewView(timer, view);
  const displayMs = view.remainingMs === null ? view.elapsedMs : view.remainingMs;
  const reached = view.complete && timer.segment === "focus";
  return `<section class="timer-shell" aria-labelledby="timer-heading">
    <p class="eyebrow">${timer.segment === "break" ? "Recovery break" : escapeHtml(FOCUS_MODES[timer.mode]?.label || timer.mode)}</p>
    <h1 id="timer-heading">${escapeHtml(timer.intention || (timer.segment === "break" ? "Pause without pressure" : "Focused work"))}</h1>
    <div id="timer-value" class="timer-value" role="timer" aria-label="${view.remainingMs === null ? "Elapsed" : "Remaining"} time">${formatTimerDuration(displayMs)}</div>
    <div class="timer-meta"><span class="badge">${escapeHtml(timer.status)}</span><span class="badge">${timer.interruptions} interruption(s)</span><span class="badge">${escapeHtml(timer.lifeState)}</span></div>
    ${view.clockAnomaly ? '<p class="clock-warning" role="alert">The device clock moved backward. Elapsed time is frozen at the last trusted value until you correct it or the clock catches up.</p>' : ""}
    ${view.timezoneChanged ? '<p class="clock-warning">The device timezone changed. Duration remains based on stored instants; the original timezone is retained.</p>' : ""}
    ${reached ? '<p class="notice notice-success" role="status">Target reached. Review and save explicitly; no session was written automatically.</p>' : ""}
    <div class="timer-actions">
      ${timer.status === "running" ? '<button class="secondary" data-action="pause-timer">Pause</button>' : '<button class="primary" data-action="resume-timer">Resume</button>'}
      ${timer.segment === "focus" ? '<button class="secondary" data-action="interrupt-timer">Mark interruption</button>' : ""}
      <button class="secondary" data-action="restart-timer">Restart segment</button>
      <button class="secondary" data-action="skip-timer">${timer.segment === "break" ? "Skip break" : "Finish and review"}</button>
      ${timer.segment === "focus" ? '<button class="quiet-danger" data-action="cancel-timer">Cancel and review</button>' : ""}
    </div>
  </section>
  <section class="grid" style="margin-top:1rem">
    <form class="panel" id="distraction-form"><h2>Distraction capture</h2><label>Note<input id="distraction-note" maxlength="1000" placeholder="Capture it without leaving the session"></label><button class="secondary" type="submit">Add distraction</button></form>
    <form class="panel" id="correction-form"><h2>Manual correction</h2><p>Use only when suspension or a clock change made elapsed time inaccurate.</p><label>Elapsed minutes<input id="corrected-minutes" type="number" min="0" max="720" step="0.1" value="${(view.elapsedMs / 60000).toFixed(1)}"></label><button class="secondary" type="submit">Apply correction</button></form>
  </section>`;
}

function sessionReviewView(timer, view) {
  if (timer.segment === "break") return `<section class="panel narrow"><p class="eyebrow">Break complete</p><h1>Return when ready.</h1><p>${formatTimerDuration(view.elapsedMs)} elapsed. Breaks do not create focus records.</p><button class="primary" data-action="complete-break">Complete break</button></section>`;
  return `<form class="panel narrow" id="session-review-form">
    <p class="eyebrow">Explicit review</p><h1>Save what actually happened.</h1>
    <p>Completed ${formatTimerDuration(view.elapsedMs)} with ${timer.interruptions} interruption(s). No record exists until you confirm.</p>
    <div class="form-grid">
      <label>Outcome<textarea id="session-outcome" maxlength="5000"></textarea></label>
      <label>Stopped reason<textarea id="stopped-reason" maxlength="2000">${timer.status === "cancelled" ? "Cancelled by user" : ""}</textarea></label>
      <label>Energy after (1–5)<select id="energy-after">${scoreOptions(null)}</select></label>
    </div>
    <div class="actions"><button class="primary" type="submit">Save focus session</button><button class="quiet-danger" type="button" data-action="discard-session">Discard without saving</button></div>
  </form>`;
}

function capabilitiesView() {
  const capability = {
    audio: Boolean(window.AudioContext || window.webkitAudioContext),
    vibration: typeof navigator.vibrate === "function",
    notifications: "Notification" in window,
    wakeLock: Boolean(navigator.wakeLock?.request)
  };
  const item = (key, label) => `<label class="check"><input id="cue-${key}" type="checkbox"${state.preferences[key] ? " checked" : ""}${capability[key] ? "" : " disabled"}><span>${label}<small>${capability[key] ? "Available; off until you opt in." : "Unavailable here; the visible timer remains the fallback."}</small></span></label>`;
  return `<section class="panel" aria-labelledby="cue-title"><h2 id="cue-title">Optional device cues</h2><p>Capability-detected and opt-in only. This browser timer is not a medical, emergency, or safety alarm.</p><div class="capability-grid">${item("audio", "Audible completion cue")}${item("vibration", "Vibration cue")}${item("notifications", "System notification")}${item("wakeLock", "Keep screen awake")}</div><button class="secondary" data-action="save-cues">Save cue choices</button></section>`;
}

function dailyView() {
  const record = state.records.find((item) => item.type === HEALTH_RECORD_TYPES.DAILY_STATE && item.payload.date === today());
  const value = record?.payload || {};
  return `<section class="page-header"><div><p class="eyebrow">Distinct observations</p><h1>Daily state</h1><p>These fields remain separate. HealthOS does not calculate a readiness, wellness, or productivity score.</p></div></section>
    <form class="panel" id="daily-state-form">
      <div class="form-grid">
        <label>Date<input id="daily-date" type="date" value="${escapeHtml(value.date || today())}" required></label>
        <label>Life state<select id="daily-life-state">${LIFE_STATES.map((item) => `<option value="${item}"${item === (value.life_state || "READY") ? " selected" : ""}>${item}</option>`).join("")}</select></label>
        ${[["mood", "Mood"], ["energy", "Energy"], ["sleep_quality", "Sleep quality"], ["stress", "Stress"], ["soreness", "Soreness"]].map(([id, label]) => `<label>${label} (1–5)<select id="daily-${id.replaceAll("_", "-")}">${scoreOptions(value[id])}</select></label>`).join("")}
        <label>Pain flags (comma-separated observations)<input id="daily-pain-flags" value="${escapeHtml((value.pain_flags || []).join(", "))}"></label>
        <label>Intended focus<textarea id="daily-intended-focus" maxlength="5000">${escapeHtml(value.intended_focus || "")}</textarea></label>
        <label>Recovery need<textarea id="daily-recovery-need" maxlength="5000">${escapeHtml(value.recovery_need || "")}</textarea></label>
        <label class="span-all">Notes<textarea id="daily-notes" maxlength="5000">${escapeHtml(value.notes || "")}</textarea></label>
      </div>
      <p id="daily-guidance" class="guidance${value.life_state === "CRISIS" ? " crisis" : ""}">${escapeHtml(healthStateGuidance(value.life_state || "READY"))}</p>
      <button class="primary" type="submit">Save daily state</button>
    </form>`;
}

function historyView() {
  return `<section class="page-header"><div><p class="eyebrow">Canonical local records</p><h1>History</h1><p>Source observations and session records stay typed, revisioned, and independently inspectable.</p></div></section>
    <section class="panel"><ul class="record-list">${state.records.length ? state.records.map((record) => `<li><strong>${escapeHtml(record.type.replace("healthos/", "").replaceAll("_", " "))}</strong><p>${escapeHtml(record.payload.date || record.payload.ended_at || record.updatedAt)} · revision ${record.revision}</p><small>${escapeHtml(record.id)}</small></li>`).join("") : "<li>No HealthOS records yet.</li>"}</ul></section>`;
}

function transferView() {
  const health = state.pwaHealth;
  const storageText = health?.estimateAvailable ? `${formatBytes(health.usage)} used of ${formatBytes(health.quota)} origin quota.` : "Browser storage estimate is unavailable; remaining quota and durability are unknown.";
  const shellText = health?.worker ? `Shell ${health.worker.shellVersion}; ${health.worker.currentComplete ? "current cache complete" : health.worker.recoveredFromPrevious ? "recovered from last-known-good cache" : "current cache incomplete"}.` : "Worker shell status is unavailable.";
  return `<section class="page-header"><div><p class="eyebrow">Explicit transfer</p><h1>Transfer & recovery</h1><p>Preview exact local content, confirm deliberately, and keep source apps canonical.</p></div></section>
    <div class="grid">
      <section class="panel"><h2>Portable HealthOS records</h2><div class="actions"><button class="secondary" data-action="prepare-export">Prepare JSON export</button><label>Choose portable JSON<input id="portable-import" type="file" accept=".json,.lfa.json,application/json"></label></div>${state.pendingExport ? `<h3>Exact export preview</h3><pre class="preview" tabindex="0">${escapeHtml(state.pendingExport)}</pre><button class="primary" data-action="download-export">Confirm download</button>` : ""}${state.pendingImport ? `<h3>Validated import preview</h3><pre class="preview" tabindex="0">${escapeHtml(state.pendingImport.exact)}</pre><div class="actions"><button class="primary" data-action="confirm-import">Confirm atomic import</button><button class="secondary" data-action="cancel-import">Cancel</button></div>` : ""}</section>
      <section class="panel"><h2>TS-Dash CSV</h2><p>Deterministic rows retain units, provenance, derivation labels, and the limit that correlation does not establish causation.</p><button class="secondary" data-action="prepare-csv">Prepare TS-Dash CSV</button>${state.pendingCsv ? `<pre class="preview" tabindex="0">${escapeHtml(state.pendingCsv)}</pre><button class="primary" data-action="download-csv">Confirm CSV download</button>` : ""}</section>
      <section class="panel"><h2>Complete backup and restore</h2><button class="secondary" data-action="download-backup">Download complete backup</button><label>Restore complete backup<input id="backup-import" type="file" accept=".json,.healthos-backup.json,application/json"></label>${state.pendingBackup ? `<pre class="preview" tabindex="0">${escapeHtml(state.pendingBackup.exact)}</pre><button class="primary" data-action="confirm-backup">Confirm complete restore</button>` : ""}</section>
      <section class="panel"><h2>Import receipts</h2><ul class="record-list">${state.receipts.length ? state.receipts.map((receipt) => `<li><strong>${escapeHtml(receipt.status)}</strong><small>${escapeHtml(receipt.idempotencyKey.slice(0, 16))}</small>${receipt.status === "applied" ? `<button class="secondary" data-action="rollback-import" data-receipt="${escapeHtml(receipt.id)}">Roll back imported records</button>` : ""}</li>`).join("") : "<li>No portable imports yet.</li>"}</ul></section>
      <section class="panel"><h2>Storage and offline health</h2><p>${escapeHtml(storageText)}</p><p>${escapeHtml(shellText)}</p><p>Health checks are read-only and never request persistence. Quota and eviction remain browser-controlled.</p><div class="actions"><button class="secondary" data-action="refresh-health">Refresh health</button><button class="secondary" data-action="open-clear-cache">Clear HealthOS cache</button></div></section>
      <section class="panel"><h2>Factory reset</h2><p>A complete integrity-protected backup downloads first. Only HealthOS storage, preferences, caches, and its exact worker scope are cleared.</p><button class="danger" data-action="open-reset">Prepare factory reset</button></section>
    </div>`;
}

function modalMarkup() {
  if (!state.modal) return "";
  if (state.modal === "reset") return '<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title">Factory reset HealthOS</h2><p>Download a complete backup, then delete only HealthOS-owned local state.</p><label>Type DELETE to confirm<input id="reset-phrase" autocomplete="off"></label><div class="actions"><button class="secondary" data-action="close-modal">Cancel</button><button class="danger" data-action="confirm-reset">Back up and reset</button></div></section></div>';
  return '<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><h2 id="modal-title">Clear HealthOS offline cache?</h2><p>Canonical HealthOS records are not changed. Reconnect before reloading to install the shell again.</p><div class="actions"><button class="secondary" data-action="close-modal">Cancel</button><button class="danger" data-action="confirm-clear-cache">Clear cache</button></div></section></div>';
}

function viewMarkup() {
  if (state.route === "daily") return dailyView();
  if (state.route === "history") return historyView();
  if (state.route === "transfer") return transferView();
  return state.timer ? activeTimerView() : focusSetupView();
}

function render() {
  root.innerHTML = `<header class="app-header"><div class="brand"><strong>HealthOS Focus</strong><small>Local observations, no pressure score</small></div><nav class="app-nav" aria-label="HealthOS">${navMarkup()}</nav></header><main id="main-content" class="app-main" tabindex="-1">${noticeMarkup()}${viewMarkup()}</main>${modalMarkup()}`;
  document.documentElement.dataset.appReady = "true";
  updateTimerDisplay();
}

async function refreshState() {
  [state.records, state.receipts, state.timer] = await Promise.all([getAllHealthRecords(), getAllHealthReceipts(), getActiveTimer()]);
  state.preferences = loadHealthPreferences();
  state.externalChange = false;
}

function broadcastChange(kind) {
  runtimeChannel?.postMessage({ type: "healthos-change", kind });
}

async function applyTimerAction(action) {
  const expectedRevision = state.timer.revision;
  const next = applyFocusTimerAction(state.timer, action);
  state.timer = await saveActiveTimer(next, { expectedRevision });
  broadcastChange("timer");
  announce(`Timer ${action.type} recorded.`, "success");
  if (["pause", "finish", "skip", "cancel"].includes(action.type)) await releaseWakeLock();
  if (action.type === "resume") await requestWakeLock();
  render();
}

async function requestWakeLock() {
  if (!state.preferences.wakeLock || !navigator.wakeLock?.request || document.visibilityState !== "visible") return;
  try { wakeLock = await navigator.wakeLock.request("screen"); }
  catch { announce("Screen wake lock is unavailable; the timestamp-reconciled timer remains active.", "warning"); }
}

async function releaseWakeLock() {
  try { await wakeLock?.release(); } catch {}
  wakeLock = null;
}

function beep() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  try {
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.08;
    oscillator.frequency.value = 660;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    oscillator.addEventListener("ended", () => context.close());
    return true;
  } catch { return false; }
}

function triggerCompletionCues() {
  if (!state.timer || completionNotifiedId === state.timer.id) return;
  completionNotifiedId = state.timer.id;
  const unavailable = [];
  if (state.preferences.audio && !beep()) unavailable.push("audio");
  if (state.preferences.vibration && !(typeof navigator.vibrate === "function" && navigator.vibrate([120, 80, 120]))) unavailable.push("vibration");
  if (state.preferences.notifications) {
    if ("Notification" in window && Notification.permission === "granted") new Notification("HealthOS focus target reached", { body: "Review the session in HealthOS before saving." });
    else unavailable.push("notification");
  }
  if (unavailable.length) announce(`${unavailable.join(", ")} cue unavailable; the visible timer is the fallback.`, "warning");
  if (liveStatus) liveStatus.textContent = "Focus target reached. Review before saving.";
}

function updateTimerDisplay() {
  if (!state.timer || ["review", "cancelled"].includes(state.timer.status)) return;
  const view = reconcileFocusTimer(state.timer);
  const element = document.querySelector("#timer-value");
  if (element) element.textContent = formatTimerDuration(view.remainingMs === null ? view.elapsedMs : view.remainingMs);
  if (view.complete) triggerCompletionCues();
}

async function clearExactHealthRuntime() {
  await clearOwnedPwaCaches("healthos-");
  if ("serviceWorker" in navigator) {
    const appScope = new URL("./", location.href).pathname;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => new URL(registration.scope).pathname === appScope).map((registration) => registration.unregister()));
  }
}

async function handleAction(action, button) {
  if (action === "reload-state") {
    await refreshState(); announce("Current HealthOS state reloaded.", "success");
  } else if (action === "pause-timer") await applyTimerAction({ type: "pause" });
  else if (action === "resume-timer") await applyTimerAction({ type: "resume" });
  else if (action === "interrupt-timer") await applyTimerAction({ type: "interrupt" });
  else if (action === "restart-timer") await applyTimerAction({ type: "restart" });
  else if (action === "skip-timer") {
    if (state.timer.segment === "break") {
      await discardActiveTimer({ expectedRevision: state.timer.revision }); state.timer = null; broadcastChange("timer"); announce("Break skipped; no focus record was changed.", "success");
    } else await applyTimerAction({ type: "skip" });
  } else if (action === "cancel-timer") await applyTimerAction({ type: "cancel" });
  else if (action === "complete-break") {
    await discardActiveTimer({ expectedRevision: state.timer.revision }); state.timer = null; broadcastChange("timer"); announce("Break complete.", "success");
  } else if (action === "discard-session") {
    await discardActiveTimer({ expectedRevision: state.timer.revision }); state.timer = null; broadcastChange("timer"); announce("Unsaved session discarded explicitly.", "success");
  } else if (action === "save-cues") {
    const preferences = Object.fromEntries(["audio", "vibration", "notifications", "wakeLock"].map((key) => [key, Boolean(document.querySelector(`#cue-${key}`)?.checked)]));
    if (preferences.notifications && "Notification" in window && Notification.permission === "default") preferences.notifications = (await Notification.requestPermission()) === "granted";
    saveHealthPreferences(preferences); state.preferences = preferences; await requestWakeLock(); announce("Optional cue choices saved locally.", "success");
  } else if (action === "prepare-export") {
    if (!state.records.length) throw new Error("Create or import a HealthOS record before exporting.");
    state.pendingExport = JSON.stringify(await createHealthPackage(state.records, { selection: { purpose: "explicit-user-export" } }), null, 2);
  } else if (action === "download-export") {
    downloadText(`healthos-portable-${Date.now()}.lfa.json`, state.pendingExport); announce("Portable HealthOS records downloaded.", "success");
  } else if (action === "cancel-import") state.pendingImport = null;
  else if (action === "confirm-import") {
    const receipt = await applyHealthPackageAtomic(state.pendingImport.value); state.pendingImport = null; await refreshState(); broadcastChange("records"); announce(`Imported ${receipt.createdIds.length} record(s) atomically.`, "success");
  } else if (action === "rollback-import") {
    await rollbackHealthReceipt(button.dataset.receipt); await refreshState(); broadcastChange("records"); announce("Imported records rolled back; replay protection remains.", "success");
  } else if (action === "prepare-csv") {
    if (!state.records.length) throw new Error("Create or import a HealthOS record before preparing TS-Dash CSV.");
    state.pendingCsv = healthRecordsToTsDashCsv(state.records);
  } else if (action === "download-csv") {
    downloadText(`healthos-tsdash-${Date.now()}.csv`, state.pendingCsv, "text/csv"); announce("TS-Dash-compatible CSV downloaded.", "success");
  } else if (action === "download-backup") {
    downloadText(`healthos-complete-backup-${Date.now()}.json`, JSON.stringify(await createHealthBackup(), null, 2)); announce("Complete HealthOS backup downloaded.", "success");
  } else if (action === "confirm-backup") {
    await restoreHealthBackupAtomic(state.pendingBackup.value); state.pendingBackup = null; await refreshState(); broadcastChange("records"); announce("Complete HealthOS backup restored atomically.", "success");
  } else if (action === "refresh-health") {
    state.pwaHealth = await getPwaHealth({ cachePrefix: "healthos-", registration: state.pwaRegistration }); announce("Read-only storage and shell health refreshed.", "success");
  } else if (action === "open-clear-cache") state.modal = "clear-cache";
  else if (action === "confirm-clear-cache") {
    const count = await clearOwnedPwaCaches("healthos-"); state.modal = null; announce(`Cleared ${count} HealthOS cache(s). Canonical records were unchanged.`, "success");
  } else if (action === "open-reset") state.modal = "reset";
  else if (action === "close-modal") state.modal = null;
  else if (action === "confirm-reset") {
    if (document.querySelector("#reset-phrase")?.value !== "DELETE") throw new Error("Type DELETE exactly to confirm.");
    downloadText(`healthos-pre-reset-backup-${Date.now()}.json`, JSON.stringify(await createHealthBackup(), null, 2));
    await releaseWakeLock(); await clearExactHealthRuntime(); await deleteHealthDatabase(); localStorage.removeItem(HEALTHOS_PREFERENCES_KEY); location.reload(); return;
  } else if (action === "activate-update") await activatePwaUpdate(state.updateRegistration, 1);
  render();
}

async function handleSubmit(event) {
  event.preventDefault();
  if (event.target.id === "focus-start-form") {
    const mode = document.querySelector("#focus-mode").value;
    const timer = createFocusTimer({
      mode,
      intention: document.querySelector("#focus-intention").value,
      lifeState: document.querySelector("#focus-life-state").value,
      customFocusMinutes: document.querySelector("#custom-focus").value,
      customBreakMinutes: document.querySelector("#custom-break").value
    });
    timer.energyBefore = document.querySelector("#energy-before").value || null;
    state.timer = await saveActiveTimer(timer); broadcastChange("timer"); await requestWakeLock(); announce("Focus timer started from a persisted timestamp.", "success");
  } else if (event.target.id === "distraction-form") {
    await applyTimerAction({ type: "distraction", note: document.querySelector("#distraction-note").value }); return;
  } else if (event.target.id === "correction-form") {
    await applyTimerAction({ type: "correct", minutes: document.querySelector("#corrected-minutes").value }); return;
  } else if (event.target.id === "daily-state-form") {
    const date = document.querySelector("#daily-date").value;
    const existing = state.records.find((record) => record.type === HEALTH_RECORD_TYPES.DAILY_STATE && record.payload.date === date && !record.importedAt);
    const input = {
      date,
      life_state: document.querySelector("#daily-life-state").value,
      mood: document.querySelector("#daily-mood").value,
      energy: document.querySelector("#daily-energy").value,
      sleep_quality: document.querySelector("#daily-sleep-quality").value,
      stress: document.querySelector("#daily-stress").value,
      soreness: document.querySelector("#daily-soreness").value,
      pain_flags: document.querySelector("#daily-pain-flags").value,
      intended_focus: document.querySelector("#daily-intended-focus").value,
      recovery_need: document.querySelector("#daily-recovery-need").value,
      notes: document.querySelector("#daily-notes").value
    };
    const record = await createDailyStateRecord(input, existing ? { id: existing.id, createdAt: existing.createdAt, revision: existing.revision, extensions: splitRecordExtensions(existing) } : {});
    await putHealthRecord(record, existing ? { expectedRevision: existing.revision } : {}); await refreshState(); broadcastChange("records"); announce("Daily observations saved without calculating a combined score.", "success");
  } else if (event.target.id === "session-review-form") {
    const timer = state.timer;
    const view = reconcileFocusTimer(timer);
    const endedAt = new Date().toISOString();
    const session = await createFocusSessionRecord({
      intention: timer.intention,
      mode: timer.mode,
      planned_minutes: (plannedMs(timer) || 0) / 60000,
      completed_minutes: Number((view.elapsedMs / 60000).toFixed(4)),
      interruptions: timer.interruptions,
      distraction_notes: timer.distractionNotes,
      outcome: document.querySelector("#session-outcome").value,
      energy_before: timer.energyBefore,
      energy_after: document.querySelector("#energy-after").value,
      stopped_reason: document.querySelector("#stopped-reason").value,
      started_at: timer.createdAt,
      ended_at: endedAt,
      life_state: timer.lifeState
    }, { id: `healthos-session-${timer.id}`, createdAt: timer.createdAt, updatedAt: endedAt, recordTimezone: timer.timezone });
    const nextTimer = timer.status === "cancelled" ? null : createBreakTimer(timer);
    const result = await completeActiveTimer(session, { expectedRevision: timer.revision, nextTimer });
    await refreshState(); broadcastChange("records"); announce(result.duplicate ? "Session was already saved; no duplicate was created." : "Focus session saved once.", "success");
  }
  render();
}

async function handleFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) throw new Error("HealthOS imports must not exceed 25 MB.");
  const exact = await file.text();
  if (input.id === "portable-import") state.pendingImport = { value: await parseHealthPackageText(exact), exact };
  else {
    let value;
    try { value = JSON.parse(exact); } catch { throw new Error("HealthOS backup is not valid JSON."); }
    await validateHealthBackup(value); state.pendingBackup = { value, exact };
  }
  announce("File validated. Review exact content before confirming.", "success");
  render();
}

root.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  try {
    if (button.dataset.route) { state.route = button.dataset.route; state.notice = null; render(); }
    else if (button.dataset.action) await handleAction(button.dataset.action, button);
  } catch (error) { announce(error instanceof Error ? error.message : "Action failed.", "error"); render(); }
});

root.addEventListener("submit", (event) => handleSubmit(event).catch((error) => { announce(error.message, "error"); render(); }));
root.addEventListener("change", (event) => {
  if (["portable-import", "backup-import"].includes(event.target.id)) handleFile(event.target).catch((error) => { announce(error.message, "error"); render(); });
  if (["focus-life-state", "daily-life-state"].includes(event.target.id)) {
    const target = document.querySelector(event.target.id === "focus-life-state" ? "#focus-guidance" : "#daily-guidance");
    if (target) { target.textContent = healthStateGuidance(event.target.value); target.classList.toggle("crisis", event.target.value === "CRISIS"); }
  }
});

runtimeChannel?.addEventListener("message", (event) => {
  if (event.data?.type !== "healthos-change") return;
  state.externalChange = true;
  announce("Another HealthOS tab changed local state. Reload before editing.", "warning");
  render();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { updateTimerDisplay(); requestWakeLock(); }
  else releaseWakeLock();
});

async function registerWorker() {
  const result = await registerPwaAssurance({
    appId: "healthos",
    scriptUrl: "./sw.js",
    scope: "./",
    currentDataSchema: 1,
    onUpdate: ({ registration, compatible }) => {
      state.updateRegistration = registration; state.updateCompatible = compatible;
      announce(compatible ? "A HealthOS update is ready for explicit activation." : "A staged HealthOS update is incompatible and remains inactive.", compatible ? "info" : "warning"); render();
    },
    onControllerChange: () => location.reload(),
    onError: () => announce("Offline installation is unavailable; canonical local records still work.", "warning")
  });
  state.pwaRegistration = result?.registration || null;
  state.pwaHealth = await getPwaHealth({ cachePrefix: "healthos-", registration: state.pwaRegistration });
}

async function start() {
  try {
    await refreshState();
    render();
    await registerWorker();
    render();
    tickHandle = setInterval(updateTimerDisplay, 1000);
  } catch (error) {
    root.innerHTML = `<main class="center-shell"><section class="panel narrow" role="alert"><h1>HealthOS could not start.</h1><p>${escapeHtml(error.message)}</p><p>No local data was deleted or uploaded.</p></section></main>`;
  }
}

window.addEventListener("beforeunload", () => { clearInterval(tickHandle); releaseWakeLock(); runtimeChannel?.close(); });
start();
