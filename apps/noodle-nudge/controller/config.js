export const NOODLE_APP_VERSION = "1.2.31";
export const NOODLE_DATA_SCHEMA_VERSION = 1;
export const NOODLE_SHELL_VERSION = "1.2.33-r3e";

export const NOODLE_ASSESSMENT_ORDER = Object.freeze([
  "core_profile_v1.0.0",
  "core_values_v1.0.0",
  "core_agency_v1.0.0",
  "work_motivation_v1.0.0",
  "pss_v1.0.0",
  "conflict_style_v1.0.0",
  "authentic_ethical_leadership_v1.0.0",
  "assertiveness_profile_v1.0.0",
  "power_influence_v1.0.0",
  "proactive_personality_v1.0.0"
]);

const ENGLISH_STRINGS = Object.freeze({
  dashboardTitle: "Today's Nudge",
  assessmentsTitle: "Assessments",
  settingsTitle: "Settings",
  takeAssessmentsCTA: "Discover Your Core Profile",
  takeAssessmentsCTADescription: "Start your journey of self-discovery with our foundational assessments.",
  startAssessment: "Start Assessment",
  retakeAssessment: "Retake",
  submitAnswers: "Submit Answers",
  backToList: "Back to Assessments",
  resultsTitle: "Your Results for",
  viewResults: "View Full Results",
  dailyQuote: "Quote for Today",
  dailyReflection: "Reflection for Today",
  dailyMeditation: "Meditation for Today",
  dailyBias: "Cognitive Bias for Today",
  exportData: "Export My Data",
  importData: "Import My Data",
  resetData: "Reset All Data",
  resetConfirmation: "Are you sure you want to permanently delete all your data? This action cannot be undone.",
  dataExported: "Data exported successfully!",
  dataImported: "Data imported successfully! The app will now reload.",
  dataReset: "All data has been reset.",
  error: "An error occurred."
});

export const NOODLE_CONFIG = Object.freeze({
  appName: "Noodle Nudge",
  appShortName: "NoodleNudge",
  version: NOODLE_APP_VERSION,
  license: "MIT",
  author: "The Sentient Architect",
  appDescription: "A private offline-first PWA for self-discovery.",
  database: Object.freeze({ dbName: "NoodleNudgeDB", dbVersion: NOODLE_DATA_SCHEMA_VERSION, dbStoreName: "appState" }),
  pwaConfig: Object.freeze({ cacheName: `noodle-nudge-cache-v${NOODLE_APP_VERSION}` }),
  featureFlags: Object.freeze({
    enableDailyContent: true,
    enableAssessments: true,
    enableDebugPanel: new URLSearchParams(globalThis.location?.search || "").has("debug")
  }),
  contentUrls: Object.freeze({
    daily: Object.freeze([
      "./JSON/Content_CognitiveBiases.json",
      "./JSON/Content_Meditations.json",
      "./JSON/Content_Quotes.json",
      "./JSON/Content_Reflections.json"
    ])
  }),
  localization: Object.freeze({ defaultLanguage: "en", strings: Object.freeze({ en: ENGLISH_STRINGS }) })
});

export function createInitialNoodleState(now = () => new Date().toISOString()) {
  return {
    assessments: {},
    dailyContent: {},
    userAnswers: {},
    userResults: {},
    userHistory: {},
    viewDate: now(),
    appConfig: { version: NOODLE_APP_VERSION, lastVisit: "" },
    settings: {},
    debugLog: []
  };
}
