import { validateAssessmentScoring } from "./scoring.js";

export const REFLECTION_DEFINITIONS_VERSION = "1.0.0";

const definition = (id, url, interactionType = "likertScale") => Object.freeze({ id, url, interactionType });

export const REFLECTION_ASSESSMENT_DEFINITIONS = Object.freeze([
  definition("core_profile_v1.0.0", "./JSON/Q1_Core%20Personality.json"),
  definition("core_values_v1.0.0", "./JSON/Q2_Core%20Values.json", "cardSort"),
  definition("core_agency_v1.0.0", "./JSON/Q3_Core%20Agency.json"),
  definition("work_motivation_v1.0.0", "./JSON/Q4_Work%20Motivation.json"),
  definition("pss_v1.0.0", "./JSON/Q5_Perceived%20Stress%20Scale%20(PSS).json"),
  definition("conflict_style_v1.0.0", "./JSON/Q6_Conflict%20%26%20Negotiation%20Style.json"),
  definition("authentic_ethical_leadership_v1.0.0", "./JSON/Q7_Authentic%20%26%20Ethical%20Leadership.json"),
  definition("assertiveness_profile_v1.0.0", "./JSON/Q8_Assertiveness%20Profile.json"),
  definition("power_influence_v1.0.0", "./JSON/Q9_Power%20%26%20Influence%20Profile.json"),
  definition("proactive_personality_v1.0.0", "./JSON/Q10_Proactive%20Personality%20Scale.json")
]);

export const REFLECTION_ASSESSMENT_URLS = Object.freeze(REFLECTION_ASSESSMENT_DEFINITIONS.map(({ url }) => url));

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueIds(items, label) {
  if (!Array.isArray(items) || !items.length) throw new Error(`${label} must be a non-empty array.`);
  const ids = new Set();
  for (const item of items) {
    if (!plainObject(item) || typeof item.id !== "string" || !item.id || ids.has(item.id)) throw new Error(`${label} IDs must be unique non-empty strings.`);
    ids.add(item.id);
  }
}

export function validateReflectionCatalog(catalog = REFLECTION_ASSESSMENT_DEFINITIONS) {
  if (!Array.isArray(catalog) || catalog.length !== 10) throw new Error("Reflection requires exactly ten canonical assessment definitions.");
  uniqueIds(catalog, "Reflection catalog");
  const urls = new Set();
  for (const entry of catalog) {
    if (!/^\.\/JSON\/Q[^?#]+\.json$/.test(entry.url) || urls.has(entry.url)) throw new Error("Reflection definition URLs must be unique local assessment JSON paths.");
    if (!["likertScale", "cardSort"].includes(entry.interactionType)) throw new Error("Reflection interaction type is unsupported.");
    urls.add(entry.url);
  }
  return true;
}

export function validateReflectionAssessmentDefinition(assessment, expected) {
  if (!plainObject(assessment)) throw new Error("Reflection assessment must be an object.");
  if (expected && assessment.id !== expected.id) throw new Error(`Reflection assessment ID does not match ${expected.url}.`);
  if (typeof assessment.id !== "string" || !assessment.id || typeof assessment.version !== "string" || !assessment.version) throw new Error("Reflection assessment identity and version are required.");
  if (typeof assessment.title !== "string" || !assessment.title.trim() || typeof assessment.description !== "string") throw new Error("Reflection assessment title and description are required.");
  const interactionType = assessment.interactionType || "likertScale";
  if (expected && interactionType !== expected.interactionType) throw new Error(`Reflection assessment ${assessment.id} interaction type changed.`);
  if (interactionType === "likertScale") {
    uniqueIds(assessment.questions, "Reflection questions");
    if (!Array.isArray(assessment.responseScale) || !assessment.responseScale.length) throw new Error("Reflection response scale must be non-empty.");
    for (const option of assessment.responseScale) if (!plainObject(option) || !Number.isFinite(Number(option.value)) || typeof option.text !== "string") throw new Error("Reflection response options are malformed.");
  } else if (interactionType === "cardSort") {
    uniqueIds(assessment.sections, "Reflection sections");
    for (const section of assessment.sections) {
      uniqueIds(section.items, `Reflection section ${section.id} items`);
      uniqueIds(section.categories, `Reflection section ${section.id} categories`);
    }
  } else throw new Error("Reflection interaction type is unsupported.");
  validateAssessmentScoring(assessment);
  return true;
}

validateReflectionCatalog();
