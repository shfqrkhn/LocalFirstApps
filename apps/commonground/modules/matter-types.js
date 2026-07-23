export const MATTER_TYPES = {
  "conflict-resolution": { label: "Conflict Resolution", family: "facilitation" },
  "alignment-review": { label: "Alignment Review", family: "facilitation" },
  negotiation: { label: "Negotiation", family: "facilitation", pack: "Negotiation Pack" },
  "team-health": { label: "Team Health", family: "facilitation", pack: "Team Health Pack" },
  "performance-conversation": { label: "Performance Conversation", family: "facilitation", pack: "Performance Pack" },
  "change-facilitation": { label: "Change Facilitation", family: "facilitation", pack: "Change Pack" },
  "decision-analysis": { label: "Decision Analysis", family: "decision", pack: "Decision Brief" }
};

export const FACILITATION_ROUTES = [
  ["matter-detail", "Overview"],
  ["suitability", "Suitability"],
  ["intake", "People & intake"],
  ["issue-map", "Issues"],
  ["session", "Sessions"],
  ["commitments", "Commitments"],
  ["follow-up", "Follow-ups"],
  ["pack", "Briefing pack"]
];

export const DECISION_ROUTES = [
  ["matter-detail", "Overview"],
  ["decision-framing", "Decision memo"],
  ["decision-evidence", "Evidence & assumptions"],
  ["decision-options", "Options & matrix"],
  ["decision-governance", "Decision & governance"],
  ["decision-outcome", "Outcome review"],
  ["pack", "Decision brief"]
];

export function matterType(type) {
  return MATTER_TYPES[type] || MATTER_TYPES["conflict-resolution"];
}

export function matterRoutes(type) {
  return matterType(type).family === "decision" ? DECISION_ROUTES : FACILITATION_ROUTES;
}

export function nextMatterStep(matter, graph) {
  if (matterType(matter.type).family === "decision") {
    const brief = graph.decisionBriefs?.[0];
    if (!brief?.memo?.question) return ["decision-framing", "Frame the decision"];
    if (!(graph.decisionItems || []).some((item) => item.kind === "evidence")) return ["decision-evidence", "Add evidence"];
    if (!(graph.decisionItems || []).some((item) => item.kind === "option")) return ["decision-options", "Compare options"];
    if (!brief?.decision?.choice) return ["decision-governance", "Record the decision"];
    if (!brief?.outcome?.expectedVsActual) return ["decision-outcome", "Review the outcome"];
    return ["pack", "Review the decision brief"];
  }
  if (matter.suitabilityState === "pending") return ["suitability", "Assess suitability"];
  if (matter.suitabilityState === "routed-out") return ["suitability", "Review route-out"];
  if (!(graph.intakeRecords || []).length) return ["intake", "Capture intake"];
  if (!(graph.issueNodes || []).length) return ["issue-map", "Map issues"];
  if (!(graph.sessions || []).length) return ["session", "Log a session"];
  if (!(graph.commitments || []).length) return ["commitments", "Record commitments"];
  if (!(graph.followUps || []).length) return ["follow-up", "Schedule follow-up"];
  return ["pack", "Review the briefing pack"];
}
