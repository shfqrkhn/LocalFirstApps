import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createNoodleScoringEnvironment,
  evaluateScoringExpression,
  validateAssessmentScoring,
  validateScoringExpression
} from "../apps/noodle-nudge/reflection-adapter.js";

const root = process.cwd();
const dataDir = resolve(root, "apps/noodle-nudge/JSON");
const expected = JSON.parse(await readFile(resolve(root, "tests/fixtures/noodle-scoring-v1.json"), "utf8"));
const files = (await readdir(dataDir)).filter((name) => /^Q\d+_.*\.json$/.test(name));

function deterministicAnswers(assessment) {
  const answers = {};
  assessment.questions?.forEach((question, index) => { answers[question.id] = assessment.responseScale[index % assessment.responseScale.length].value; });
  assessment.sections?.forEach((section) => {
    answers[section.id] = {};
    section.categories.forEach((category, index) => {
      const limit = category.limit == null ? section.items.length : category.limit;
      answers[section.id][category.id] = section.items.filter((_, itemIndex) => itemIndex % section.categories.length === index).slice(0, limit).map((item) => item.id);
    });
  });
  return answers;
}

function calculate(assessment, answers) {
  validateAssessmentScoring(assessment);
  const scores = new Map();
  assessment.questions?.forEach((question) => {
    const dimension = question.scoring?.dimension;
    if (!dimension) return;
    const list = scores.get(`__dimension:${dimension}`) || [];
    const answer = Number(answers[question.id] || 0);
    list.push(question.scoring.isReversed ? 6 - answer : answer);
    scores.set(`__dimension:${dimension}`, list);
  });
  for (const [key, values] of [...scores]) {
    if (!key.startsWith("__dimension:")) continue;
    scores.delete(key);
    scores.set(key.slice(12), values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  const primary = assessment.scoringRubric?.primaryScores || [];
  const derivative = assessment.scoringRubric?.derivativeInsights || [];
  const rules = [...primary, ...derivative];
  for (const group of [primary, derivative]) {
    for (const rule of group) {
      const environment = createNoodleScoringEnvironment({ assessment, answers, scores, rules });
      scores.set(rule.id, evaluateScoringExpression(rule.calculation || rule.calculationLogic, environment));
      if (rule.id.endsWith("_score")) scores.set(rule.id.slice(0, -6), scores.get(rule.id));
    }
  }
  return rules.map(({ id }) => ({ id, value: scores.get(id) }));
}

const actual = {};
for (const file of files) {
  const assessment = JSON.parse(await readFile(resolve(dataDir, file), "utf8"));
  actual[assessment.id] = calculate(assessment, deterministicAnswers(assessment));
}
assert.deepEqual(actual, expected, "All canonical formulas must preserve the captured v1 scoring outputs.");

for (const malicious of [
  "globalThis.fetch('x')",
  "constructor.constructor('return 1')()",
  "SUM([1]); alert(1)",
  "Object['constructor']",
  "UNKNOWN(1)",
  "1 && 2",
  "1 < 2"
]) assert.throws(() => validateScoringExpression(malicious), /Invalid scoring expression/);

const emptyEnvironment = { functions: {}, resolveIdentifier(name) { throw new ReferenceError(name); } };
assert.throws(() => evaluateScoringExpression("missing_score + 1", emptyEnvironment), /missing_score/);
assert.throws(() => evaluateScoringExpression("1 / 0", emptyEnvironment), /Division by zero/);
assert.throws(() => validateScoringExpression("(".repeat(40) + "1" + ")".repeat(40)), /nesting limit/);
assert.throws(() => validateScoringExpression("1 + ".repeat(600) + "1"), /source is too long|token limit/);
assert.throws(() => validateAssessmentScoring({ scoringRubric: { primaryScores: [{ id: "bad-id", calculation: "1" }] } }), /safe identifiers/);

console.log(`Noodle scoring regression passed for ${files.length} assessments and all allowlist rejection vectors.`);
