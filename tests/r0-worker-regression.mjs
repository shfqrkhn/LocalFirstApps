import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

class MemoryCache {
  constructor() { this.entries = new Map(); }
  async addAll() {}
  async delete(key) { return this.entries.delete(typeof key === "string" ? key : key.url); }
  async keys() { return [...this.entries.keys()].map((url) => new Request(url)); }
  async match(key) { return this.entries.get(typeof key === "string" ? key : key.url); }
  async put(key, response) { this.entries.set(typeof key === "string" ? key : key.url, response); }
}

const source = await readFile(new URL("../apps/pmquiz/service-worker.js", import.meta.url), "utf8");
const stores = new Map([
  ["selfquiz-cache-v1.3.60", new MemoryCache()],
  ["selfquiz-cache-v1.3.61", new MemoryCache()],
  ["selfquiz-data-v1", new MemoryCache()],
  ["selfquiz-fonts-v1", new MemoryCache()],
  ["noodle-nudge-shell-current", new MemoryCache()],
  ["commonground-shell-current", new MemoryCache()]
]);
const events = new Map();
const caches = {
  async keys() { return [...stores.keys()]; },
  async open(name) { if (!stores.has(name)) stores.set(name, new MemoryCache()); return stores.get(name); },
  async delete(name) { return stores.delete(name); }
};
const self = { addEventListener(type, listener) { events.set(type, listener); } };
vm.runInNewContext(source, { self, caches, fetch: async () => new Response("ok"), Request, Response, Promise, Set });

let activation;
events.get("activate")({ waitUntil(promise) { activation = promise; } });
await activation;
assert.equal(stores.has("selfquiz-cache-v1.3.60"), false, "PMQuiz must remove only its superseded shell");
for (const name of ["selfquiz-cache-v1.3.61", "selfquiz-data-v1", "selfquiz-fonts-v1", "noodle-nudge-shell-current", "commonground-shell-current"]) {
  assert.equal(stores.has(name), true, `PMQuiz activation must retain ${name}`);
}
assert.ok(!source.includes("caches.match("), "PMQuiz fetches must not search sibling app caches");
assert.match(source, /key\.startsWith\(CACHE_PREFIX\)/, "PMQuiz cleanup must be prefix scoped");

const noodleWorker = await readFile(new URL("../apps/noodle-nudge/service-worker.js", import.meta.url), "utf8");
assert.match(noodleWorker, /cachePrefix: "noodle-nudge-"/);
assert.match(noodleWorker, /legacyCacheNames: \["noodle-nudge-cache-v1\.2\.29"\]/);
assert.ok(!noodleWorker.includes("caches.keys"), "Noodle must delegate scoped cleanup to the assurance contract");

console.log("R0 PMQuiz and Noodle worker ownership regression passed.");
