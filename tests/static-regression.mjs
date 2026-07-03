import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const apps = [
  ["ts-dash", "TS-Dash", "screenshot.png"],
  ["pmquiz", "PMQuiz", "screenshot.png"],
  ["noodle-nudge", "Noodle Nudge", "images/screenshot.jpeg"],
  ["ledgersuite", "LedgerSuite", ".resources/screenshot.png"],
  ["flexx-files", "Flexx Files", "screenshot.png"],
  ["commonground", "CommonGround", "screenshot-app.png"]
];

const oldRepoPattern = /https:\/\/shfqrkhn\.github\.io\/(TS-Dash|PMQuiz|Noodle-Nudge|LedgerSuite|Flexx-Files|CommonGround)\//;
const oldAbsolutePathPattern = /\/(TS-Dash|PMQuiz|Noodle-Nudge|LedgerSuite|Flexx-Files|CommonGround)\//;
const secretPattern = /(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})/;
const popupPattern = /\b(alert|confirm|prompt)\s*\(/;
const forbiddenNames = new Set(["CLAUDE.md", "CODEBASE.md"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function assertLocalHtmlRefs(file, text) {
  const dir = dirname(file);
  const refs = text.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);
  for (const [, ref] of refs) {
    if (/^(https?:|mailto:|tel:|data:|blob:|#)/i.test(ref) || ref.startsWith("{")) continue;
    let target = ref.split(/[?#]/)[0];
    if (!target || target.startsWith("#")) continue;
    if (target.endsWith("/")) target = `${target}index.html`;
    const full = resolve(dir, decodeURIComponent(target));
    assert(full.startsWith(root), `Local reference escapes repo root in ${relative(root, file)}: ${ref}`);
    assert(existsSync(full), `Broken local HTML reference in ${relative(root, file)}: ${ref}`);
  }
}

const index = readFileSync(join(root, "index.html"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");

assert(readme.includes("github.com/sponsors/shfqrkhn"), "README must keep sponsor CTA.");
assert(index.includes("github.com/sponsors/shfqrkhn"), "Launcher must keep sponsor CTA.");

for (const [slug, label, screenshot] of apps) {
  const appDir = join(root, "apps", slug);
  const appReadme = readFileSync(join(appDir, "README.md"), "utf8");
  assert(statSync(appDir).isDirectory(), `${label} app folder missing.`);
  assert(statSync(join(appDir, "index.html")).isFile(), `${label} index.html missing.`);
  assert(statSync(join(appDir, "README.md")).isFile(), `${label} README.md missing.`);
  assert(statSync(join(appDir, screenshot)).isFile(), `${label} screenshot missing.`);
  assert(index.includes(`apps/${slug}/`), `${label} missing from launcher.`);
  assert(readme.includes(`apps/${slug}/`), `${label} missing from README.`);
  assert(appReadme.includes("github.com/sponsors/shfqrkhn"), `${label} README must keep sponsor CTA.`);
  assert(appReadme.includes(`LocalFirstApps/apps/${slug}`), `${label} README must keep canonical LocalFirstApps live URL.`);
  const readmeScreenshotPath = screenshot.startsWith("./") ? screenshot : `./${screenshot}`;
  assert(appReadme.includes(`](${readmeScreenshotPath})`), `${label} README must point at existing screenshot path.`);
}

for (const file of walk(root)) {
  const name = file.split(/[\\/]/).pop();
  assert(!forbiddenNames.has(name), `Non-product agent file should not be in suite: ${relative(root, file)}`);
  if (!/\.(html|js|css|json|webmanifest|md|txt|xml|yml|yaml)$/i.test(file)) continue;
  const text = readFileSync(file, "utf8");
  assert(!oldRepoPattern.test(text), `Old standalone Pages URL found in ${relative(root, file)}`);
  assert(!oldAbsolutePathPattern.test(text), `Old absolute app path found in ${relative(root, file)}`);
  assert(!secretPattern.test(text), `Secret-like token found in ${relative(root, file)}`);
  assert(!popupPattern.test(text), `JS popup API found in ${relative(root, file)}`);
  if (/\.html$/i.test(file)) assertLocalHtmlRefs(file, text);
}

console.log(`Static regression passed for ${apps.length} apps.`);
