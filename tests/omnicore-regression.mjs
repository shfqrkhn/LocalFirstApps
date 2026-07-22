import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as commonGround from "../apps/commonground/modules/omnicore-adapter.js";
import * as healthOs from "../apps/healthos/omnicore-adapter.js";
import { OMNICORE_ERRORS_VERSION } from "../shared/omnicore/errors.js";
import { OMNICORE_INDEXEDDB_VERSION } from "../shared/omnicore/indexeddb.js";
import { OMNICORE_INTEGRITY_VERSION } from "../shared/omnicore/integrity.js";
import { OMNICORE_RECEIPTS_VERSION } from "../shared/omnicore/receipts.js";
import { OMNICORE_TIME_VERSION } from "../shared/omnicore/time.js";

const fixture = JSON.parse(await readFile(new URL("./fixtures/omnicore-contract-v1.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../shared/omnicore/manifest.json", import.meta.url), "utf8"));
const commonGroundShell = JSON.parse(await readFile(new URL("../apps/commonground/pwa-shell.json", import.meta.url), "utf8"));
const healthOsShell = JSON.parse(await readFile(new URL("../apps/healthos/pwa-shell.json", import.meta.url), "utf8"));

assert.equal(manifest.contractVersion, fixture.contractVersion);
assert.equal(manifest.license, "MIT");
assert.deepEqual(
  [OMNICORE_ERRORS_VERSION, OMNICORE_INDEXEDDB_VERSION, OMNICORE_INTEGRITY_VERSION, OMNICORE_RECEIPTS_VERSION, OMNICORE_TIME_VERSION],
  Array(5).fill(fixture.contractVersion)
);
assert.ok(manifest.nonGoals.includes("suite database"));
assert.ok(manifest.nonGoals.includes("universal service worker"));
for (const module of manifest.modules) {
  assert.match(module.version, /^\d+\.\d+\.\d+$/);
  assert.ok(module.consumers.length >= 2, `${module.id} requires two proven consumers`);
  assert.ok(module.adapters.length >= 2, `${module.id} requires explicit adapters`);
  assert.ok(module.failureContract, `${module.id} requires a failure contract`);
}

for (const adapter of [commonGround, healthOs]) {
  assert.equal(adapter.canonicalJson(fixture.unordered), fixture.canonicalJson);
  assert.equal(await adapter.sha256(fixture.unordered), fixture.sha256);
  assert.equal(adapter.nowIso(Date.parse(fixture.instant)), fixture.instant);
  assert.equal(adapter.isIsoInstant(fixture.instant), true);
  assert.equal(adapter.isIsoInstant("not-an-instant"), false);
  assert.equal(adapter.errorMessage("bad", "fallback"), "fallback");
  assert.deepEqual(adapter.validationReport(["first", "first", "second"]).issues, ["first", "second"]);

  assert.throws(
    () => adapter.assertExpectedRevision({ revision: 2 }, 1, { conflictMessage: "stale" }),
    (error) => error instanceof adapter.OmniCoreError && error.code === "STALE_REVISION" && error.message === "stale"
  );
  const receipt = { id: "receipt-1", status: "applied", createdIds: ["record-1"] };
  assert.deepEqual(adapter.rolledBackReceipt(receipt, { at: fixture.instant }), {
    ...receipt,
    status: "rolled-back",
    rolledBackAt: fixture.instant
  });
  assert.throws(
    () => adapter.assertReceiptCanRollback({ ...receipt, status: "rolled-back" }),
    (error) => error instanceof adapter.OmniCoreError && error.code === "RECEIPT_ALREADY_ROLLED_BACK"
  );

  const successRequest = { result: { id: "record-1" }, error: null };
  const success = adapter.requestResult(successRequest);
  successRequest.onsuccess();
  assert.deepEqual(await success, { id: "record-1" });

  const requestFailure = new DOMException("synthetic quota", "QuotaExceededError");
  let requestErrorListener;
  const failedRequest = {
    error: requestFailure,
    addEventListener(type, listener) { if (type === "error") requestErrorListener = listener; }
  };
  const transaction = { error: null };
  adapter.trackTransactionRequest(transaction, failedRequest);
  const completion = adapter.transactionDone(transaction);
  requestErrorListener();
  transaction.onerror();
  await assert.rejects(completion, (error) => error === requestFailure);

  let aborted = false;
  adapter.abortTransaction({ readyState: "active", abort() { aborted = true; } });
  assert.equal(aborted, true);
}

for (const shell of [commonGroundShell, healthOsShell]) {
  const assets = new Set(shell.assets.map(({ url }) => url));
  for (const required of [
    "../../shared/omnicore/errors.js",
    "../../shared/omnicore/indexeddb.js",
    "../../shared/omnicore/integrity.js",
    "../../shared/omnicore/receipts.js",
    "../../shared/omnicore/time.js",
    "../../shared/design-primitives.css",
    "../../shared/design-tokens.css"
  ]) assert.ok(assets.has(required), `${shell.appId} offline shell missing ${required}`);
  assert.ok(shell.assets.every(({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256)), `${shell.appId} shell hashes must be complete`);
}

assert.deepEqual(manifest.excludedDomainModules, [
  "apps/healthos/modules/healthos.js",
  "apps/healthos/modules/focus-timer.js"
]);

console.log("OmniCore two-consumer contract and fault regression passed.");
