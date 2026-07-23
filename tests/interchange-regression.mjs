import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createInterchangePackage,
  parseInterchangeFile,
  parseInterchangeText,
  sha256,
  validateInterchangePackage
} from "../shared/interchange.js";

const fixture = JSON.parse(await readFile(new URL("../shared/fixtures/commonground-matter-record-v1.json", import.meta.url), "utf8"));

async function packageWith(overrides = {}) {
  return createInterchangePackage({
    sourceApp: "commonground",
    timezone: "America/Toronto",
    records: [{ ...structuredClone(fixture), ...(overrides.record || {}) }],
    selection: { fixture: true },
    extensions: { futurePackageField: { preserve: true }, ...(overrides.extensions || {}) }
  });
}

async function rehash(value) {
  value.manifest.recordHashes = await Promise.all(value.records.map(async (record) => ({ id: record.id, sha256: await sha256(record) })));
  const copy = structuredClone(value);
  delete copy.manifest.packageHash;
  value.manifest.packageHash = await sha256(copy);
  return value;
}

const valid = await packageWith();
const proof = await validateInterchangePackage(valid);
assert.equal(proof.forwardMinor, false);
const roundTrip = await parseInterchangeText(JSON.stringify(valid));
assert.deepEqual(roundTrip.futurePackageField, { preserve: true });
assert.deepEqual(roundTrip.records[0].futureRecordField, { preserve: true });
assert.deepEqual(roundTrip.records[0].payload.futurePayloadField, { preserve: true });
assert.equal(roundTrip.records[0].timezone, "America/Toronto");
assert.equal(roundTrip.records[0].truthClass, "user-authored");
assert.equal(roundTrip.records[0].revision, 1);

const compatibleMinor = await rehash(structuredClone(valid));
compatibleMinor.formatVersion = "1.7.0";
await rehash(compatibleMinor);
assert.equal((await validateInterchangePackage(compatibleMinor)).forwardMinor, true);

const unsupportedMajor = structuredClone(valid);
unsupportedMajor.formatVersion = "2.0.0";
await rehash(unsupportedMajor);
await assert.rejects(() => validateInterchangePackage(unsupportedMajor), /Unsupported interchange major version 2/);

const forgedReplayKey = structuredClone(valid);
forgedReplayKey.records[0].idempotencyKey = "forged-replay-key";
forgedReplayKey.manifest.idempotencyKey = "forged-package-key";
await rehash(forgedReplayKey);
await assert.rejects(() => validateInterchangePackage(forgedReplayKey), /Idempotency metadata mismatch/);

const badTimezone = await packageWith({ record: { timezone: "Not/A-Timezone" } }).catch((error) => error);
assert.match(badTimezone.message, /invalid timezone/);

const corrupt = JSON.stringify(valid).replace("Fixture Workspace", "Changed after hashing");
await assert.rejects(() => parseInterchangeText(corrupt), /hash mismatch/i);
await assert.rejects(() => parseInterchangeText("{not-json"), /not valid JSON/);
await assert.rejects(() => parseInterchangeText(JSON.stringify(valid), { maxBytes: 20 }), /25 MB/);
await assert.rejects(() => parseInterchangeFile({ size: 25 * 1024 * 1024 + 1, text: async () => "{}" }), /25 MB/);

const hostile = structuredClone(valid);
let nested = hostile.records[0].payload;
for (let index = 0; index < 30; index += 1) nested = nested.next = {};
await assert.rejects(() => validateInterchangePackage(hostile), /nested too deeply/);

const duplicate = structuredClone(valid);
duplicate.records.push(structuredClone(duplicate.records[0]));
duplicate.manifest.recordCount = 2;
duplicate.manifest.recordHashes.push(structuredClone(duplicate.manifest.recordHashes[0]));
await rehash(duplicate);
await assert.rejects(() => validateInterchangePackage(duplicate), /Duplicate record ID/);

console.log("Interchange contract regression passed.");
