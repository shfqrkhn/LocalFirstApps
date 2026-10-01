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
  },
  {
    name: "conversation-derived location",
    regex: /\b(?:Rockcliffe Park|Ottawa)\b/ig
  },
  {
    name: "removed personal name",
    regex: /\bS\.\s*R\.\s*Khan\b/ig
  }
];

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
      findings.push({
        file: rel,
        kind: rule.name,
        value,
        index: match.index
      });
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
