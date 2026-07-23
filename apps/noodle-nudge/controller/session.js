import {
  createNoodleScoringEnvironment,
  evaluateScoringExpression,
  validateAssessmentScoring
} from "../reflection-adapter.js";

const SCORE_SUFFIX = /([a-zA-Z_$][\w$]*)_score\b/g;

function safeResult(value) {
  if (typeof value === "string" && /^(constructor|prototype|__proto__)$/.test(value)) return "BLOCKED";
  return value;
}

function interpretationFor(rule, value) {
  let interpretation = rule.interpretation || "No interpretation available.";
  if (Array.isArray(rule.interpretation)) {
    const found = rule.interpretation.find((entry) => typeof value === "number" && entry.range && value >= entry.range[0] && value <= entry.range[1]);
    return found ? found.description : interpretation;
  }
  if (!rule.interpretation || typeof rule.interpretation !== "object") return interpretation;
  if (typeof value === "number" && rule.interpretation.high !== undefined && rule.interpretation.low !== undefined) {
    return value >= 50 ? rule.interpretation.high : rule.interpretation.low;
  }
  const resultKey = String(value).toLowerCase();
  const exactKey = Object.keys(rule.interpretation).find((key) => key.toLowerCase() === resultKey);
  if (exactKey) return rule.interpretation[exactKey];
  const descriptions = resultKey.split(",").map((part) => part.trim()).map((part) => {
    const key = Object.keys(rule.interpretation).find((candidate) => candidate.toLowerCase() === part);
    return key ? rule.interpretation[key] : null;
  }).filter(Boolean);
  if (descriptions.length) return descriptions.join(" ");
  if (rule.interpretation.note) return rule.interpretation.note.replace("[result]", String(value));
  return typeof interpretation === "object" ? String(value) : interpretation;
}

function evaluateRule(expression, scores, assessment, answers) {
  const rules = [
    ...(assessment.scoringRubric.primaryScores || []),
    ...(assessment.scoringRubric.derivativeInsights || [])
  ];
  return safeResult(evaluateScoringExpression(
    expression,
    createNoodleScoringEnvironment({ assessment, answers, scores, rules })
  ));
}

function processRuleGroup(rules, calculatedScores, assessment, answers, logger) {
  const adjacency = new Map();
  const inDegree = new Map();
  const ruleMap = new Map();
  for (const rule of rules) {
    inDegree.set(rule.id, 0);
    adjacency.set(rule.id, []);
    ruleMap.set(rule.id, rule);
  }
  for (const rule of rules) {
    const calculation = rule.calculation || rule.calculationLogic;
    if (!calculation) continue;
    const dependencies = [...new Set([...calculation.matchAll(SCORE_SUFFIX)].map((match) => match[0]))];
    for (const rawDependency of dependencies) {
      const dependency = ruleMap.has(rawDependency)
        ? rawDependency
        : (ruleMap.has(rawDependency.replace("_score", "")) ? rawDependency.replace("_score", "") : null);
      if (!dependency || !adjacency.has(dependency)) continue;
      adjacency.get(dependency).push(rule.id);
      inDegree.set(rule.id, (inDegree.get(rule.id) || 0) + 1);
    }
  }

  const queue = [];
  inDegree.forEach((count, id) => { if (count === 0) queue.push(id); });
  let processed = 0;
  while (queue.length) {
    const ruleId = queue.shift();
    const rule = ruleMap.get(ruleId);
    processed += 1;
    try {
      calculatedScores.set(rule.id, evaluateRule(rule.calculation || rule.calculationLogic, calculatedScores, assessment, answers));
    } catch (error) {
      logger.error(`Scoring error for rule "${rule.id}":`, error);
      calculatedScores.set(rule.id, "Calculation Error");
    }
    if (rule.id.endsWith("_score")) calculatedScores.set(rule.id.replace("_score", ""), calculatedScores.get(rule.id));
    for (const neighbor of adjacency.get(ruleId) || []) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }
  if (processed !== rules.length) {
    logger.warn("Cycle detected in scoring rules. Some rules skipped.");
    for (const rule of rules) if (!calculatedScores.has(rule.id)) calculatedScores.set(rule.id, "Dependency Cycle");
  }
}

export function calculateAssessmentResults(assessment, answers, {
  now = () => new Date().toISOString(),
  logger = { error() {}, warn() {} }
} = {}) {
  validateAssessmentScoring(assessment);
  const results = {
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    timestamp: now(),
    scores: []
  };
  const calculatedScores = new Map();
  const score = (id) => answers[id] || 0;
  const dimensions = new Map();
  for (const question of assessment.questions || []) {
    const dimension = question.scoring?.dimension;
    if (!dimension) continue;
    if (!dimensions.has(dimension)) dimensions.set(dimension, []);
    dimensions.get(dimension).push({ id: question.id, reversed: question.scoring.isReversed || false });
  }
  dimensions.forEach((questions, dimension) => {
    const normal = questions.filter((question) => !question.reversed).map((question) => score(question.id));
    const reversed = questions.filter((question) => question.reversed).map((question) => 6 - score(question.id));
    const values = [...normal, ...reversed];
    calculatedScores.set(dimension, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  });

  const primary = assessment.scoringRubric.primaryScores || [];
  const derivative = assessment.scoringRubric.derivativeInsights || [];
  processRuleGroup(primary, calculatedScores, assessment, answers, logger);
  processRuleGroup(derivative, calculatedScores, assessment, answers, logger);
  for (const rule of [...primary, ...derivative]) {
    const value = calculatedScores.get(rule.id);
    results.scores.push({
      id: rule.id,
      title: rule.title,
      value,
      interpretation: interpretationFor(rule, value),
      type: primary.some((entry) => entry.id === rule.id) ? "primary" : "derived"
    });
  }
  return results;
}

export function collectAssessmentAnswers(assessment, form) {
  const answers = {};
  if ((assessment.interactionType || "likertScale") === "cardSort") {
    for (const section of assessment.sections) {
      answers[section.id] = {};
      for (const category of section.categories) {
        answers[section.id][category.id] = [...form.querySelectorAll(`[data-category-id="${category.id}"] .sortable-card`)]
          .map((card) => card.dataset.itemId);
      }
    }
    return answers;
  }
  for (const question of assessment.questions) {
    const input = form.querySelector(`input[name="${question.id}"]:checked`);
    if (input) answers[question.id] = Number.parseInt(input.value, 10);
  }
  return answers;
}

export function createAssessmentSessionController({ state, storage, logger, showToast, navigate, now = () => new Date().toISOString() }) {
  async function submit(assessmentId, form) {
    const assessment = state.get().assessments[assessmentId];
    if (!assessment) throw new Error("Assessment not found.");
    const answers = collectAssessmentAnswers(assessment, form);
    const answerRecord = { answers, timestamp: now() };
    const results = calculateAssessmentResults(assessment, answers, { now, logger });
    const historyEntry = { timestamp: now(), results, answers };
    try {
      const persisted = await storage.commitAssessment({ assessmentId, answerRecord, results, historyEntry });
      await state.set({
        userAnswers: persisted.userAnswers,
        userResults: persisted.userResults,
        userHistory: persisted.userHistory
      }, { persist: false });
      showToast("Assessment completed!", "success");
      navigate("results", { id: assessmentId });
      return results;
    } catch (error) {
      logger.error("Assessment save failed:", error);
      showToast("Assessment could not be saved. Your existing results were preserved.", "danger");
      throw error;
    }
  }

  return Object.freeze({
    calculateResults: (assessment, answers) => calculateAssessmentResults(assessment, answers, { now, logger }),
    submit
  });
}
