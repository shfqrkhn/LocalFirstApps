import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  NOODLE_ASSESSMENT_ORDER,
  NOODLE_APP_VERSION,
  NOODLE_CONFIG,
  NOODLE_DATA_SCHEMA_VERSION,
  NOODLE_SHELL_VERSION,
  createInitialNoodleState
} from "../apps/noodle-nudge/controller/config.js";
import { NOODLE_COMPATIBILITY_BINDINGS } from "../apps/noodle-nudge/controller/bindings.js";
import {
  NOODLE_PERSISTED_STATE_KEYS,
  createStateController,
  mergeSavedNoodleState,
  persistentStatePatch
} from "../apps/noodle-nudge/controller/state.js";
import { calculateAssessmentResults, createAssessmentSessionController } from "../apps/noodle-nudge/controller/session.js";
import {
  NOODLE_MAX_IMPORT_BYTES,
  createSettingsController,
  readAndNormalizeBackup
} from "../apps/noodle-nudge/controller/settings.js";
import { persistentNoodleBackupState } from "../apps/noodle-nudge/reflection-adapter.js";

const root = process.cwd();
const fixture = JSON.parse(await readFile(resolve(root, "tests/fixtures/noodle-controller-v1.json"), "utf8"));
const scoringFixture = JSON.parse(await readFile(resolve(root, "tests/fixtures/noodle-scoring-v1.json"), "utf8"));
const previewFixture = JSON.parse(await readFile(resolve(root, "tests/fixtures/lifeos-reflection-preview-v1.json"), "utf8"));
const deliverables = JSON.parse(await readFile(resolve(root, "config/deliverables.json"), "utf8"));
const deliverable = deliverables.deliverables.find(({ id }) => id === "noodle-nudge");
const index = await readFile(resolve(root, "apps/noodle-nudge/index.html"), "utf8");
const app = await readFile(resolve(root, "apps/noodle-nudge/app.js"), "utf8");
const viewsSource = await readFile(resolve(root, "apps/noodle-nudge/controller/views.js"), "utf8");
const bindingsSource = await readFile(resolve(root, "apps/noodle-nudge/controller/bindings.js"), "utf8");
const shell = JSON.parse(await readFile(resolve(root, "apps/noodle-nudge/pwa-shell.json"), "utf8"));

assert.deepEqual([NOODLE_APP_VERSION, NOODLE_SHELL_VERSION, NOODLE_DATA_SCHEMA_VERSION], [
  deliverable.appVersion,
  deliverable.shellVersion,
  deliverable.dataSchemaVersion
]);
assert.deepEqual(noodleCompatibilitySafe(), fixture.compatibilityBindings);
assert.deepEqual(noodleStateKeysSafe(), fixture.stateKeys);
assert.deepEqual(NOODLE_PERSISTED_STATE_KEYS, fixture.persistedKeys);
assert.deepEqual(NOODLE_ASSESSMENT_ORDER.length, fixture.assessmentCount);
assert.deepEqual(NOODLE_CONFIG.database, {
  dbName: fixture.database.name,
  dbVersion: fixture.database.version,
  dbStoreName: fixture.database.store
});
assert.equal(NOODLE_MAX_IMPORT_BYTES, fixture.maxImportBytes);

function noodleCompatibilitySafe() {
  return [...NOODLE_COMPATIBILITY_BINDINGS];
}

function noodleStateKeysSafe() {
  return Object.keys(createInitialNoodleState(() => "2026-07-22T00:00:00.000Z"));
}

assert.match(index, /<script type="module" src="\.\/app\.js"><\/script>/);
assert.match(index, /script-src 'self';/);
assert.doesNotMatch(index, /script-src[^;]*unsafe-inline/);
assert.doesNotMatch(index, /<script type="module">\s*[\s\S]+?<\/script>/);
assert.doesNotMatch(index, /\son(?:click|change|input|submit|keydown)=/i);
assert.doesNotMatch(viewsSource, /\.innerHTML\s*=/);
for (const eventName of fixture.eventBindings) assert.match(bindingsSource, new RegExp(`["']${eventName}["']`));
for (const forbidden of ["healthos", "flexx", "commonground"]) {
  assert.doesNotMatch(app, new RegExp(`apps/${forbidden}|\\.\\./${forbidden}`), `Noodle controller must not import ${forbidden}`);
}
const shellAssets = new Map(shell.assets.map(({ url, sha256 }) => [url, sha256]));
for (const url of [
  "./app.js",
  "./styles.css",
  "./controller/config.js",
  "./controller/state.js",
  "./controller/storage.js",
  "./controller/content.js",
  "./controller/session.js",
  "./controller/settings.js",
  "./controller/views.js",
  "./controller/bindings.js"
]) assert.match(shellAssets.get(url) || "", /^[a-f0-9]{64}$/, `Offline shell missing ${url}`);

const persistedPatches = [];
const notifications = [];
const initial = createInitialNoodleState(() => "2026-07-22T00:00:00.000Z");
const state = createStateController({
  initialState: initial,
  persistPatch: async (patch) => { persistedPatches.push(patch); }
});
state.subscribe((value) => notifications.push(value));
await state.set({ assessments: { local: { id: "local" } }, userAnswers: { a: { answers: {} } } });
assert.deepEqual(persistedPatches, [{ userAnswers: { a: { answers: {} } } }], "Content definitions must not enter IndexedDB");
assert.equal(notifications.length, 1);
assert.deepEqual(persistentStatePatch({ dailyContent: { x: true }, settings: { theme: "system" } }), { settings: { theme: "system" } });
const merged = mergeSavedNoodleState(initial, {
  userResults: { kept: { scores: [] } },
  userHistory: undefined,
  viewDate: "1999-01-01T00:00:00.000Z",
  foreign: "ignored"
}, () => "2026-07-23T00:00:00.000Z");
assert.deepEqual(merged.userResults, { kept: { scores: [] } });
assert.deepEqual(merged.userHistory, {});
assert.equal(merged.viewDate, "2026-07-23T00:00:00.000Z");
assert.equal("foreign" in merged, false);
const failedState = createStateController({
  initialState: initial,
  persistPatch: async () => { throw new DOMException("quota", "QuotaExceededError"); }
});
await assert.rejects(() => failedState.set({ settings: { x: true } }), /quota/);

const assessmentFiles = (await readdir(resolve(root, "apps/noodle-nudge/JSON"))).filter((name) => /^Q\d+_.*\.json$/.test(name));
let cardSortCount = 0;
let likertCount = 0;
let ruleCount = 0;
for (const file of assessmentFiles) {
  const assessment = JSON.parse(await readFile(resolve(root, "apps/noodle-nudge/JSON", file), "utf8"));
  const answers = {};
  assessment.questions?.forEach((question, index) => {
    answers[question.id] = assessment.responseScale[index % assessment.responseScale.length].value;
  });
  assessment.sections?.forEach((section) => {
    answers[section.id] = {};
    section.categories.forEach((category, index) => {
      const limit = category.limit == null ? section.items.length : category.limit;
      answers[section.id][category.id] = section.items
        .filter((_, itemIndex) => itemIndex % section.categories.length === index)
        .slice(0, limit)
        .map((item) => item.id);
    });
  });
  const scores = calculateAssessmentResults(assessment, answers, { now: () => "2026-07-22T00:00:00.000Z" }).scores
    .map(({ id, value }) => ({ id, value }));
  assert.deepEqual(scores, scoringFixture[assessment.id], `${assessment.id} controller scoring drifted`);
  if ((assessment.interactionType || "likertScale") === "cardSort") cardSortCount += 1;
  else likertCount += 1;
  ruleCount += scores.length;
}
assert.deepEqual({ likertScale: likertCount, cardSort: cardSortCount }, fixture.interactionTypes);
assert.equal(ruleCount, fixture.scoringRuleCount);

const validLegacyFile = {
  name: "legacy.json",
  size: 100,
  text: async () => JSON.stringify(previewFixture.legacyBackup)
};
assert.deepEqual(await readAndNormalizeBackup(validLegacyFile), {
  ...previewFixture.legacyBackup,
  userHistory: {}
});
await assert.rejects(() => readAndNormalizeBackup({ ...validLegacyFile, name: "backup.txt" }), /choose a \.json/);
await assert.rejects(() => readAndNormalizeBackup({ ...validLegacyFile, size: NOODLE_MAX_IMPORT_BYTES + 1 }), /too large/);
await assert.rejects(() => readAndNormalizeBackup({ ...validLegacyFile, text: async () => "{" }), SyntaxError);

const viewEvents = [];
let cleared = 0;
let replaced;
let backupFails = true;
const fakeStorage = {
  async clear() { cleared += 1; },
  async replaceAppState(value) { replaced = value; }
};
const fakeViews = {
  showToast(message, type) { viewEvents.push({ message, type }); },
  showLoader() { viewEvents.push({ loader: "show" }); },
  hideLoader() { viewEvents.push({ loader: "hide" }); }
};
const fakeState = {
  snapshot: () => structuredClone(previewFixture.legacyBackup),
  get: () => ({ assessments: {}, userAnswers: {}, userResults: {}, userHistory: {} }),
  async set() {}
};
const settings = createSettingsController({
  config: { featureFlags: { enableDebugPanel: false } },
  state: fakeState,
  storage: fakeStorage,
  session: {},
  logger: { error() {} },
  views: fakeViews,
  navigate() {},
  downloadBackup() {
    if (backupFails) throw new Error("synthetic backup failure");
    return "backup.json";
  },
  reload() {},
  schedule: () => 1,
  cancelSchedule() {}
});
await settings.importFile(validLegacyFile);
assert.deepEqual(replaced, persistentNoodleBackupState(previewFixture.legacyBackup));
const beforeQuota = structuredClone(replaced);
const quotaSettings = createSettingsController({
  config: { featureFlags: { enableDebugPanel: false } },
  state: fakeState,
  storage: {
    ...fakeStorage,
    async replaceAppState() { throw new DOMException("synthetic quota", "QuotaExceededError"); }
  },
  session: {},
  logger: { error() {} },
  views: fakeViews,
  navigate() {},
  downloadBackup: () => "backup.json",
  reload() {},
  schedule: () => 1,
  cancelSchedule() {}
});
await assert.rejects(() => quotaSettings.importFile(validLegacyFile), /synthetic quota/);
assert.deepEqual(replaced, beforeQuota, "Failed import must not replace prior data");
assert.equal((await settings.resetData()).status, "confirmation-required");
assert.equal((await settings.resetData()).status, "preserved");
assert.equal(cleared, 0, "Reset must preserve data when backup cannot start");
backupFails = false;
assert.equal((await settings.resetData()).status, "confirmation-required");
assert.equal((await settings.resetData()).status, "reset");
assert.equal(cleared, 1);

const firstAssessment = JSON.parse(await readFile(resolve(root, "apps/noodle-nudge/JSON/Q10_Proactive Personality Scale.json"), "utf8"));
const sessionStateValue = {
  assessments: { [firstAssessment.id]: firstAssessment },
  userAnswers: { foreign: { answers: { x: 1 } } },
  userResults: { foreign: { scores: [] } },
  userHistory: { foreign: [] }
};
let sessionStatePatch;
const sessionController = createAssessmentSessionController({
  state: {
    get: () => sessionStateValue,
    async set(patch, options) { sessionStatePatch = { patch, options }; }
  },
  storage: {
    async commitAssessment({ assessmentId, answerRecord, results, historyEntry }) {
      return {
        userAnswers: { ...sessionStateValue.userAnswers, [assessmentId]: answerRecord },
        userResults: { ...sessionStateValue.userResults, [assessmentId]: results },
        userHistory: { ...sessionStateValue.userHistory, [assessmentId]: [historyEntry] }
      };
    }
  },
  logger: { error() {}, warn() {} },
  showToast() {},
  navigate() {},
  now: () => "2026-07-22T00:00:00.000Z"
});
const fakeForm = {
  querySelector(selector) {
    const match = selector.match(/name="([^"]+)"/);
    return match ? { value: "3" } : null;
  }
};
await sessionController.submit(firstAssessment.id, fakeForm);
assert.equal(Object.hasOwn(sessionStatePatch.patch.userResults, "foreign"), true, "Unrelated result sets must survive");
assert.deepEqual(sessionStatePatch.options, { persist: false }, "Atomic storage commit must not be overwritten by state persistence");

console.log("R3D Noodle state, storage, session, settings, compatibility, CSP, scoring, and shell regression passed.");
