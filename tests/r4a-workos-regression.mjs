import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  MATTER_TYPES,
  matterRoutes,
  matterType,
  nextMatterStep
} from "../apps/commonground/modules/matter-types.js";
import {
  WORKOS_CATALOG_VERSION,
  WORKOS_MODULES,
  activeWorkOSModules,
  workOSModule
} from "../apps/commonground/workos/catalog.js";
import {
  WORKOS_COMPOSITION_CONTRACT,
  WORKOS_SHELL_VERSION,
  workOSNavigation
} from "../apps/commonground/workos/shell.js";
import {
  WORKOS_ADAPTER_VERSION,
  WORKOS_APP_OWNER,
  workOSMatterRoutes,
  workOSMatterType,
  workOSModuleForMatterType,
  workOSModuleSummaries,
  workOSNextMatterStep
} from "../apps/commonground/workos-adapter.js";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");
const semver = /^\d+\.\d+\.\d+$/;

for (const version of [WORKOS_CATALOG_VERSION, WORKOS_SHELL_VERSION, WORKOS_ADAPTER_VERSION]) {
  assert.match(version, semver, `WorkOS version is not stable semver: ${version}`);
}
assert.equal(WORKOS_CATALOG_VERSION, "1.0.0");
assert.equal(WORKOS_SHELL_VERSION, "1.0.0");
assert.equal(WORKOS_ADAPTER_VERSION, "1.0.0");
assert.equal(WORKOS_APP_OWNER, "commonground");

assert.deepEqual(WORKOS_MODULES.map(({ id }) => id), [
  "collaboration",
  "decisions",
  "insights",
  "learning",
  "knowledge"
]);
assert.deepEqual(activeWorkOSModules().map(({ id }) => id), ["collaboration", "decisions"]);
assert.deepEqual(WORKOS_MODULES.filter(({ status }) => status === "inactive").map(({ id }) => id), [
  "insights",
  "learning",
  "knowledge"
]);
assert.ok(Object.isFrozen(WORKOS_MODULES));
for (const module of WORKOS_MODULES) {
  assert.ok(Object.isFrozen(module), `${module.id} catalog record must be immutable`);
  assert.ok(["active", "inactive"].includes(module.status));
  assert.equal(module.mutationOwner, module.status === "active" ? "commonground" : null);
  assert.ok(Array.isArray(module.prerequisites));
  if (module.status === "inactive") {
    assert.equal(module.route, null);
    assert.ok(module.prerequisites.length > 0, `${module.id} needs explicit activation prerequisites`);
  }
  assert.equal(workOSModule(module.id), module);
}
assert.equal(workOSModule("missing"), null);

const navigation = workOSNavigation("dashboard");
assert.deepEqual(navigation.map(({ route, label }) => [route, label]), [
  ["dashboard", "Dashboard"],
  ["matters", "Matters"],
  ["settings", "Settings"]
]);
assert.equal(navigation.filter(({ current }) => current).length, 1);
assert.equal(workOSNavigation("unsupported").filter(({ current }) => current).length, 0);

for (const type of Object.keys(MATTER_TYPES)) {
  assert.deepEqual(workOSMatterType(type), matterType(type));
  assert.deepEqual(workOSMatterRoutes(type), matterRoutes(type));
  const expectedModule = matterType(type).family === "decision" ? "decisions" : "collaboration";
  assert.equal(workOSModuleForMatterType(type).id, expectedModule);
}

const emptyGraph = {
  intakeRecords: [],
  issueNodes: [],
  sessions: [],
  commitments: [],
  followUps: [],
  decisionBriefs: [],
  decisionItems: []
};
for (const type of Object.keys(MATTER_TYPES)) {
  const matter = { type, suitabilityState: type === "decision-analysis" ? "not-applicable" : "pending" };
  assert.deepEqual(workOSNextMatterStep(matter, emptyGraph), nextMatterStep(matter, emptyGraph));
}

const summaries = workOSModuleSummaries([
  { type: "conflict-resolution" },
  { type: "negotiation" },
  { type: "decision-analysis" }
]);
assert.deepEqual(summaries.map(({ id, count }) => [id, count]), [
  ["collaboration", 2],
  ["decisions", 1]
]);
assert.equal(summaries.some(({ id }) => ["insights", "learning", "knowledge"].includes(id)), false);

for (const key of ["assumptions", "guarantees", "nonGoals", "safeFailure", "rollback"]) {
  assert.ok(Array.isArray(WORKOS_COMPOSITION_CONTRACT[key]));
  assert.ok(WORKOS_COMPOSITION_CONTRACT[key].length > 0, `Composition contract missing ${key}`);
}
for (const phrase of [
  "app-owned",
  "no shared store",
  "no cross-app reads",
  "code-only"
]) {
  assert.ok(
    JSON.stringify(WORKOS_COMPOSITION_CONTRACT).toLowerCase().includes(phrase),
    `Composition contract missing ${phrase}`
  );
}

const sourcePaths = [
  "apps/commonground/workos/catalog.js",
  "apps/commonground/workos/shell.js",
  "apps/commonground/workos-adapter.js"
];
const sources = await Promise.all(sourcePaths.map(read));
const source = sources.join("\n");
for (const forbidden of [
  "indexedDB",
  "localStorage",
  "sessionStorage",
  "BroadcastChannel",
  "navigator.serviceWorker",
  "fetch(",
  "apps/ts-dash",
  "apps/pmquiz"
]) {
  assert.equal(source.includes(forbidden), false, `WorkOS foundation gained forbidden runtime capability: ${forbidden}`);
}

const [app, db, shell, worker, deliverables] = await Promise.all([
  read("apps/commonground/app.js"),
  read("apps/commonground/modules/db.js"),
  JSON.parse(await read("apps/commonground/pwa-shell.json")),
  read("apps/commonground/sw.js"),
  JSON.parse(await read("config/deliverables.json"))
]);
assert.ok(app.includes('./workos-adapter.js'));
assert.ok(app.includes("workOSNavigation"));
assert.ok(app.includes("workOSModuleSummaries"));
for (const phrase of [
  'DB_NAME = "commonground-suite"',
  "DB_VERSION = 4",
  "SCHEMA_VERSION = 4",
  '"decisionBriefs"',
  '"decisionItems"',
  '"migrationReceipts"',
  '"transferReceipts"'
]) {
  assert.ok(db.includes(phrase), `CommonGround persisted contract drifted: ${phrase}`);
}
for (const asset of [
  "./workos/catalog.js",
  "./workos/shell.js",
  "./workos-adapter.js"
]) {
  const entry = shell.assets.find(({ url }) => url === asset);
  assert.match(entry?.sha256 || "", /^[a-f0-9]{64}$/, `WorkOS shell asset is not integrity-bound: ${asset}`);
}
const commonGround = deliverables.deliverables.find(({ id }) => id === "commonground");
assert.equal(shell.shellVersion, commonGround.shellVersion);
assert.ok(worker.includes(`shellVersion: "${commonGround.shellVersion}"`));
assert.equal(shell.dataSchemaVersion, 4);
assert.deepEqual(shell.compatibleDataSchemas, [3, 4]);

console.log("R4A WorkOS catalog, shell, adapter, ownership, parity, and PWA regression passed.");
