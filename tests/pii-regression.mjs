import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

const skipDirs = new Set([".git", "node_modules", "vendor"]);
const textExt = /.(md|txt|html?|js|mjs|cjs|css|json|webmanifest|ya?ml|xml|csv|ts|tsx|jsx)$/i;

const patterns = [
  {
    name: "email address",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig,
    allow: value => /@example\.(com|org|net)$/i.test(value)
  },
  {
    name: "phone number",
    regex: /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3}[.-])\s*\d{3}[.-]\d{4}\b/g
  },
  {
    name: "Canadian postal code",
    regex: /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/ig
  },
  {
    name: "Windows user profile path",
    regex: /\b[A-Z]:\\Users\\[^\\\s]+/ig
  },
  {
    name: "macOS user profile path",
    regex: /\/Users\/[^/\s]+/g
  },
  {
    name: "Linux user profile path",
    regex: /\/home\/[^/\s]+/g
  }
];

// Fingerprints prevent sensitive values from being committed in the guard itself.
// Each entry is [normalized character length, SHA-256 of lowercase normalized text].
const blockedFingerprints = [
  [6, "33c594e4e36529842cb1344043ec59e9f4d026466fd7ba0112a635fbe30baf3e"],
  [15, "1ca96faaf08eed37e5d487f7017cd211e3e7f5e4151cf71a1e19e87efbb7c4a0"],
  [10, "12765ba0b20e1cd856d56c5d96285114e58021f3e1b0c0226baaeebea898168a"],
  [27, "6fe12d0430de3aab51fee440fe73dfa97455ac476d8e5ab5a1661f8c21012d9b"]
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const findings = [];

for (const file of walk(root)) {
  if (!textExt.test(file)) continue;
  if (!existsSync(file) || !statSync(file).isFile()) continue;

  const rel = relative(root, file).replaceAll("\\", "/");
  if (/package-lock\.json$/i.test(rel)) continue;
  if (/\/assets\/.*\.js$/i.test(rel)) continue;

  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const rule of patterns) {
    const re = new RegExp(rule.regex.source, rule.regex.flags);
    for (const match of text.matchAll(re)) {
      const value = match[0];
      if (rule.allow?.(value)) continue;
      findings.push({ file: rel, kind: rule.name, value });
    }
  }

  const normalized = text.toLowerCase();
  for (const [length, expectedHash] of blockedFingerprints) {
    for (let i = 0; i <= normalized.length - length; i++) {
      const candidate = normalized.slice(i, i + length);
      if (sha256(candidate) === expectedHash) {
        findings.push({ file: rel, kind: "blocked personal identifier", value: "[redacted]" });
      }
    }
  }
}

if (findings.length) {
  console.error("PII regression check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.kind}: ${JSON.stringify(finding.value)}`);
  }
  process.exit(1);
}

console.log("PII regression check passed.");
