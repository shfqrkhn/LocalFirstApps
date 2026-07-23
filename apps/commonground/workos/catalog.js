export const WORKOS_CATALOG_VERSION = "1.0.0";

function moduleRecord(value) {
  return Object.freeze({
    ...value,
    matterFamilies: Object.freeze([...(value.matterFamilies || [])]),
    prerequisites: Object.freeze([...(value.prerequisites || [])])
  });
}

export const WORKOS_MODULES = Object.freeze([
  moduleRecord({
    id: "collaboration",
    label: "Collaboration",
    description: "Facilitation, alignment, negotiation, and accountable follow-up.",
    status: "active",
    owner: "commonground",
    mutationOwner: "commonground",
    route: "matters",
    matterFamilies: ["facilitation"],
    prerequisites: []
  }),
  moduleRecord({
    id: "decisions",
    label: "Decisions",
    description: "Evidence, assumptions, hard constraints, options, governance, and outcome review.",
    status: "active",
    owner: "commonground",
    mutationOwner: "commonground",
    route: "matters",
    matterFamilies: ["decision"],
    prerequisites: []
  }),
  moduleRecord({
    id: "insights",
    label: "Insights",
    description: "Generic local analysis through a future readable TS-Dash successor.",
    status: "inactive",
    owner: "ts-dash",
    mutationOwner: null,
    route: null,
    matterFamilies: [],
    prerequisites: [
      "Readable behavior-parity rewrite",
      "Explicit file-transfer contract",
      "Offline, accessibility, recovery, and owner acceptance"
    ]
  }),
  moduleRecord({
    id: "learning",
    label: "Learning",
    description: "Governed study and quiz workflows through a future PMQuiz adapter.",
    status: "inactive",
    owner: "pmquiz",
    mutationOwner: null,
    route: null,
    matterFamilies: [],
    prerequisites: [
      "Qualified content and license review",
      "Deduplication and provenance closure",
      "Deterministic session, export, and recovery contract"
    ]
  }),
  moduleRecord({
    id: "knowledge",
    label: "Knowledge",
    description: "Explicit user-selected sources in a future local knowledge library.",
    status: "inactive",
    owner: "unassigned",
    mutationOwner: null,
    route: null,
    matterFamilies: [],
    prerequisites: [
      "Accepted app owner and purpose",
      "User-controlled source, storage, export, deletion, and recovery contracts",
      "No hidden aggregation"
    ]
  })
]);

export function workOSModule(id) {
  return WORKOS_MODULES.find((module) => module.id === id) || null;
}

export function activeWorkOSModules() {
  return WORKOS_MODULES.filter(({ status }) => status === "active");
}

export function workOSModuleForFamily(family) {
  return activeWorkOSModules().find(({ matterFamilies }) => matterFamilies.includes(family)) || null;
}
