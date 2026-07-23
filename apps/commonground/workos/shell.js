import { activeWorkOSModules } from "./catalog.js";

export const WORKOS_SHELL_VERSION = "1.0.0";

const MAIN_NAVIGATION = Object.freeze([
  Object.freeze({ route: "dashboard", label: "Dashboard" }),
  Object.freeze({ route: "matters", label: "Matters" }),
  Object.freeze({ route: "settings", label: "Settings" })
]);

export const WORKOS_COMPOSITION_CONTRACT = Object.freeze({
  assumptions: Object.freeze([
    "CommonGround IndexedDB v4 and its matter registry remain authoritative.",
    "Collaboration and Decisions are the only active WorkOS modules.",
    "Focused apps remain independently operable and are never read implicitly."
  ]),
  guarantees: Object.freeze([
    "The WorkOS shell and catalog are pure app-owned composition metadata.",
    "CommonGround remains the only mutation authority for active WorkOS records.",
    "Inactive modules expose no route, import, worker, storage, or activation."
  ]),
  nonGoals: Object.freeze([
    "no shared store",
    "no cross-app reads",
    "no synchronization or universal worker",
    "no backend, account, telemetry, AI, or hidden aggregation"
  ]),
  safeFailure: Object.freeze([
    "Unknown and inactive modules fail closed without navigation or mutation.",
    "An incomplete shell candidate is rejected while the last-known-good shell and app data remain intact."
  ]),
  rollback: Object.freeze([
    "R4A rollback is code-only and leaves app-owned records, schemas, receipts, files, workers, and caches compatible."
  ])
});

export function workOSNavigation(currentRoute) {
  return MAIN_NAVIGATION.map((item) => Object.freeze({
    ...item,
    current: item.route === currentRoute
  }));
}

export function workOSActiveCatalog() {
  return activeWorkOSModules();
}
