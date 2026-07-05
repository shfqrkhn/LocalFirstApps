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
const appProviderPattern = /\b(BYOAI|API key|OAuth|OpenAI|Gemini|generativelanguage|chat\/completions)\b/i;
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

function assertManifestRefs(file) {
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  const dir = dirname(file);
  const refs = [];
  for (const icon of manifest.icons || []) refs.push(icon.src);
  for (const screenshot of manifest.screenshots || []) refs.push(screenshot.src);
  for (const shortcut of manifest.shortcuts || []) {
    for (const icon of shortcut.icons || []) refs.push(icon.src);
  }
  for (const ref of refs.filter(Boolean)) {
    if (/^(https?:|data:|blob:)/i.test(ref)) continue;
    const target = ref.split(/[?#]/)[0];
    const full = resolve(dir, decodeURIComponent(target));
    assert(full.startsWith(root), `Manifest reference escapes repo root in ${relative(root, file)}: ${ref}`);
    assert(existsSync(full), `Broken manifest reference in ${relative(root, file)}: ${ref}`);
  }
}

const index = readFileSync(join(root, "index.html"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");
const exportAttrs = readFileSync(join(root, ".gitattributes"), "utf8");
const zipPolicy = readFileSync(join(root, "docs", "REPO_ZIP_POLICY.md"), "utf8");
const evidenceReceipt = readFileSync(join(root, "docs", "EVIDENCE_RECEIPT.md"), "utf8");
const handoff = readFileSync(join(root, "docs", "AI_MAINTAINER_HANDOFF.md"), "utf8");

assert(readme.includes("github.com/sponsors/shfqrkhn"), "README must keep sponsor CTA.");
assert(index.includes("github.com/sponsors/shfqrkhn"), "Launcher must keep sponsor CTA.");
assert(readme.includes("[Download current main ZIP](https://github.com/shfqrkhn/LocalFirstApps/archive/refs/heads/main.zip)"), "README must link the repository ZIP.");
assert(!readme.includes("/releases/latest"), "README must not link GitHub Releases.");
assert(readme.includes("![LocalFirstApps suite launcher](./screenshot.png)"), "README must include the suite launcher screenshot.");
assert(statSync(join(root, "screenshot.png")).isFile(), "Suite launcher screenshot missing.");
assert(index.includes("https://shfqrkhn.github.io/LocalFirstApps/screenshot.png"), "Launcher must expose social preview screenshot metadata.");
assert(readme.includes("npm run test:all"), "README must document the full test gate.");
assert(readme.includes("The repository ZIP omits source-only test and package-management files"), "README must explain runtime-focused repository ZIP archives.");
assert(readme.includes("The original standalone repo surfaces have been retired."), "README must document retired standalone repo surfaces accurately.");
assert(!readme.includes("retained only as redirects/archives"), "README must not claim deleted standalone repos are retained.");
assert(zipPolicy.includes("runtime-focused static copy"), "Repository ZIP policy must define runtime-focused archives.");
assert(zipPolicy.includes("CommonGround BYOAI/provider overlays"), "Repository ZIP policy must block retired CommonGround provider overlays.");
assert(zipPolicy.includes("Download the repository ZIP"), "Repository ZIP policy must require ZIP verification.");
assert(evidenceReceipt.includes("PASS_WITH_LIMITATIONS"), "Evidence receipt must define limited claims.");
assert(evidenceReceipt.includes("No backend/telemetry/accounts/OAuth/API keys"), "Evidence receipt must preserve suite privacy boundary.");
assert(evidenceReceipt.includes("Per-app launcher/README/screenshot/shared shell"), "Evidence receipt must cover per-app completeness.");
for (const phrase of ["Claim Firewall Invariant", "Claim Boundaries", "must map", "NOT_RUN", "BLOCKED", "current repo state"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing claim firewall term: ${phrase}`);
}
for (const phrase of ["Currentness Watchdog", "stale, missing, inaccessible", "downgrade the affected claim", "app/repo/GitHub state"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing currentness watchdog term: ${phrase}`);
}
for (const phrase of ["Safe-To-Publish Receipt", "clean synced tree", "no GitHub Releases", "no protected tracked paths", "no open security/dependabot alerts", "remaining risks"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing safe-to-publish term: ${phrase}`);
}
for (const phrase of ["Input Accessibility Evidence", "keyboard-only", "mouse/pointer-only", "touch-only", "focus/label review", "tap-target/no-overflow", "Input accessibility"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing input accessibility term: ${phrase}`);
}
for (const phrase of ["Recovery And Data Safety Evidence", "import, export, reset", "user-triggered", "local-first", "silent upload", "Recovery/data safety"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing recovery/data safety term: ${phrase}`);
}
for (const phrase of ["Per-App Membership Evidence", "apps/<slug>/", "launcher card", "file-mode notice", "old screenshots", "Userscripts", "future-app-intake.md"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing per-app membership term: ${phrase}`);
}
assert(handoff.includes("git rev-list --left-right --count HEAD...@{u}"), "Handoff must require a current upstream delta check.");
for (const phrase of ["OmniOS Transfer Contract", "Product truth", "Execution truth", "Evidence truth", "Operations truth", "Transfer truth", "GitHub Releases stay absent"]) {
  assert(handoff.includes(phrase), `Handoff missing OmniOS transfer contract term: ${phrase}`);
}
for (const phrase of ["Doctrine Delta Decision", "promote", "reject", "quarantine", "keep_local", "source-backed, reusable, non-secret", "explicitly approves publication"]) {
  assert(handoff.includes(phrase), `Handoff missing doctrine delta term: ${phrase}`);
}
assert(!handoff.includes("ahead of origin before this handoff pass"), "Handoff must not preserve stale ahead/behind state.");
for (const exportIgnored of [
  "tests export-ignore",
  "package.json export-ignore",
  "package-lock.json export-ignore",
  "apps/flexx-files/tests export-ignore",
  "apps/flexx-files/package.json export-ignore",
  "apps/flexx-files/package-lock.json export-ignore"
]) {
  assert(exportAttrs.includes(exportIgnored), `Repository ZIP/source archives must exclude non-runtime file: ${exportIgnored}`);
}

for (const [slug, label, screenshot] of apps) {
  const appDir = join(root, "apps", slug);
  const appReadme = readFileSync(join(appDir, "README.md"), "utf8");
  const appIndex = readFileSync(join(appDir, "index.html"), "utf8");
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
  assert(appIndex.includes("../../suite-shell.css"), `${label} must use shared suite shell CSS.`);
  assert(appIndex.includes("../../suite-shell.js"), `${label} must use shared suite shell JS.`);
  assert(appIndex.includes('class="lfa-suite-home"'), `${label} must expose a LocalFirstApps return link.`);
  assert(appIndex.includes('class="lfa-file-notice"'), `${label} must explain local file mode.`);
  assert(!appProviderPattern.test(`${appReadme}\n${appIndex}`), `${label} must not expose OAuth/API-key/provider app behavior.`);
}

assert(!existsSync(join(root, "apps", "commonground", "byoai.js")), "CommonGround must not bundle the retired BYOAI provider overlay.");

const flexxPackage = JSON.parse(readFileSync(join(root, "apps", "flexx-files", "package.json"), "utf8"));
const flexxLock = JSON.parse(readFileSync(join(root, "apps", "flexx-files", "package-lock.json"), "utf8"));
assert(flexxLock.version === flexxPackage.version, "Flexx Files package-lock version must match package version.");
assert(flexxLock.packages?.[""]?.version === flexxPackage.version, "Flexx Files package-lock root version must match package version.");

for (const file of walk(root)) {
  const name = file.split(/[\\/]/).pop();
  assert(!forbiddenNames.has(name), `Non-product agent file should not be in suite: ${relative(root, file)}`);
  if (!/\.(html|js|css|json|webmanifest|md|txt|xml|yml|yaml)$/i.test(file)) continue;
  const text = readFileSync(file, "utf8");
  assert(!oldRepoPattern.test(text), `Old standalone Pages URL found in ${relative(root, file)}`);
  assert(!oldAbsolutePathPattern.test(text), `Old absolute app path found in ${relative(root, file)}`);
  assert(!secretPattern.test(text), `Secret-like token found in ${relative(root, file)}`);
  assert(!popupPattern.test(text), `JS popup API found in ${relative(root, file)}`);
  if (relative(root, file).startsWith(`apps${"/"}`) || relative(root, file).startsWith(`apps${"\\"}`)) {
    assert(!appProviderPattern.test(text), `OAuth/API-key/provider behavior found in ${relative(root, file)}`);
  }
  if (/\.html$/i.test(file)) assertLocalHtmlRefs(file, text);
  if (/\.(webmanifest|json)$/i.test(file) && /manifest/i.test(file)) assertManifestRefs(file);
}

console.log(`Static regression passed for ${apps.length} apps.`);
