import {
  MATTER_TYPES,
  matterRoutes,
  matterType,
  nextMatterStep
} from "./modules/matter-types.js";
import {
  activeWorkOSModules,
  workOSModuleForFamily
} from "./workos/catalog.js";
import {
  WORKOS_COMPOSITION_CONTRACT,
  workOSNavigation
} from "./workos/shell.js";

export const WORKOS_ADAPTER_VERSION = "1.0.0";
export const WORKOS_APP_OWNER = "commonground";

export { MATTER_TYPES, WORKOS_COMPOSITION_CONTRACT, workOSNavigation };

export function workOSMatterType(type) {
  return matterType(type);
}

export function workOSMatterRoutes(type) {
  return matterRoutes(type);
}

export function workOSNextMatterStep(matter, graph) {
  return nextMatterStep(matter, graph);
}

export function workOSModuleForMatterType(type) {
  return workOSModuleForFamily(matterType(type).family);
}

export function workOSModuleSummaries(matters = []) {
  return activeWorkOSModules().map((module) => Object.freeze({
    id: module.id,
    label: module.label,
    description: module.description,
    count: matters.filter((matter) => workOSModuleForMatterType(matter.type)?.id === module.id).length
  }));
}
