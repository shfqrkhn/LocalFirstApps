import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PWA_ASSURANCE_VERSION, classifyStorageEstimate, schemaCompatible } from "../shared/pwa-assurance.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const pilots = [
  { app: "commonground", manifest: "apps/commonground/pwa-shell.json", shell: "0.2.2-m2", schema: 4 },
  { app: "flexx-files", manifest: "apps/flexx-files/pwa-shell.json", shell: "3.9.74", schema: "v3" },
  { app: "healthos", manifest: "apps/healthos/pwa-shell.json", shell: "0.1.0-m3a", schema: 1 }
];

for (const pilot of pilots) {
  const manifestPath = resolve(root, pilot.manifest);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.contractVersion, PWA_ASSURANCE_VERSION);
  assert.equal(manifest.appId, pilot.app);
  assert.equal(manifest.shellVersion, pilot.shell);
  assert.equal(manifest.dataSchemaVersion, pilot.schema);
  assert.equal(schemaCompatible(manifest, pilot.schema), true);
  assert.ok(manifest.assets.length >= 10, `${pilot.app} shell is unexpectedly incomplete.`);
  assert.equal(new Set(manifest.assets.map((asset) => asset.url)).size, manifest.assets.length);
  assert.ok(manifest.assets.some((asset) => asset.url === manifest.navigationFallback));
  for (const asset of manifest.assets) {
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    const absolute = resolve(dirname(manifestPath), asset.url);
    const repositoryRelative = relative(root, absolute);
    assert.ok(repositoryRelative && !repositoryRelative.startsWith("..") && !resolve(repositoryRelative).startsWith(".."), `${pilot.app} asset escapes the repository.`);
    const digest = createHash("sha256").update(await readFile(absolute)).digest("hex");
    assert.equal(digest, asset.sha256, `${pilot.app} shell hash drift: ${asset.url}`);
  }
}

const worker = await readFile(resolve(root, "shared/pwa-worker.js"), "utf8");
for (const phrase of ["cache: \"reload\"", "responseHash", "caches.delete(currentCacheName)", "LFA_ACTIVATE_UPDATE", "sourceInScope", "recoveredFromPrevious", "Selected offline shell is incomplete"]) {
  assert.ok(worker.includes(phrase), `PWA worker contract missing ${phrase}.`);
}
assert.ok(!/addEventListener\("install"[\s\S]{0,300}skipWaiting/.test(worker), "Install must not activate a candidate automatically.");
assert.equal(schemaCompatible({ compatibleDataSchemas: [3, 4] }, 3), true);
assert.equal(schemaCompatible({ compatibleDataSchemas: [4] }, 3), false);
assert.deepEqual(classifyStorageEstimate(undefined), { available: false, usage: null, quota: null, usageRatio: null, state: "unknown" });
assert.equal(classifyStorageEstimate({ usage: 95, quota: 100 }).state, "high");
assert.equal(classifyStorageEstimate({ usage: 10, quota: 100 }).state, "healthy");

console.log("PWA assurance contract regression passed for CommonGround, Flexx Files, and HealthOS.");
