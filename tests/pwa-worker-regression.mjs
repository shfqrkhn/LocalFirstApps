import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const workerSource = await readFile(new URL("../shared/pwa-worker.js", import.meta.url), "utf8");
const assetBody = "<!doctype html><title>complete</title>";
const assetHash = createHash("sha256").update(assetBody).digest("hex");

class MemoryCache {
  constructor({ failPut = false } = {}) { this.entries = new Map(); this.failPut = failPut; }
  async put(key, response) {
    if (this.failPut) throw new DOMException("Synthetic quota exhaustion", "QuotaExceededError");
    this.entries.set(typeof key === "string" ? key : key.url, response.clone());
  }
  async match(key) { return this.entries.get(typeof key === "string" ? key : key.url)?.clone(); }
  async keys() { return [...this.entries.keys()].map((url) => new Request(url)); }
}

function makeHarness(mode) {
  const stores = new Map([
    ["fixture-shell-previous", new MemoryCache()],
    ["fixture-shell-incomplete", new MemoryCache()],
    ["foreign-app-shell", new MemoryCache()]
  ]);
  const events = new Map();
  const currentName = "fixture-shell-2";
  const caches = {
    async keys() { return [...stores.keys()]; },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache({ failPut: name === currentName && mode === "quota" }));
      return stores.get(name);
    },
    async delete(name) { return stores.delete(name); }
  };
  let skipCount = 0;
  const self = {
    location: { href: "https://local.test/apps/fixture/sw.js" },
    registration: { scope: "https://local.test/apps/fixture/" },
    clients: { claim: async () => {} },
    addEventListener(type, listener) { events.set(type, listener); },
    skipWaiting() { skipCount += 1; }
  };
  const manifest = {
    contractVersion: "1.0.0", appId: "fixture", shellVersion: "2", dataSchemaVersion: 1,
    compatibleDataSchemas: [1], navigationFallback: "./index.html",
    assets: [{ url: "./index.html", sha256: assetHash }]
  };
  const fetch = async (request) => {
    if (request.url.endsWith("pwa-shell.json")) return new Response(JSON.stringify(manifest), { status: 200 });
    if (mode === "missing") return new Response("missing", { status: 404 });
    return new Response(mode === "corrupt" ? `${assetBody}!` : assetBody, { status: 200 });
  };
  vm.runInNewContext(workerSource, { self, URL, Request, Response, DOMException, crypto: webcrypto, fetch, caches, Date, Set, Map, Object, String, Error, Uint8Array });
  self.LFAPwaWorker.register({ appId: "fixture", cachePrefix: "fixture-", shellVersion: "2", dataSchemaVersion: 1, compatibleDataSchemas: [1], manifestUrl: "./pwa-shell.json" });
  return { stores, events, currentName, skipCount: () => skipCount };
}

for (const mode of ["missing", "corrupt", "quota"]) {
  const { stores, events, currentName } = makeHarness(mode);
  let installPromise;
  events.get("install")({ waitUntil(promise) { installPromise = promise; } });
  await assert.rejects(installPromise, mode === "quota" ? /quota|exhaustion/i : /integrity/i);
  assert.equal(stores.has(currentName), false, `${mode} candidate cache must be removed`);
  assert.equal(stores.has("fixture-shell-previous"), true, `${mode} failure must retain the prior shell`);
}

const activation = makeHarness("healthy");
activation.events.get("message")({ data: { type: "LFA_ACTIVATE_UPDATE" }, source: { url: "https://local.test/apps/other/" } });
assert.equal(activation.skipCount(), 0, "a sibling app must not activate this worker");
activation.events.get("message")({ data: { type: "LFA_ACTIVATE_UPDATE" }, source: { url: "https://local.test/apps/fixture/" } });
assert.equal(activation.skipCount(), 1, "an in-scope client may explicitly activate this worker");

let installPromise;
activation.events.get("install")({ waitUntil(promise) { installPromise = promise; } });
await installPromise;
let activatePromise;
activation.events.get("activate")({ waitUntil(promise) { activatePromise = promise; } });
await activatePromise;
assert.equal(activation.stores.has("foreign-app-shell"), true, "activation must retain foreign caches");
assert.equal(activation.stores.has("fixture-shell-incomplete"), false, "activation must remove incomplete app-owned caches");

console.log("PWA worker fail-closed and foreign-cache isolation regression passed.");
