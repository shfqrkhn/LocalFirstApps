import { canonicalJson, sha256 } from "./omnicore/integrity.js";
import { isIsoInstant, nowIso } from "./omnicore/time.js";

export { canonicalJson, sha256 };

export const INTERCHANGE_FORMAT = "localfirstapps-portable-records";
export const INTERCHANGE_VERSION = "1.0.0";
export const INTERCHANGE_MAJOR = 1;
export const MAX_INTERCHANGE_BYTES = 25 * 1024 * 1024;

const LIMITS = Object.freeze({ records: 500, depth: 24, nodes: 100000, string: 2 * 1024 * 1024 });
const REQUIRED_RECORD_FIELDS = [
  "schemaVersion", "id", "type", "status", "truthClass", "confidence", "owner", "sourceApp",
  "createdAt", "updatedAt", "timezone", "units", "assumptions", "conflicts", "relationships", "tags",
  "payload", "revision", "idempotencyKey"
];

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseSemver(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.exec(String(value || ""));
  if (!match) throw new Error(`Invalid interchange semantic version: ${String(value || "missing")}.`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function assertSafeShape(value) {
  let nodes = 0;
  const visit = (item, depth) => {
    nodes += 1;
    if (nodes > LIMITS.nodes) throw new Error("Interchange package is too complex.");
    if (depth > LIMITS.depth) throw new Error("Interchange package is nested too deeply.");
    if (typeof item === "string" && item.length > LIMITS.string) throw new Error("Interchange package contains an oversized text value.");
    if (Array.isArray(item)) for (const child of item) visit(child, depth + 1);
    else if (plainObject(item)) for (const child of Object.values(item)) visit(child, depth + 1);
    else if (item !== null && !["string", "number", "boolean"].includes(typeof item)) throw new Error("Interchange package contains an unsupported value.");
  };
  visit(value, 0);
}

function validTimezone(value) {
  if (typeof value !== "string" || !value) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}

function validateRecord(record, errors, index) {
  if (!plainObject(record)) {
    errors.push(`Record ${index + 1} must be an object.`);
    return;
  }
  for (const field of REQUIRED_RECORD_FIELDS) if (!(field in record)) errors.push(`Record ${index + 1} is missing ${field}.`);
  let version;
  try { version = parseSemver(record.schemaVersion); } catch (error) { errors.push(error.message); }
  if (version?.major !== INTERCHANGE_MAJOR) errors.push(`Record ${index + 1} uses unsupported major version ${version?.major}.`);
  if (typeof record.id !== "string" || record.id.length < 8 || record.id.length > 500) errors.push(`Record ${index + 1} has an invalid ID.`);
  if (!/^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9._-]*$/.test(String(record.type || ""))) errors.push(`Record ${index + 1} type must be namespaced.`);
  for (const field of ["status", "truthClass", "owner", "sourceApp", "idempotencyKey"]) {
    if (typeof record[field] !== "string" || !record[field]) errors.push(`Record ${index + 1} has invalid ${field}.`);
  }
  if (!validTimezone(record.timezone)) errors.push(`Record ${index + 1} has invalid timezone.`);
  if (record.confidence !== null && (typeof record.confidence !== "number" || record.confidence < 0 || record.confidence > 1)) errors.push(`Record ${index + 1} confidence must be null or 0 through 1.`);
  if (!isIsoInstant(record.createdAt) || !isIsoInstant(record.updatedAt)) errors.push(`Record ${index + 1} requires ISO date-time instants.`);
  if (!plainObject(record.units) || !plainObject(record.payload)) errors.push(`Record ${index + 1} units and payload must be objects.`);
  for (const field of ["assumptions", "conflicts", "relationships", "tags"]) if (!Array.isArray(record[field])) errors.push(`Record ${index + 1} ${field} must be an array.`);
  if (!Number.isInteger(record.revision) || record.revision < 0) errors.push(`Record ${index + 1} revision must be a non-negative integer.`);
}

function packageWithoutHash(value) {
  const manifest = { ...value.manifest };
  delete manifest.packageHash;
  return { ...value, manifest };
}

function recordWithoutIdempotency(value) {
  const record = { ...value };
  delete record.idempotencyKey;
  return record;
}

export async function createInterchangePackage({ sourceApp, timezone, records, selection = {}, extensions = {} }) {
  if (!Array.isArray(records) || !records.length) throw new Error("Select at least one record to export.");
  const normalized = [];
  for (const record of records) {
    const next = structuredClone(record);
    next.schemaVersion ||= INTERCHANGE_VERSION;
    next.idempotencyKey = await sha256(recordWithoutIdempotency(next));
    normalized.push(next);
  }
  const recordHashes = [];
  for (const record of normalized) recordHashes.push({ id: record.id, sha256: await sha256(record) });
  const idempotencyKey = await sha256(normalized.map(({ id, idempotencyKey }) => ({ id, idempotencyKey })));
  const value = {
    ...structuredClone(extensions),
    format: INTERCHANGE_FORMAT,
    formatVersion: INTERCHANGE_VERSION,
    transferId: `lfa-transfer-${crypto.randomUUID()}`,
    exportedAt: nowIso(),
    sourceApp,
    timezone,
    selection: { mode: "explicit", recordIds: normalized.map((record) => record.id), ...structuredClone(selection) },
    records: normalized,
    manifest: { recordCount: normalized.length, hashAlgorithm: "SHA-256", recordHashes, idempotencyKey }
  };
  value.manifest.packageHash = await sha256(packageWithoutHash(value));
  await validateInterchangePackage(value);
  return value;
}

export async function validateInterchangePackage(value) {
  assertSafeShape(value);
  const errors = [];
  if (!plainObject(value)) errors.push("Top-level interchange value must be an object.");
  if (value?.format !== INTERCHANGE_FORMAT) errors.push("Unsupported interchange format.");
  let version;
  try { version = parseSemver(value?.formatVersion); } catch (error) { errors.push(error.message); }
  if (version?.major !== INTERCHANGE_MAJOR) errors.push(`Unsupported interchange major version ${version?.major}; this app accepts 1.x only.`);
  if (!isIsoInstant(value?.exportedAt)) errors.push("Interchange exportedAt must be an ISO date-time instant.");
  for (const field of ["transferId", "sourceApp"]) if (typeof value?.[field] !== "string" || !value[field]) errors.push(`Interchange ${field} is required.`);
  if (!validTimezone(value?.timezone)) errors.push("Interchange timezone must be a valid IANA timezone.");
  if (!plainObject(value?.selection) || value.selection.mode !== "explicit" || !Array.isArray(value.selection.recordIds)) errors.push("Interchange selection must list explicit record IDs.");
  if (!Array.isArray(value?.records) || !value.records.length) errors.push("Interchange package contains no records.");
  if ((value?.records?.length || 0) > LIMITS.records) errors.push(`Interchange package exceeds ${LIMITS.records} records.`);
  (value?.records || []).forEach((record, index) => validateRecord(record, errors, index));
  const manifest = value?.manifest;
  if (!plainObject(manifest) || manifest.hashAlgorithm !== "SHA-256") errors.push("Interchange SHA-256 manifest is missing.");
  if (manifest?.recordCount !== value?.records?.length || !Array.isArray(manifest?.recordHashes)) errors.push("Interchange manifest record count is invalid.");
  const ids = new Set();
  for (const record of value?.records || []) {
    if (ids.has(record.id)) errors.push(`Duplicate record ID ${record.id}.`);
    ids.add(record.id);
    const expected = manifest?.recordHashes?.find((entry) => entry?.id === record.id)?.sha256;
    if (typeof expected !== "string" || await sha256(record) !== expected) errors.push(`Content hash mismatch for ${record.id}.`);
    const expectedIdempotency = await sha256(recordWithoutIdempotency(record));
    if (record.idempotencyKey !== expectedIdempotency) errors.push(`Idempotency metadata mismatch for ${record.id}.`);
  }
  const selectedIds = value?.selection?.recordIds || [];
  if (selectedIds.length !== ids.size || selectedIds.some((id) => !ids.has(id))) errors.push("Interchange selection does not match its records.");
  if (manifest?.recordHashes?.length !== value?.records?.length) errors.push("Interchange manifest hash list is invalid.");
  const expectedPackageIdempotency = await sha256((value?.records || []).map(({ id, idempotencyKey }) => ({ id, idempotencyKey })));
  if (manifest?.idempotencyKey !== expectedPackageIdempotency) errors.push("Interchange package idempotency metadata mismatch.");
  if (typeof manifest?.packageHash !== "string" || await sha256(packageWithoutHash(value)) !== manifest.packageHash) errors.push("Interchange package hash mismatch.");
  if (errors.length) throw new Error([...new Set(errors)].join(" "));
  return { version, forwardMinor: version.minor > parseSemver(INTERCHANGE_VERSION).minor, unknownFieldsPreserved: true };
}

export async function parseInterchangeText(text, { maxBytes = MAX_INTERCHANGE_BYTES } = {}) {
  if (new TextEncoder().encode(String(text)).byteLength > maxBytes) throw new Error("Interchange imports must not exceed 25 MB.");
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("Interchange file is not valid JSON."); }
  await validateInterchangePackage(value);
  return value;
}

export async function parseInterchangeFile(file) {
  if (!file || Number(file.size) > MAX_INTERCHANGE_BYTES) throw new Error("Interchange imports must not exceed 25 MB.");
  return parseInterchangeText(await file.text());
}

export function splitRecordExtensions(record) {
  const known = new Set(REQUIRED_RECORD_FIELDS);
  return Object.fromEntries(Object.entries(record || {}).filter(([key]) => !known.has(key)));
}
