import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFile(resolve(root, path), "utf8");
const tokens = await read("shared/design-tokens.css");
const primitives = await read("shared/design-primitives.css");
const manifest = JSON.parse(await read("shared/omnicore/manifest.json"));
const deliverables = JSON.parse(await read("config/deliverables.json"));

const requiredTokens = [
  "--cg-font-sans", "--cg-leading-body", "--cg-space-4", "--cg-radius-lg",
  "--cg-surface", "--cg-surface-raised", "--cg-surface-subtle",
  "--cg-surface-overlay", "--cg-text", "--cg-text-muted", "--cg-border",
  "--cg-accent", "--cg-accent-contrast", "--cg-success", "--cg-warning",
  "--cg-danger", "--cg-info", "--cg-focus", "--cg-shadow-2",
  "--cg-motion-normal", "--cg-touch-target"
];
for (const token of requiredTokens) {
  assert.ok(tokens.includes(token), `Canonical design vocabulary missing ${token}`);
}
for (const phrase of [
  "prefers-color-scheme: dark", "prefers-reduced-motion: reduce",
  "forced-colors: active", ".cg-card", ".cg-action", ".cg-status-success"
]) {
  assert.ok(`${tokens}\n${primitives}`.includes(phrase), `Shared design contract missing ${phrase}`);
}

const apps = [
  {
    id: "healthos",
    index: "apps/healthos/index.html",
    style: "apps/healthos/styles.css",
    worker: "apps/healthos/sw.js",
    shell: "apps/healthos/pwa-shell.json",
    roles: ["--bg: var(--cg-surface)", "--surface: var(--cg-surface-raised)", "--accent: var(--cg-accent)"]
  },
  {
    id: "noodle-nudge",
    index: "apps/noodle-nudge/index.html",
    style: "apps/noodle-nudge/styles.css",
    worker: "apps/noodle-nudge/service-worker.js",
    shell: "apps/noodle-nudge/pwa-shell.json",
    roles: ["--font-heading: var(--cg-font-sans)", "--bs-primary: var(--cg-accent)", "--bs-body-bg: var(--cg-surface)"]
  },
  {
    id: "flexx-files",
    index: "apps/flexx-files/index.html",
    style: "apps/flexx-files/css/styles.css",
    worker: "apps/flexx-files/sw.js",
    shell: "apps/flexx-files/pwa-shell.json",
    roles: ["--bg-primary: var(--cg-surface)", "--text-primary: var(--cg-text)", "--accent: var(--cg-accent)"]
  }
];

for (const app of apps) {
  const [index, style, worker] = await Promise.all([read(app.index), read(app.style), read(app.worker)]);
  const shell = JSON.parse(await read(app.shell));
  const deliverable = deliverables.deliverables.find(({ id }) => id === app.id);
  assert.ok(index.includes("../../shared/design-primitives.css"), `${app.id} does not load shared design primitives`);
  for (const role of app.roles) assert.ok(style.includes(role), `${app.id} adapter missing ${role}`);
  for (const phrase of ["--cg-focus", "--cg-touch-target", "prefers-reduced-motion: reduce", "forced-colors: active"]) {
    assert.ok(style.includes(phrase), `${app.id} style missing ${phrase}`);
  }
  for (const asset of ["../../shared/design-primitives.css", "../../shared/design-tokens.css"]) {
    assert.ok(worker.includes(asset), `${app.id} worker does not allow ${asset}`);
    const entry = shell.assets.find(({ url }) => url === asset);
    assert.match(entry?.sha256 || "", /^[a-f0-9]{64}$/, `${app.id} shell does not integrity-bind ${asset}`);
  }
  assert.equal(shell.shellVersion, deliverable.shellVersion, `${app.id} shell version drifted`);
}

const design = manifest.modules.find(({ id }) => id === "design");
assert.equal(design.version, "1.1.0");
assert.deepEqual(design.consumers, ["commonground", "healthos", "noodle-nudge", "flexx-files"]);
assert.equal(design.adapters.length, 4);
assert.ok(design.failureContract.includes("data"));
assert.ok(design.failureContract.includes("offline"));

console.log("R3E shared vocabulary, app adapters, PWA integrity, and ownership regression passed.");
