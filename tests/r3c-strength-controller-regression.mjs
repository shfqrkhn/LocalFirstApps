import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EXERCISES } from "../apps/flexx-files/js/config.js";
import { createStrengthControllerState, selectHistoryWindow, selectTodaySurface, STRENGTH_CONTROLLER_STATE_VERSION } from "../apps/flexx-files/controller/state.js";
import { createStrengthTimer, STRENGTH_TIMER_VERSION } from "../apps/flexx-files/controller/timer.js";
import { createStrengthModal, STRENGTH_MODAL_VERSION } from "../apps/flexx-files/controller/modal.js";
import { createStrengthCommands, STRENGTH_COMMANDS_VERSION } from "../apps/flexx-files/controller/commands.js";
import { bindStrengthCompatibilityHandlers, bindStrengthStorageEvents, STRENGTH_BINDINGS_VERSION, STRENGTH_COMPATIBILITY_HANDLERS } from "../apps/flexx-files/controller/bindings.js";
import { createStrengthViews, STRENGTH_VIEWS_VERSION } from "../apps/flexx-files/controller/views.js";
import { I18n } from "../apps/flexx-files/js/i18n.js";

assert.deepEqual([
  STRENGTH_CONTROLLER_STATE_VERSION, STRENGTH_TIMER_VERSION, STRENGTH_MODAL_VERSION,
  STRENGTH_COMMANDS_VERSION, STRENGTH_BINDINGS_VERSION, STRENGTH_VIEWS_VERSION
], Array(6).fill("1.0.0"));

const state = createStrengthControllerState({ historyLimit: 20 });
assert.equal(selectTodaySurface(state), "recovery");
for (const view of ["today", "history", "progress", "settings", "protocol"]) assert.equal(state.setView(view), view);
assert.throws(() => state.setView("foreign"), /Unknown Strength view/);
const draft = { id: "draft", recoveryStatus: "yellow", exercises: [] };
state.restoreDraft(draft);
assert.deepEqual(state.snapshot(), { view: "protocol", phase: "lifting", recovery: "yellow", activeSession: draft, historyLimit: 20, forceRestSkip: false });
for (const phase of ["warmup", "lifting", "cardio", "decompress"]) {
  state.setPhase(phase);
  assert.equal(selectTodaySurface(state), phase);
}
assert.throws(() => state.setPhase("foreign"), /Unknown Strength phase/);
state.skipRest();
state.extendHistoryLimit();
assert.equal(state.historyLimit, 40);
state.completeSession();
assert.deepEqual({ view: state.view, phase: state.phase, recovery: state.recovery }, { view: "history", phase: null, recovery: null });
assert.equal(state.activeSession, null);
assert.equal(state.forceRestSkip, false);
assert.deepEqual(selectHistoryWindow([1, 2, 3, 4], 2), { sessions: [4, 3], shown: 2, remaining: 2, hasMore: true });

const timerElements = new Map([
  ["timer-dock", { classList: { active: false, add() { this.active = true; }, remove() { this.active = false; } } }],
  ["timer-val", { textContent: "" }]
]);
let clock = 1_000;
let intervalCallback;
let cleared = 0;
let completed = 0;
const timer = createStrengthTimer({
  defaultSeconds: 90,
  now: () => clock,
  setIntervalFn(callback) { intervalCallback = callback; return 7; },
  clearIntervalFn(id) { assert.equal(id, 7); cleared++; },
  getElementById: id => timerElements.get(id),
  onComplete() { completed++; }
});
assert.equal(timer.start(), true);
assert.equal(timerElements.get("timer-val").textContent, "1:30");
clock += 29_001;
intervalCallback();
assert.equal(timerElements.get("timer-val").textContent, "1:01");
clock += 61_000;
intervalCallback();
assert.equal(completed, 1);
assert.equal(cleared, 1);
assert.equal(timerElements.get("timer-val").textContent, "1:30");
assert.equal(timerElements.get("timer-dock").classList.active, false);
let timerError = "";
assert.equal(createStrengthTimer({ defaultSeconds: 90, getElementById: () => null, onError: message => { timerError = message; } }).start(), false);
assert.equal(timerError, "Timer dock element not found");

const modalElements = new Map();
const previousFocus = { focused: false, focus() { this.focused = true; } };
const modalDocument = {
  activeElement: previousFocus,
  getElementById(id) { return modalElements.get(id); },
  createElement() {
    return { className: "", innerText: "", attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, focus() { this.focused = true; } };
  }
};
const layer = { classList: { add() {}, remove() {} }, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } };
const actions = { innerHTML: "", children: [], appendChild(child) { this.children.push(child); } };
modalElements.set("modal-layer", layer);
modalElements.set("modal-title", {});
modalElements.set("modal-body", {});
modalElements.set("modal-actions", actions);
const modal = createStrengthModal({ documentRef: modalDocument });
const confirmation = modal.show({ type: "confirm", title: "Confirm", text: "Body", danger: true, okText: "Proceed" });
assert.equal(actions.children.length, 2);
assert.equal(actions.children[1].className, "btn-modal btn-danger");
assert.equal(actions.children[1].attributes["aria-label"], "Proceed and close dialog");
actions.children[0].onclick();
assert.equal(await confirmation, false);
assert.equal(previousFocus.focused, true);
const missingConfirm = await createStrengthModal({ documentRef: { activeElement: null, getElementById: () => null } }).show({ type: "confirm", text: "Fallback" });
assert.equal(missingConfirm, false);

const elements = new Map();
const makeElement = (id, values = {}) => {
  const element = {
    id, value: "", checked: false, textContent: "", href: "", rel: "", removed: false,
    classList: { toggle() { return true; } },
    setAttribute(key, value) { this[key] = value; },
    querySelectorAll() { return []; },
    insertAdjacentHTML(_position, html) { this.appended = (this.appended || "") + html; },
    remove() { this.removed = true; }, focus() { this.focused = true; },
    ...values
  };
  elements.set(id, element);
  return element;
};
const commandDocument = {
  getElementById: id => elements.get(id) || null,
  querySelectorAll: selector => selector === "summary" ? [makeElement("summary")] : []
};
const savedDrafts = [];
let sessions = [];
let deleteId;
let resetCount = 0;
const storage = {
  KEYS: { SESSIONS: "flexx_sessions_v3" },
  getSessions: () => sessions,
  saveDraft: value => savedDrafts.push(value),
  saveSession: value => ({ ...value, sessionNumber: 1, weekNumber: 1, totalVolume: 0 }),
  deleteSession: id => { deleteId = id; },
  flushDraft() {}, flushPersistence() {}, exportData() {}, reset() { resetCount++; },
  validateImport: () => ({ valid: false, error: "invalid" }),
  applyImport() {}
};
const commandState = createStrengthControllerState({ historyLimit: 20 });
const calls = { render: 0, timerStart: [], timerStop: 0, success: 0, light: 0, heavy: 0, announce: [], modal: [] };
let modalAnswers = [];
const commandModal = { async show(options) { calls.modal.push(options); return modalAnswers.length ? modalAnswers.shift() : true; } };
const inert = { mark() {}, measure() { return 1; }, track() {}, info() {}, warn() {}, error() {}, debug() {} };
const commands = createStrengthCommands({
  state: commandState,
  render: () => { calls.render++; },
  timer: { start: value => calls.timerStart.push(value), stop: () => { calls.timerStop++; } },
  modal: commandModal,
  haptics: { success: () => { calls.success++; }, light: () => { calls.light++; }, heavy: () => { calls.heavy++; } },
  logger: inert, metrics: inert, analytics: inert,
  screenReader: { announce: (...args) => calls.announce.push(args) },
  i18n: { t: key => key }, storage, documentRef: commandDocument,
  navigatorRef: {}, locationRef: { href: "http://localhost/apps/flexx-files/" },
  createId: () => "session-id", nowIso: () => "2026-01-01T00:00:00.000Z",
  generateSessionCard: value => `<article>${value.id}</article>`, clearCaches: async () => 0
});
modalAnswers = [false];
await commands.setRec("red");
assert.equal(commandState.activeSession, null);
await commands.setRec("green");
assert.equal(commandState.phase, "warmup");
assert.equal(commandState.activeSession.id, "session-id");
const warmupId = commandState.activeSession.warmup[0].id;
makeElement(`w-${warmupId}`, { checked: true });
commands.updateWarmup(warmupId);
assert.equal(commandState.activeSession.warmup[0].completed, true);
await commands.nextPhase("lifting");
assert.equal(commandState.activeSession.exercises.length, EXERCISES.length);
const exercise = commandState.activeSession.exercises[0];
makeElement(`w-${exercise.id}`, { value: "100" });
makeElement(`pl-${exercise.id}`);
commands.modW(exercise.id, 2.5);
assert.equal(exercise.weight, 102.5);
assert.match(elements.get(`pl-${exercise.id}`).textContent, /side/);
makeElement(`s-${exercise.id}-0`);
makeElement(`card-${exercise.id}`, { querySelectorAll: () => [{}] });
commands.togS(exercise.id, 0, 3);
assert.equal(exercise.setsCompleted, 1);
assert.equal(calls.timerStart.length, 1);
makeElement(`alt-${exercise.id}`, { value: "Barbell RDL" });
makeElement(`vid-${exercise.id}`);
makeElement(`name-${exercise.id}`);
makeElement(`last-${exercise.id}`);
commands.swapAlt(exercise.id);
assert.equal(exercise.altName, "Barbell RDL");
assert.equal(exercise.usingAlternative, true);
await commands.nextPhase("cardio");
assert.equal(commandState.phase, "cardio");
makeElement("cardio-type", { value: "Assault Bike" });
makeElement("cardio-done", { checked: true });
makeElement("cardio-vid");
commands.updateCardio();
commands.swapCardioLink();
assert.equal(commandState.activeSession.cardio.completed, true);
commands.startCardio();
assert.equal(calls.timerStart.at(-1), 300);
await commands.nextPhase("decompress");
assert.equal(commandState.activeSession.decompress.length > 0, true);
commands.skipTimer();
assert.equal(calls.heavy, 1);
commands.skipRest();
assert.equal(commandState.forceRestSkip, true);
commands.viewProtocol();
assert.equal(commandState.view, "protocol");
commands.closeProtocol();
assert.equal(commandState.view, "settings");
modalAnswers = [false];
await commands.del("cancelled");
assert.equal(deleteId, undefined);
modalAnswers = [true];
await commands.del("delete-me");
assert.equal(deleteId, "delete-me");
modalAnswers = [false];
await commands.wipe();
assert.equal(resetCount, 0);
const oversized = { files: [{ size: 11 * 1024 * 1024 }], value: "selected" };
commands.imp(oversized);
assert.equal(oversized.value, "");
assert.equal(calls.modal.at(-1).text, "File too large. Maximum size is 10MB.");

sessions = Array.from({ length: 45 }, (_, index) => ({ id: `history-${index}` }));
makeElement("history-list");
makeElement("load-more-btn");
commandState.resetHistoryLimit(20);
commands.loadMoreHistory();
assert.match(elements.get("history-list").appended, /history-24/);
assert.equal(commandState.historyLimit, 40);

const target = {};
const allHandlers = { ...commands, drawChart() {} };
const unbind = bindStrengthCompatibilityHandlers(target, allHandlers);
assert.deepEqual(STRENGTH_COMPATIBILITY_HANDLERS.filter(name => typeof target[name] !== "function"), []);
unbind();
assert.deepEqual(STRENGTH_COMPATIBILITY_HANDLERS.filter(name => name in target), []);
assert.throws(() => bindStrengthCompatibilityHandlers({}, {}), /Missing Strength compatibility handler/);

const storageListeners = new Map();
let invalidations = 0;
let storageRenders = 0;
const storageWindow = { addEventListener(name, listener) { storageListeners.set(name, listener); }, removeEventListener() {} };
const storageState = createStrengthControllerState();
storageState.setView("history");
const cacheStorage = { KEYS: { SESSIONS: "flexx_sessions_v3" }, invalidateSessionCache() { invalidations++; } };
globalThis.localStorage = {};
bindStrengthStorageEvents({ windowRef: storageWindow, storage: cacheStorage, state: storageState, render: () => { storageRenders++; } });
storageListeners.get("storage")({ storageArea: globalThis.localStorage, key: "other_app_data" });
assert.deepEqual([invalidations, storageRenders], [0, 0]);
storageListeners.get("storage")({ storageArea: globalThis.localStorage, key: "flexx_sessions_v3" });
assert.deepEqual([invalidations, storageRenders], [1, 1]);
storageState.activeSession = { id: "active" };
storageListeners.get("storage")({ storageArea: globalThis.localStorage, key: "flexx_sessions_v3" });
assert.deepEqual([invalidations, storageRenders], [2, 1], "active workout is never rerendered by another tab");

const viewState = createStrengthControllerState();
const main = makeElement("main-content", { innerHTML: "", className: "", focus() {}, querySelector: () => null });
const chart = makeElement("chart-area", { clientWidth: 300 });
const viewDocument = {
  getElementById: id => id === "main-content" ? main : id === "chart-area" ? chart : null,
  querySelectorAll: () => [],
  createElement: () => ({ innerHTML: "", firstElementChild: {} })
};
const viewStorage = {
  getSessions: () => sessions,
  getUsage: () => ({ percent: 0, bytes: 0, limit: 5 * 1024 * 1024 }),
  exportData() {}
};
const views = createStrengthViews({
  state: viewState, modal: commandModal, pwaState: { registration: null, health: null }, logger: inert,
  screenReader: { announce() {} }, storage: viewStorage,
  readiness: { canStartWorkout: () => ({ valid: true, isFirst: true }) },
  documentRef: viewDocument, windowRef: { loadMoreHistory() {}, drawChart() {} }, setTimeoutFn() {}
});
views.render();
assert.match(main.innerHTML, /How do you feel\?/);
viewState.beginSession("green", { recoveryStatus: "green", warmup: [], exercises: [], cardio: null, decompress: [] });
for (const [phase, expected] of [["warmup", /Warmup/], ["lifting", /Trap Bar Deadlift/], ["cardio", /Assault Bike/], ["decompress", /Dead Hang/]]) {
  viewState.setPhase(phase);
  views.render();
  assert.match(main.innerHTML, expected, `render ${phase}`);
}
viewState.setView("protocol");
views.render();
assert.match(main.innerHTML, /58 Minutes/);
sessions = [
  { date: "2026-01-01T00:00:00.000Z", exercises: [{ id: "hinge", weight: 100 }] },
  { date: "2026-01-02T00:00:00.000Z", exercises: [{ id: "hinge", weight: 105 }] }
];
views.drawChart("hinge");
assert.match(chart.innerHTML, /<svg/);
assert.doesNotMatch(chart.innerHTML, /NaN|Infinity/);

const appSource = await readFile(resolve("apps/flexx-files/js/app.js"), "utf8");
const shell = JSON.parse(await readFile(resolve("apps/flexx-files/pwa-shell.json"), "utf8"));
assert.match(appSource, /createStrengthControllerState/);
assert.match(appSource, /createStrengthCommands/);
assert.match(appSource, /createStrengthViews/);
assert.match(appSource, /createStrengthTimer/);
assert.match(appSource, /bindStrengthCompatibilityHandlers/);
assert.doesNotMatch(appSource, /window\.[A-Za-z_$][\w$]*\s*=/);
assert.ok(appSource.split(/\r?\n/).length < 300, "composition root should stay below 300 physical lines");
const shellAssets = new Map(shell.assets.map(asset => [asset.url, asset.sha256]));
for (const name of ["state", "timer", "modal", "views", "commands", "bindings"]) {
  assert.match(shellAssets.get(`./controller/${name}.js`) || "", /^[a-f0-9]{64}$/, `offline shell missing controller/${name}.js`);
}

console.log("R3C Strength state, modal, timer, command, binding, render, chart, and storage-event regression passed.");
