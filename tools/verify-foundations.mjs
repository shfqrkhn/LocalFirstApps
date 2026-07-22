import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRuntime } from "./build-runtime.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const json = async (relativePath) => JSON.parse(await read(relativePath));

async function filesUnder(relativeDirectory, output = []) {
  for (const entry of await readdir(path.join(root, relativeDirectory), { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) await filesUnder(relativePath, output);
    else if (entry.isFile()) output.push(relativePath);
  }
  return output;
}

function pngDimensions(bytes, relativePath) {
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", `${relativePath} must be PNG`);
  assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR", `${relativePath} missing IHDR`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function verifyManifestMedia() {
  const manifestPaths = (await filesUnder("apps")).filter((file) => /manifest(?:\.webmanifest|\.json)$/.test(file));
  let verified = 0;
  for (const manifestPath of manifestPaths) {
    const manifest = await json(manifestPath);
    for (const descriptor of [...(manifest.icons || []), ...(manifest.screenshots || [])]) {
      if (descriptor.type !== "image/png" || !descriptor.sizes) continue;
      const assetPath = path.posix.normalize(path.posix.join(path.posix.dirname(manifestPath), descriptor.src));
      const dimensions = pngDimensions(await readFile(path.join(root, assetPath)), assetPath);
      const declared = descriptor.sizes.split(/\s+/).map((size) => size.split("x").map(Number));
      assert(declared.some(([width, height]) => width === dimensions.width && height === dimensions.height),
        `${manifestPath} declares ${descriptor.sizes} for ${assetPath}, actual ${dimensions.width}x${dimensions.height}`);
      verified += 1;
    }
  }
  assert(verified >= 10, "Expected manifest media coverage across the suite");
  return verified;
}

async function verifyVersions() {
  const contract = await json("config/deliverables.json");
  const byId = new Map(contract.deliverables.map((item) => [item.id, item]));
  assert.equal((await json("package.json")).version, contract.suite.version);

  const checks = [
    ["pmquiz", "apps/pmquiz/service-worker.js", `selfquiz-cache-v${byId.get("pmquiz").shellVersion}`],
    ["noodle-nudge-app", "apps/noodle-nudge/index.html", `version: \"${byId.get("noodle-nudge").appVersion}\"`],
    ["noodle-nudge-worker", "apps/noodle-nudge/service-worker.js", `shellVersion: \"${byId.get("noodle-nudge").shellVersion}\"`],
    ["noodle-nudge-shell", "apps/noodle-nudge/pwa-shell.json", `\"shellVersion\": \"${byId.get("noodle-nudge").shellVersion}\"`],
    ["flexx-constant", "apps/flexx-files/js/constants.js", `APP_VERSION = '${byId.get("flexx-files").appVersion}'`],
    ["flexx-worker", "apps/flexx-files/sw.js", `shellVersion: \"${byId.get("flexx-files").shellVersion}\"`],
    ["flexx-shell", "apps/flexx-files/pwa-shell.json", `\"shellVersion\": \"${byId.get("flexx-files").shellVersion}\"`],
    ["healthos-worker", "apps/healthos/sw.js", `shellVersion: \"${byId.get("healthos").shellVersion}\"`],
    ["healthos-shell", "apps/healthos/pwa-shell.json", `\"shellVersion\": \"${byId.get("healthos").shellVersion}\"`],
    ["commonground-app", "apps/commonground/app.js", `APP_VERSION = \"${byId.get("commonground").appVersion}\"`],
    ["commonground-worker", "apps/commonground/sw.js", `shellVersion: \"${byId.get("commonground").shellVersion}\"`],
    ["commonground-shell", "apps/commonground/pwa-shell.json", `\"shellVersion\": \"${byId.get("commonground").shellVersion}\"`]
  ];
  for (const [label, relativePath, expected] of checks) {
    assert((await read(relativePath)).includes(expected), `${label} does not project config/deliverables.json`);
  }
  assert.equal((await json("apps/flexx-files/package.json")).version, byId.get("flexx-files").appVersion);
  assert.equal((await json("apps/flexx-files/package-lock.json")).version, byId.get("flexx-files").appVersion);
  assert((await read("apps/flexx-files/README.md")).includes(`**Version:** ${byId.get("flexx-files").appVersion}`));
  return checks.length + 4;
}

async function verifyDependencies() {
  const dependencyContract = await json("config/dependencies.json");
  assert(dependencyContract.components.length >= 9, "Dependency inventory is unexpectedly incomplete");
  for (const component of dependencyContract.components) {
    assert(component.name && component.version && component.license && component.replacement);
    assert(component.sourceUrl && component.checkedAt && component.provenanceStatus, `${component.name} lacks provenance metadata`);
    assert.notEqual(component.license, "NOASSERTION", `${component.name} has no license decision`);
    assert(component.evidence.length > 0, `${component.name} needs local evidence`);
    for (const evidencePath of component.evidence) await readFile(path.join(root, evidencePath));
  }
  return dependencyContract.components.length;
}

async function verifyGovernanceAndDesign() {
  const ledger = await json("governance/content-review-ledger.json");
  assert.equal(ledger.schemaVersion, 1);
  assert(ledger.entries.length >= 3500, "Content inventory is unexpectedly incomplete");
  assert.equal(ledger.entries.filter((entry) => entry.app === "pmquiz").length, 1774);
  assert.equal(ledger.duplicateGroups.length, 41);
  for (const entry of ledger.entries) {
    for (const field of ["id", "app", "kind", "location", "contentHash", "status", "evidenceStrength", "claimLimits"]) {
      assert(Object.hasOwn(entry, field), `${entry.id || "content entry"} lacks ${field}`);
    }
    assert.equal(entry.status, "quarantined", `${entry.id} must remain quarantined until reviewed`);
  }
  const tokens = await read("shared/design-tokens.css");
  for (const token of ["--cg-surface", "--cg-text", "--cg-accent", "--cg-focus", "--cg-touch-target", "--cg-motion-normal"]) {
    assert(tokens.includes(token), `Design system lacks ${token}`);
  }
  assert(tokens.includes("prefers-color-scheme: dark"));
  assert(tokens.includes("prefers-reduced-motion: reduce"));
  return { entries: ledger.entries.length, duplicateGroups: ledger.duplicateGroups.length };
}

async function verifyLegacyTsDash() {
  const contract = await json("config/ts-dash-legacy.json");
  assert.equal(contract.status, "source-unavailable-behavior-frozen");
  assert.equal(contract.editableGeneratedFiles, false);
  for (const artifact of contract.artifacts) {
    const bytes = await readFile(path.join(root, artifact.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256, `${artifact.path} changed outside a readable-source build`);
  }
  const sourceMaps = (await filesUnder("apps/ts-dash")).filter((file) => file.endsWith(".map"));
  assert.deepEqual(sourceMaps, []);
  return contract.artifacts.length;
}

async function verifyCspAndExternalRuntime() {
  const htmlFiles = (await filesUnder("apps")).filter((file) => file.endsWith(".html"));
  let cspCount = 0;
  for (const htmlPath of htmlFiles) {
    const source = await read(htmlPath);
    assert(!source.includes("unsafe-eval"), `${htmlPath} permits unsafe-eval`);
    const csp = source.match(/Content-Security-Policy[^>]+content="([^"]+)"/i)?.[1];
    if (csp) cspCount += 1;
    for (const match of source.matchAll(/<script\b[^>]+src="(https?:\/\/[^\"]+)"/gi)) {
      throw new Error(`${htmlPath} has external runtime script ${match[1]}`);
    }
    for (const match of source.matchAll(/<link\b([^>]+)>/gi)) {
      const attributes = match[1];
      const href = attributes.match(/href="(https?:\/\/[^\"]+)"/i)?.[1];
      const rel = attributes.match(/rel="([^\"]+)"/i)?.[1] || "";
      if (href && /(?:stylesheet|modulepreload|preload)/i.test(rel)) throw new Error(`${htmlPath} has external runtime link ${href}`);
    }
  }
  assert(cspCount >= 5, "Expected explicit CSP coverage for primary apps");
  return { htmlFiles: htmlFiles.length, cspCount };
}

async function verifyDeterministicArtifact() {
  const left = ".r1-build-left";
  const right = ".r1-build-right";
  try {
    const first = await buildRuntime({ outputDirectory: left });
    const second = await buildRuntime({ outputDirectory: right });
    assert.deepEqual(first.manifest, second.manifest, "Runtime artifact is not deterministic");
    const forbidden = /^(?:archive|docs|tests|tools|config|node_modules|test-results|\.git)(?:\/|$)/;
    for (const entry of first.manifest.files) assert(!forbidden.test(entry.path), `Forbidden artifact path: ${entry.path}`);
    assert(first.manifest.files.some((entry) => entry.path === "apps/ledgersuite/index.html"));
    return first.manifest.fileCount;
  } finally {
    await rm(path.join(root, left), { recursive: true, force: true });
    await rm(path.join(root, right), { recursive: true, force: true });
  }
}

const versions = await verifyVersions();
const media = await verifyManifestMedia();
const dependencies = await verifyDependencies();
const governance = await verifyGovernanceAndDesign();
const legacyArtifacts = await verifyLegacyTsDash();
const csp = await verifyCspAndExternalRuntime();
const artifactFiles = await verifyDeterministicArtifact();
for (const requiredDocument of [
  "docs/TS_DASH_REWRITE_CONTRACT.md",
  "docs/DESIGN_LANGUAGE.md",
  "docs/OMNICORE_BOUNDARIES.md",
  "docs/ACCESSIBILITY_TEST_MATRIX.md"
]) await read(requiredDocument);
console.log(`R1 foundations passed: ${versions} version projections, ${media} media descriptors, ${dependencies} dependencies, ${governance.entries} governed records/${governance.duplicateGroups} duplicate groups, ${legacyArtifacts} frozen TS-Dash artifacts, ${csp.cspCount}/${csp.htmlFiles} CSPs, ${artifactFiles} artifact files.`);
