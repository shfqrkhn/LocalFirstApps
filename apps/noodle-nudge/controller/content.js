import {
  REFLECTION_ASSESSMENT_DEFINITIONS,
  REFLECTION_ASSESSMENT_URLS,
  validateReflectionAssessmentDefinition
} from "../reflection-adapter.js";

export function createContentController({ config, state, logger, fetchImpl = fetch }) {
  const definitionByUrl = new Map(REFLECTION_ASSESSMENT_DEFINITIONS.map((entry) => [entry.url, entry]));

  async function fetchJson(url) {
    try {
      const response = await fetchImpl(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error(`Failed to fetch ${url}:`, error);
      return null;
    }
  }

  function distributeDailyContent(items) {
    if (!items?.length) return [];
    const days = new Array(367);
    for (const item of items) if (item?.day) days[item.day] = item;
    for (let day = 1; day <= 366; day += 1) if (!days[day]) days[day] = items[(day - 1) % items.length];
    return days;
  }

  async function loadAllContent() {
    const allUrls = [...REFLECTION_ASSESSMENT_URLS, ...config.contentUrls.daily];
    const results = await Promise.all(allUrls.map(fetchJson));
    const assessments = {};
    const dailyContent = { cognitiveBiases: [], meditations: [], quotes: [], reflections: [] };

    results.forEach((data, index) => {
      if (!data) return;
      const url = allUrls[index];
      if (REFLECTION_ASSESSMENT_URLS.includes(url)) {
        validateReflectionAssessmentDefinition(data, definitionByUrl.get(url));
        assessments[data.id] = data;
        return;
      }
      if (data.cognitive_biases_and_fallacies) dailyContent.cognitiveBiases = distributeDailyContent(data.cognitive_biases_and_fallacies.biases);
      if (data.meditation_prompts) dailyContent.meditations = distributeDailyContent(data.meditation_prompts);
      if (data.quote_categories) dailyContent.quotes = distributeDailyContent(Object.values(data.quote_categories).flat());
      if (data.reflection_prompts) dailyContent.reflections = distributeDailyContent(data.reflection_prompts);
    });

    if (Object.keys(assessments).length !== REFLECTION_ASSESSMENT_DEFINITIONS.length) {
      throw new Error("Reflection assessment definitions are incomplete; no partial catalog was activated.");
    }
    await state.set({
      assessments,
      dailyContent,
      settings: { ...state.get().settings, lastContentUpdate: new Date().toISOString() }
    });
    logger.info("All content loaded and state updated.");
    return { assessments, dailyContent };
  }

  return Object.freeze({ loadAllContent });
}
