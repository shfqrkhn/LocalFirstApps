export const NOODLE_SCORING_VERSION = "1.0.0";

const ALLOWED_FUNCTIONS = new Set([
  "AVERAGE_SCORE",
  "COLLECT_ITEMS_FROM_CATEGORY",
  "COMPARE_SUBTYPE_COUNTS",
  "CONCAT",
  "COUNT_SUBTYPE_IN_TOP_CATEGORY",
  "IDENTIFY_HIGHEST_SCORE_DIMENSIONS",
  "IDENTIFY_MAX_SCORE_DIMENSION",
  "IF",
  "IS_IN_TOP_CATEGORY",
  "NORMALIZE",
  "REVERSE_SCORE",
  "SUM",
  "SUM_AND_AVERAGE"
]);

const LIMITS = Object.freeze({ source: 2048, tokens: 512, depth: 32, array: 128, rules: 64, operations: 1024, output: 4096 });
const BINARY_PRECEDENCE = Object.freeze({ OR: 1, ">": 2, ">=": 2, "+": 3, "-": 3, "*": 4, "/": 4 });
const astCache = new Map();

function fail(message) {
  throw new Error(`Invalid scoring expression: ${message}`);
}

function tokenize(source) {
  if (typeof source !== "string" || !source.trim()) fail("a non-empty string is required");
  if (source.length > LIMITS.source) fail("source is too long");
  const tokens = [];
  let index = 0;
  const push = (type, value = type) => {
    tokens.push({ type, value });
    if (tokens.length > LIMITS.tokens) fail("token limit exceeded");
  };
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) { index += 1; continue; }
    if (char === "'" || char === '"') {
      const quote = char;
      let value = "";
      index += 1;
      while (index < source.length && source[index] !== quote) {
        if (source[index] === "\\") {
          index += 1;
          const escaped = source[index];
          const escapes = { n: "\n", r: "\r", t: "\t", "\\": "\\", "'": "'", '"': '"' };
          if (!(escaped in escapes)) fail("unsupported string escape");
          value += escapes[escaped];
        } else value += source[index];
        index += 1;
        if (value.length > LIMITS.output) fail("string literal is too long");
      }
      if (source[index] !== quote) fail("unterminated string");
      index += 1;
      push("string", value);
      continue;
    }
    const number = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      const value = Number(number[0]);
      if (!Number.isFinite(value)) fail("number is not finite");
      push("number", value);
      index += number[0].length;
      continue;
    }
    const identifier = source.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) {
      const value = identifier[0];
      push(value === "OR" ? "operator" : "identifier", value);
      index += value.length;
      continue;
    }
    const two = source.slice(index, index + 2);
    if (two === ">=") { push("operator", two); index += 2; continue; }
    if ("+-*/>?():,[]".includes(char)) {
      push(BINARY_PRECEDENCE[char] ? "operator" : char, char);
      index += 1;
      continue;
    }
    fail(`unsupported token ${JSON.stringify(char)}`);
  }
  push("eof", null);
  return tokens;
}

class Parser {
  constructor(tokens) { this.tokens = tokens; this.index = 0; this.depth = 0; }
  current() { return this.tokens[this.index]; }
  take(type, value) {
    const token = this.current();
    if (token.type !== type || (value !== undefined && token.value !== value)) fail(`expected ${value ?? type}`);
    this.index += 1;
    return token;
  }
  nested(callback) {
    this.depth += 1;
    if (this.depth > LIMITS.depth) fail("nesting limit exceeded");
    try { return callback(); } finally { this.depth -= 1; }
  }
  parse() {
    const expression = this.parseConditional();
    this.take("eof");
    return expression;
  }
  parseConditional() {
    let node = this.parseBinary(1);
    if (this.current().type === "?") {
      this.take("?");
      const consequent = this.nested(() => this.parseConditional());
      this.take(":");
      const alternate = this.nested(() => this.parseConditional());
      node = { type: "conditional", test: node, consequent, alternate };
    }
    return node;
  }
  parseBinary(minimum) {
    let left = this.parsePrimary();
    while (this.current().type === "operator" && BINARY_PRECEDENCE[this.current().value] >= minimum) {
      const operator = this.take("operator").value;
      const right = this.parseBinary(BINARY_PRECEDENCE[operator] + 1);
      left = { type: "binary", operator, left, right };
    }
    return left;
  }
  parsePrimary() {
    const token = this.current();
    if (token.type === "number" || token.type === "string") { this.index += 1; return { type: "literal", value: token.value }; }
    if (token.type === "identifier") {
      this.index += 1;
      if (this.current().type !== "(") return { type: "identifier", name: token.value };
      if (!ALLOWED_FUNCTIONS.has(token.value)) fail(`function ${token.value} is not allowed`);
      this.take("(");
      const args = [];
      if (this.current().type !== ")") {
        do {
          args.push(this.nested(() => this.parseConditional()));
          if (args.length > LIMITS.array) fail("argument limit exceeded");
          if (this.current().type !== ",") break;
          this.take(",");
        } while (true);
      }
      this.take(")");
      return { type: "call", name: token.value, args };
    }
    if (token.type === "(") {
      this.take("(");
      const node = this.nested(() => this.parseConditional());
      this.take(")");
      return node;
    }
    if (token.type === "[") {
      this.take("[");
      const items = [];
      if (this.current().type !== "]") {
        do {
          items.push(this.nested(() => this.parseConditional()));
          if (items.length > LIMITS.array) fail("array limit exceeded");
          if (this.current().type !== ",") break;
          this.take(",");
        } while (true);
      }
      this.take("]");
      return { type: "array", items };
    }
    fail(`unexpected ${token.type}`);
  }
}

function parse(source) {
  let ast = astCache.get(source);
  if (!ast) {
    ast = new Parser(tokenize(source)).parse();
    if (astCache.size >= 128) astCache.delete(astCache.keys().next().value);
    astCache.set(source, ast);
  }
  return ast;
}

function finite(value, label = "value") {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
}

function evaluateNode(node, environment, budget) {
  budget.count += 1;
  if (budget.count > LIMITS.operations) throw new Error("Scoring operation limit exceeded.");
  if (node.type === "literal") return node.value;
  if (node.type === "identifier") return environment.resolveIdentifier(node.name);
  if (node.type === "array") return node.items.map((item) => evaluateNode(item, environment, budget));
  if (node.type === "conditional") return evaluateNode(node.test, environment, budget)
    ? evaluateNode(node.consequent, environment, budget)
    : evaluateNode(node.alternate, environment, budget);
  if (node.type === "call") {
    const fn = environment.functions[node.name];
    if (typeof fn !== "function") throw new Error(`Scoring function ${node.name} is unavailable.`);
    return fn(...node.args.map((arg) => evaluateNode(arg, environment, budget)));
  }
  if (node.type === "binary") {
    if (node.operator === "OR") return Boolean(evaluateNode(node.left, environment, budget)) || Boolean(evaluateNode(node.right, environment, budget));
    const left = evaluateNode(node.left, environment, budget);
    const right = evaluateNode(node.right, environment, budget);
    if (node.operator === ">") return finite(left) > finite(right);
    if (node.operator === ">=") return finite(left) >= finite(right);
    if (node.operator === "+") return finite(left) + finite(right);
    if (node.operator === "-") return finite(left) - finite(right);
    if (node.operator === "*") return finite(left) * finite(right);
    if (node.operator === "/") {
      finite(right);
      if (right === 0) throw new Error("Division by zero is not allowed.");
      return finite(left) / right;
    }
  }
  throw new Error("Unsupported scoring node.");
}

export function validateScoringExpression(source) {
  parse(source);
  return true;
}

export function evaluateScoringExpression(source, environment) {
  if (!environment || typeof environment.resolveIdentifier !== "function" || !environment.functions) throw new Error("A scoring environment is required.");
  const result = evaluateNode(parse(source), environment, { count: 0 });
  if (Array.isArray(result) || (typeof result === "number" && !Number.isFinite(result)) || !["number", "string", "boolean"].includes(typeof result)) {
    throw new Error("Scoring result must be a finite number, string, or boolean.");
  }
  if (typeof result === "string" && result.length > LIMITS.output) throw new Error("Scoring result is too long.");
  return result;
}

export function validateAssessmentScoring(assessment) {
  if (!assessment || typeof assessment !== "object" || Array.isArray(assessment)) throw new Error("Assessment must be an object.");
  const groups = [assessment.scoringRubric?.primaryScores, assessment.scoringRubric?.derivativeInsights];
  const rules = groups.flatMap((group) => group || []);
  if (rules.length > LIMITS.rules) throw new Error("Assessment scoring rule limit exceeded.");
  const ids = new Set();
  for (const rule of rules) {
    if (!rule || typeof rule.id !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(rule.id) || ids.has(rule.id)) throw new Error("Assessment scoring rule IDs must be unique safe identifiers.");
    ids.add(rule.id);
    validateScoringExpression(rule.calculation || rule.calculationLogic);
  }
  return true;
}

export function createNoodleScoringEnvironment({ assessment, answers, scores, rules }) {
  const scoreMap = scores instanceof Map ? scores : new Map(Object.entries(scores || {}));
  const safeAnswers = answers && typeof answers === "object" ? answers : {};
  const safeRules = Array.isArray(rules) ? rules : [];
  const numbers = (values) => values.flat(Infinity).map((value) => finite(value));
  const section = (id) => assessment?.sections?.find((entry) => entry.id === id);
  const countSubtype = (subtype, sectionId) => {
    const current = section(sectionId);
    if (!current) return 0;
    const topKey = current.categories.find((category) => category.id.includes("_most_important"))?.id;
    const itemIds = topKey ? safeAnswers[sectionId]?.[topKey] || [] : [];
    return itemIds.reduce((count, id) => count + (current.items.find((item) => item.id === id)?.subType === subtype ? 1 : 0), 0);
  };
  const functions = {
    REVERSE_SCORE: (values) => numbers([values]).map((value) => 6 - value),
    SUM: (...values) => numbers(values).reduce((sum, value) => sum + value, 0),
    SUM_AND_AVERAGE: (...values) => { const list = numbers(values); return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : 0; },
    AVERAGE_SCORE: (values) => { const list = numbers([values]); return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : 0; },
    NORMALIZE: (value, min, max, targetMin = 0, targetMax = 100) => {
      [value, min, max, targetMin, targetMax].forEach((entry) => finite(entry));
      if (max === min) throw new Error("Normalization range cannot be zero.");
      return targetMin + ((value - min) / (max - min)) * (targetMax - targetMin);
    },
    CONCAT: (...values) => values.join(""),
    IF: (condition, yes, no) => condition ? yes : no,
    COLLECT_ITEMS_FROM_CATEGORY: (sectionId, categoryId) => {
      const current = section(sectionId);
      if (!current) return "E:S";
      return (safeAnswers[sectionId]?.[categoryId] || []).map((id) => current.items.find((item) => item.id === id)?.text).filter(Boolean).join(", ");
    },
    IS_IN_TOP_CATEGORY: (itemId, sectionId) => {
      const current = section(sectionId);
      const topKey = current?.categories.find((category) => category.id.includes("_most_important"))?.id;
      return Boolean(topKey && safeAnswers[sectionId]?.[topKey]?.includes(itemId));
    },
    COUNT_SUBTYPE_IN_TOP_CATEGORY: countSubtype,
    COMPARE_SUBTYPE_COUNTS: (leftSubtype, rightSubtype, leftSection, rightSection) => countSubtype(leftSubtype, leftSection) > countSubtype(rightSubtype, rightSection) ? "social" : "personal",
    IDENTIFY_HIGHEST_SCORE_DIMENSIONS: (values, labels) => {
      const list = numbers([values]);
      if (!Array.isArray(labels) || labels.length !== list.length) throw new Error("Dimension labels do not match scores.");
      const max = Math.max(...list);
      return labels.filter((_, index) => list[index] === max).join(", ");
    },
    IDENTIFY_MAX_SCORE_DIMENSION: (...ids) => {
      let max = -Infinity;
      let title = "N/A";
      ids.forEach((id) => {
        const value = scoreMap.get(id) ?? (String(id).endsWith("_score") ? scoreMap.get(String(id).slice(0, -6)) : undefined);
        if (typeof value === "number" && Number.isFinite(value) && value > max) {
          max = value;
          title = safeRules.find((rule) => rule.id === id || `${rule.id}_score` === id)?.title?.replace(/\s*Style Score|\s*Score/gi, "") || String(id);
        }
      });
      return title;
    }
  };
  return {
    functions,
    resolveIdentifier(name) {
      if (scoreMap.has(name)) return scoreMap.get(name);
      if (name.endsWith("_score") && scoreMap.has(name.slice(0, -6))) return scoreMap.get(name.slice(0, -6));
      if (Object.hasOwn(safeAnswers, name)) return finite(Number(safeAnswers[name]), `answer ${name}`);
      throw new ReferenceError(`Unknown scoring identifier ${name}.`);
    }
  };
}
