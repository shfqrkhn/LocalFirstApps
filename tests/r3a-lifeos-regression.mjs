import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  LIFEOS_ADAPTER_VERSION,
  LIFEOS_MODULES,
  LIFEOS_SHELL_CONTRACT_VERSION,
  createLifeOsShellSnapshot,
  lifeOsReceiptCapability,
  validateLifeOsShellModules
} from "../apps/healthos/lifeos-adapter.js";
import * as compatibilityScoring from "../apps/noodle-nudge/scoring.js";
import {
  LIFEOS_REFLECTION_PREVIEW_VERSION,
  NOODLE_BACKUP_COMPAT_VERSION,
  REFLECTION_ADAPTER_VERSION,
  REFLECTION_ASSESSMENT_DEFINITIONS,
  REFLECTION_ASSESSMENT_URLS,
  REFLECTION_DEFINITIONS_VERSION,
  createLifeOsReflectionPreview,
  normalizeNoodleBackup,
  persistentNoodleBackupState,
  validateReflectionAssessmentDefinition,
  validateReflectionCatalog,
  validateScoringExpression
} from "../apps/noodle-nudge/reflection-adapter.js";
import * as reflectionScoring from "../apps/noodle-nudge/reflection/scoring.js";

const root = process.cwd();
const fixture = JSON.parse(await readFile(resolve(root, "tests/fixtures/lifeos-reflection-preview-v1.json"), "utf8"));
const healthShell = JSON.parse(await readFile(resolve(root, "apps/healthos/pwa-shell.json"), "utf8"));
const noodleShell = JSON.parse(await readFile(resolve(root, "apps/noodle-nudge/pwa-shell.json"), "utf8"));
const healthStorage = await readFile(resolve(root, "apps/healthos/storage.js"), "utf8");
const healthIndex = await readFile(resolve(root, "apps/healthos/index.html"), "utf8");
const noodleIndex = await readFile(resolve(root, "apps/noodle-nudge/index.html"), "utf8");
const noodleApp = await readFile(resolve(root, "apps/noodle-nudge/app.js"), "utf8");
const noodleContent = await readFile(resolve(root, "apps/noodle-nudge/controller/content.js"), "utf8");

assert.equal(LIFEOS_ADAPTER_VERSION, "1.0.0");
assert.equal(LIFEOS_SHELL_CONTRACT_VERSION, "1.0.0");
assert.deepEqual(validateLifeOsShellModules(), []);
const shell = createLifeOsShellSnapshot({ at: "2024-02-29T12:00:00.000Z" });
assert.equal(shell.name, "CommonGround LifeOS");
assert.equal(shell.validation.ok, true);
assert.deepEqual(shell.modules.map(({ id }) => id), ["reflection", "strength", "focus"]);
assert.deepEqual(shell.boundaries, { storage: "app-owned", transfer: "explicit-preview-only", crossAppRead: false, crossAppWrite: false, hiddenSync: false });
assert.equal(LIFEOS_MODULES.find(({ id }) => id === "reflection").dataAccess, "none");
assert.equal(LIFEOS_MODULES.find(({ id }) => id === "strength").dataAccess, "none");
assert.equal(lifeOsReceiptCapability({ status: "applied" }).canRollback, true);
assert.equal(lifeOsReceiptCapability({ status: "rolled-back" }).canRollback, false);

assert.deepEqual([REFLECTION_ADAPTER_VERSION, REFLECTION_DEFINITIONS_VERSION, NOODLE_BACKUP_COMPAT_VERSION, LIFEOS_REFLECTION_PREVIEW_VERSION], Array(4).fill("1.0.0"));
assert.equal(validateReflectionCatalog(), true);
assert.equal(REFLECTION_ASSESSMENT_DEFINITIONS.length, 10);
assert.deepEqual(REFLECTION_ASSESSMENT_URLS, REFLECTION_ASSESSMENT_DEFINITIONS.map(({ url }) => url));
let ruleCount = 0;
for (const descriptor of REFLECTION_ASSESSMENT_DEFINITIONS) {
  const path = resolve(root, "apps/noodle-nudge", decodeURIComponent(descriptor.url.slice(2)));
  const assessment = JSON.parse(await readFile(path, "utf8"));
  assert.equal(validateReflectionAssessmentDefinition(assessment, descriptor), true);
  ruleCount += (assessment.scoringRubric?.primaryScores?.length || 0) + (assessment.scoringRubric?.derivativeInsights?.length || 0);
}
assert.equal(ruleCount, 42);
assert.equal(compatibilityScoring.evaluateScoringExpression, reflectionScoring.evaluateScoringExpression, "old scoring URL must re-export the canonical implementation");

assert.throws(() => validateReflectionCatalog(REFLECTION_ASSESSMENT_DEFINITIONS.slice(0, 9)), /exactly ten/);
assert.throws(() => validateReflectionCatalog(REFLECTION_ASSESSMENT_DEFINITIONS.map((entry, index) => index ? entry : { ...entry, url: "https://example.com/assessment.json" })), /local assessment JSON/);
const firstDescriptor = REFLECTION_ASSESSMENT_DEFINITIONS[0];
const firstAssessment = JSON.parse(await readFile(resolve(root, "apps/noodle-nudge", decodeURIComponent(firstDescriptor.url.slice(2))), "utf8"));
assert.throws(() => validateReflectionAssessmentDefinition({ ...firstAssessment, id: "foreign" }, firstDescriptor), /does not match/);
assert.throws(() => validateReflectionAssessmentDefinition({ ...firstAssessment, scoringRubric: { primaryScores: [{ id: "unsafe", calculation: "globalThis.fetch('x')" }] } }, firstDescriptor), /Invalid scoring expression/);
assert.throws(() => validateScoringExpression("SUM(".repeat(40) + "1" + ")".repeat(40)), /source is too long|nesting limit/);

const normalizedLegacy = normalizeNoodleBackup(fixture.legacyBackup);
assert.deepEqual(normalizedLegacy.userHistory, {}, "legacy backups without userHistory must remain accepted");
const persistent = persistentNoodleBackupState(fixture.legacyBackup);
assert.equal("assessments" in persistent, false);
assert.equal("dailyContent" in persistent, false);
assert.deepEqual(createLifeOsReflectionPreview(fixture.legacyBackup, { at: fixture.preview.generatedAt }), fixture.preview);
assert.throws(() => normalizeNoodleBackup(JSON.parse('{"assessments":{},"dailyContent":{},"userAnswers":{},"userResults":{},"appConfig":{"constructor":{}}}')), /Unsafe key/);
assert.equal(createLifeOsReflectionPreview(fixture.legacyBackup, { at: fixture.preview.generatedAt }).mutationAllowed, false);

for (const [manifest, required] of [
  [healthShell, ["./lifeos-adapter.js", "./modules/lifeos-shell.js"]],
  [noodleShell, ["./reflection-adapter.js", "./reflection/scoring.js", "./reflection/definitions.js", "./reflection/backup.js", "./scoring.js"]]
]) {
  const assets = new Map(manifest.assets.map(({ url, sha256 }) => [url, sha256]));
  for (const url of required) assert.match(assets.get(url) || "", /^[a-f0-9]{64}$/, `${manifest.appId} offline shell missing ${url}`);
}

assert.match(healthStorage, /HEALTHOS_DB_VERSION = 1/);
assert.match(healthStorage, /HEALTHOS_PREFERENCE_RESTORE_ID/);
assert.match(healthStorage, /HEALTHOS_PREFERENCES_PENDING/);
assert.match(healthIndex, /\.\.\/\.\.\/shared\/design-primitives\.css/);
assert.match(noodleApp, /from "\.\/controller\/content\.js"/);
assert.match(noodleContent, /from "\.\.\/reflection-adapter\.js"/);
assert.match(noodleContent, /\.\.\.REFLECTION_ASSESSMENT_URLS/);
assert.doesNotMatch(noodleIndex, /reflection\/backup\.js/);

console.log("R3A LifeOS shell, Reflection extraction, compatibility, preview, and isolation regression passed.");
