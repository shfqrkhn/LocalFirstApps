import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EXERCISES } from "../apps/flexx-files/js/config.js";
import { createStrengthCalculator } from "../apps/flexx-files/strength/calculations.js";
import { evaluateWorkoutReadiness } from "../apps/flexx-files/strength/readiness.js";
import { buildStrengthBackup, validateStrengthDraft } from "../apps/flexx-files/strength/recovery.js";
import { STRENGTH_COMPATIBILITY_HANDLERS } from "../apps/flexx-files/controller/bindings.js";

const store = new Map();
globalThis.localStorage = {
  get length() { return store.size; },
  key: index => [...store.keys()][index] ?? null,
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem(key, value) { store.set(key, String(value)); this[key] = String(value); },
  removeItem(key) { store.delete(key); delete this[key]; }
};
globalThis.window = globalThis;
window.location = { pathname: "/apps/flexx-files/", href: "http://localhost/apps/flexx-files/", reload() {} };
window.requestIdleCallback = callback => { callback(); return 1; };
window.cancelIdleCallback = () => {};

const adapter = await import("../apps/flexx-files/strength-adapter.js");
const core = await import("../apps/flexx-files/js/core.js");
const fixture = JSON.parse(await readFile(resolve("tests/fixtures/lifeos-strength-preview-v1.json"), "utf8"));
const appSource = await readFile(resolve("apps/flexx-files/js/app.js"), "utf8");
const coreSource = await readFile(resolve("apps/flexx-files/js/core.js"), "utf8");
const healthShellSource = await readFile(resolve("apps/healthos/modules/lifeos-shell.js"), "utf8");
const healthAppSource = await readFile(resolve("apps/healthos/app.js"), "utf8");
const noodleSource = await readFile(resolve("apps/noodle-nudge/index.html"), "utf8");
const pwaShell = JSON.parse(await readFile(resolve("apps/flexx-files/pwa-shell.json"), "utf8"));

assert.deepEqual([
  adapter.STRENGTH_ADAPTER_VERSION,
  adapter.STRENGTH_CALCULATIONS_VERSION,
  adapter.STRENGTH_READINESS_VERSION,
  adapter.STRENGTH_RECOVERY_VERSION,
  adapter.STRENGTH_STORAGE_CONTRACT_VERSION,
  adapter.LIFEOS_STRENGTH_PREVIEW_VERSION
], Array(6).fill("1.0.0"));
assert.equal(adapter.validateStrengthStorageContract(), true);
assert.deepEqual(adapter.STRENGTH_STORAGE_INVENTORY.map(({ key }) => key), [
  "flexx_sessions_v3", "flexx_prefs", "flexx_migration_version", "flexx_backup_snapshot",
  "flexx_draft_session", "flexx_audit_log", "flexx_errors"
]);
const snapshot = adapter.createStrengthFoundationSnapshot();
assert.deepEqual(snapshot.boundaries, {
  route: "apps/flexx-files/", canonicalUi: "flexx-files", lifeOsDataAccess: "none",
  migration: false, dualWrite: false, mutationFromPreview: false
});
assert.equal(snapshot.storage.prefix, "flexx_");
assert.equal(snapshot.storage.schemaVersion, "v3");
assert.equal(adapter.StrengthStorage, core.Storage);
assert.equal(adapter.StrengthCalculator, core.Calculator);
assert.equal(adapter.StrengthReadiness, core.Validator);

const calculator = createStrengthCalculator();
for (const [weight, expected] of fixture.plateCases) assert.equal(calculator.getPlateLoad(weight), expected, `plate load ${weight}`);

let paritySeed = 123456789;
const parityRandom = () => ((paritySeed = (Math.imul(paritySeed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const parityCalculator = createStrengthCalculator();
const parityOutput = [];
for (let caseIndex = 0; caseIndex < 250; caseIndex++) {
  const sessions = [];
  const count = Math.floor(parityRandom() * 28);
  for (let index = 0; index < count; index++) {
    const recoveryStatus = ["green", "yellow", "red"][Math.floor(parityRandom() * 3)];
    const exercises = EXERCISES.slice(0, 3).map((config, exerciseIndex) => ({
      id: config.id,
      name: config.name,
      weight: 45 + Math.floor(parityRandom() * 30) * 2.5,
      completed: parityRandom() > 0.25,
      skipped: parityRandom() < 0.08,
      usingAlternative: exerciseIndex === 0 && parityRandom() < 0.2,
      altName: exerciseIndex === 0 ? "Barbell RDL" : ""
    }));
    sessions.push({ sessionNumber: index + 1, recoveryStatus, exercises });
  }
  const row = { d: parityCalculator.isDeloadWeek(sessions), x: [] };
  for (const id of ["hinge", "knee", "push_horz", "Barbell RDL"]) {
    for (const recoveryStatus of ["green", "yellow", "red"]) {
      row.x.push([
        id,
        recoveryStatus,
        parityCalculator.getRecommendedWeight(id, recoveryStatus, sessions),
        parityCalculator.getBaseRecommendation(id, sessions),
        parityCalculator.detectStall(id, sessions),
        parityCalculator.getLastExercise(id, sessions),
        parityCalculator.getLastCompletedExercise(id, sessions),
        parityCalculator.getLastNonDeloadExercise(id, sessions),
        parityCalculator.getLastGreenExercise(id, sessions),
        parityCalculator.getLastRecoveryStatus(id, sessions)
      ]);
    }
  }
  parityOutput.push(row);
}
const parityPlates = [];
for (let weight = -20; weight <= 500; weight += 0.5) parityPlates.push([weight, parityCalculator.getPlateLoad(weight)]);
assert.equal(
  createHash("sha256").update(JSON.stringify({ output: parityOutput, plates: parityPlates })).digest("hex"),
  "113865a0eb9b4291900bccb2a648d8ddb548c4aed354101267c539fcb6032ccb",
  "all public progression lookups and plate outputs must match the pre-R3B characterization hash"
);

const exercise = (weight, completed, extra = {}) => ({ id: "hinge", name: "Hinge", weight, completed, skipped: false, ...extra });
const session = (sessionNumber, recoveryStatus, item) => ({ sessionNumber, recoveryStatus, exercises: [item] });
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "green", []), 0);
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "green", [session(1, "green", exercise(100, true))]), 105);
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "yellow", [session(1, "green", exercise(100, true))]), 95);
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "green", [session(1, "green", exercise(100, false))]), 100);
const stalled = [1, 2, 3].map(number => session(number, "green", exercise(100, false)));
assert.equal(createStrengthCalculator().detectStall("hinge", stalled), true);
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "green", stalled), 90);
const preDeload = Array.from({ length: 16 }, (_, index) => session(index + 1, "green", exercise(100, true)));
assert.equal(createStrengthCalculator().isDeloadWeek(preDeload), true);
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "green", preDeload), 100, "preserve the existing mid-week deload boundary");
const midDeload = [...preDeload, session(17, "green", exercise(60, true))];
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "green", midDeload), 60);
const postDeload = [...midDeload, session(18, "green", exercise(60, true))];
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "green", postDeload), 105);
const transient = [session(1, "green", exercise(100, true)), session(2, "yellow", exercise(90, true))];
assert.equal(createStrengthCalculator().getRecommendedWeight("hinge", "green", transient), 105);
const alternative = [session(1, "green", exercise(115, true, { id: "hinge-alt", usingAlternative: true, altName: "Barbell RDL" }))];
assert.equal(createStrengthCalculator().getLastCompletedExercise("Barbell RDL", alternative).weight, 115);

const now = Date.parse("2024-02-10T12:00:00.000Z");
assert.deepEqual(evaluateWorkoutReadiness([], { now }), { valid: true, isFirst: true });
const rest = evaluateWorkoutReadiness([{ date: "2024-02-10T00:00:00.000Z" }], { now });
assert.equal(rest.valid, false);
assert.equal(rest.hours, 12);
assert.equal(rest.nextAvailable.toISOString(), "2024-02-11T00:00:00.000Z");
assert.deepEqual(evaluateWorkoutReadiness([{ date: "2024-02-08T12:00:00.000Z" }], { now }), { valid: true });
assert.deepEqual(evaluateWorkoutReadiness([{ date: "2024-02-01T12:00:00.000Z" }], { now }), {
  valid: true, warning: true, days: 9, message: "Long gap since last workout"
});

const legacy = adapter.normalizeFlexxBackup(fixture.legacyBackup);
assert.equal(legacy.version, "legacy-array");
assert.equal(legacy.sessions.length, 1);
const current = adapter.normalizeFlexxBackup(fixture.currentBackup);
assert.equal(current.version, "3.9.75");
assert.deepEqual(adapter.createStrengthLifeOsPreview(fixture.currentBackup, { at: fixture.preview.generatedAt }), fixture.preview);
assert.equal(adapter.createStrengthLifeOsPreview(fixture.currentBackup, { at: fixture.preview.generatedAt }).mutationAllowed, false);
assert.deepEqual(buildStrengthBackup(current.sessions, { version: "3.9.76", exportDate: fixture.preview.generatedAt }), {
  version: "3.9.76", sessions: current.sessions, exportDate: fixture.preview.generatedAt
});
assert.deepEqual(buildStrengthBackup(current.sessions, { version: "3.9.76", type: "auto" }), {
  version: "3.9.76", sessions: current.sessions, type: "auto"
});
for (const hostile of ["{", "null", "{}", JSON.stringify({ sessions: [{}] })]) {
  assert.throws(() => adapter.normalizeFlexxBackup(hostile));
}
assert.equal(validateStrengthDraft({ bad: true }, () => ({ valid: false, errors: ["invalid"] })).valid, false);

store.clear();
localStorage.setItem("other_app_data", "keep");
localStorage.setItem("flexx_sessions_v3", JSON.stringify(fixture.legacyBackup));
const beforePreview = [...store.entries()];
adapter.createStrengthLifeOsPreview(fixture.currentBackup, { at: fixture.preview.generatedAt });
assert.deepEqual([...store.entries()], beforePreview, "preview must have no storage authority");

const originalSetItem = localStorage.setItem;
localStorage.setItem = (key, value) => {
  if (key === "flexx_sessions_v3") throw new DOMException("quota", "QuotaExceededError");
  originalSetItem.call(localStorage, key, value);
};
assert.throws(() => core.Storage.applyImport(current.sessions), /Failed to apply import data/);
assert.equal(store.get("flexx_sessions_v3"), JSON.stringify(fixture.legacyBackup));
assert.equal(store.get("other_app_data"), "keep");
localStorage.setItem = originalSetItem;

localStorage.setItem("flexx_draft_session", "{broken");
core.Storage._draftCache = null;
assert.equal(core.Storage.loadDraft(), null);
assert.equal(store.has("flexx_draft_session"), true, "unparseable draft remains recoverable as raw app-owned data");
localStorage.setItem("flexx_draft_session", JSON.stringify({ bad: true }));
core.Storage._draftCache = null;
assert.equal(core.Storage.loadDraft(), null);
assert.equal(store.has("flexx_draft_session"), false, "validated malformed drafts retain the existing discard behavior");
const draft = fixture.legacyBackup[0];
localStorage.setItem("flexx_draft_session", JSON.stringify(draft));
core.Storage._draftCache = null;
assert.deepEqual(core.Storage.loadDraft(), draft);
localStorage.setItem = (key, value) => {
  if (key === "flexx_draft_session") throw new DOMException("quota", "QuotaExceededError");
  originalSetItem.call(localStorage, key, value);
};
core.Storage._draftCache = draft;
assert.equal(core.Storage.flushDraft(), false);
assert.equal(core.Storage._draftCache, draft, "failed draft persistence keeps the recoverable in-memory draft");
localStorage.setItem = originalSetItem;
localStorage.setItem("flexx_owned_sentinel", "remove");
core.Storage.reset();
assert.equal(store.has("flexx_owned_sentinel"), false);
assert.equal(store.get("other_app_data"), "keep");

const expectedGlobals = [
  "updateWarmup", "updateCardio", "updateDecompress", "setRec", "modW", "togS", "swapAlt",
  "swapCardioLink", "nextPhase", "finish", "skipTimer", "skipRest", "startCardio", "loadMoreHistory",
  "viewProtocol", "closeProtocol", "del", "wipe", "imp", "drawChart"
];
assert.deepEqual(STRENGTH_COMPATIBILITY_HANDLERS, expectedGlobals, "global controller inventory changed without an explicit packet");
assert.match(appSource, /bindStrengthCompatibilityHandlers\(window,/);
assert.doesNotMatch(appSource, /window\.([A-Za-z_$][\w$]*)\s*=\s*/, "R3C must keep the legacy globals behind one explicit binding seam");
assert.match(appSource, /from ["']\.\.\/strength-adapter\.js["']/);
assert.doesNotMatch(appSource, /from ["']\.\/core\.js["']/);
assert.match(coreSource, /createStrengthCalculator/);
assert.doesNotMatch(coreSource, /getBaseRecommendation\(exerciseId, sessions\) \{/);
assert.match(healthShellSource, /foundation-ready-linked-canonical/);
assert.doesNotMatch(healthAppSource, /strength-adapter/);
assert.doesNotMatch(noodleSource, /strength-adapter/);

const shellAssets = new Map(pwaShell.assets.map(({ url, sha256 }) => [url, sha256]));
for (const url of [
  "./strength-adapter.js", "./strength/calculations.js", "./strength/readiness.js",
  "./strength/recovery.js", "./strength/storage-contract.js"
]) assert.match(shellAssets.get(url) || "", /^[a-f0-9]{64}$/, `Flexx offline shell missing ${url}`);

console.log("R3B Strength calculations, readiness, recovery, storage, preview, and isolation regression passed.");
