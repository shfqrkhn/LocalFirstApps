export const LIFEOS_SHELL_CONTRACT_VERSION = "1.0.0";
export const LIFEOS_SHELL_ID = "commonground-lifeos";
export const LIFEOS_SHELL_NAME = "CommonGround LifeOS";

export const LIFEOS_MODULES = Object.freeze([
  Object.freeze({
    id: "reflection",
    label: "Reflection",
    description: "Noodle Nudge remains independently owned while its pure definitions and scoring are prepared behind an adapter.",
    owner: "noodle-nudge",
    status: "adapter-only",
    href: "../noodle-nudge/",
    dataAccess: "none"
  }),
  Object.freeze({
    id: "strength",
    label: "Strength",
    description: "Flexx Files remains canonical while its pure calculations, readiness, validation, and recovery seams are versioned behind an app-owned adapter.",
    owner: "flexx-files",
    status: "foundation-ready-linked-canonical",
    href: "../flexx-files/",
    dataAccess: "none"
  }),
  Object.freeze({
    id: "focus",
    label: "Focus",
    description: "HealthOS Focus remains the canonical timestamp-reconciled daily-state and focus runtime.",
    owner: "healthos",
    status: "active-seed",
    route: "focus",
    dataAccess: "app-owned"
  })
]);

export function validateLifeOsShellModules(modules = LIFEOS_MODULES) {
  const issues = [];
  if (!Array.isArray(modules) || modules.length !== 3) issues.push("LifeOS must declare exactly the bounded Reflection, Strength, and Focus modules.");
  const ids = new Set();
  for (const module of modules || []) {
    if (!module || typeof module !== "object") { issues.push("Every LifeOS module must be an object."); continue; }
    if (!/^[a-z][a-z0-9-]*$/.test(String(module.id || "")) || ids.has(module.id)) issues.push("LifeOS module IDs must be unique slugs.");
    ids.add(module.id);
    if (!module.label || !module.description || !module.owner || !module.status) issues.push(`LifeOS module ${module.id || "unknown"} is incomplete.`);
    if (!['none', 'app-owned'].includes(module.dataAccess)) issues.push(`LifeOS module ${module.id || "unknown"} has an invalid data boundary.`);
    if (module.owner !== "healthos" && module.dataAccess !== "none") issues.push(`LifeOS module ${module.id || "unknown"} cannot access another app's data.`);
  }
  for (const id of ["reflection", "strength", "focus"]) if (!ids.has(id)) issues.push(`LifeOS module ${id} is required.`);
  return issues;
}
