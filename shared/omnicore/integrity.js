export const OMNICORE_INTEGRITY_VERSION = "1.0.0";

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (plainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => [key, canonicalValue(value[key])])
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export async function sha256(value) {
  const bytes = value instanceof ArrayBuffer || ArrayBuffer.isView(value)
    ? value
    : new TextEncoder().encode(typeof value === "string" ? value : canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
