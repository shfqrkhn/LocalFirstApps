import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const apps = [
  ["ts-dash", "TS-Dash", "screenshot.png"],
  ["pmquiz", "PMQuiz", "screenshot.png"],
  ["noodle-nudge", "Noodle Nudge", "images/screenshot.jpeg"],
  ["ledgersuite", "LedgerSuite", "resources/screenshot.png"],
  ["flexx-files", "Flexx Files", "screenshot.png"],
  ["commonground", "CommonGround", "screenshot-app.png"]
];
const expectedAppSlugs = apps.map(([slug]) => slug).sort();

const oldRepoPattern = /https:\/\/shfqrkhn\.github\.io\/(TS-Dash|PMQuiz|Noodle-Nudge|LedgerSuite|Flexx-Files|CommonGround)\//;
const oldAbsolutePathPattern = /\/(TS-Dash|PMQuiz|Noodle-Nudge|LedgerSuite|Flexx-Files|CommonGround)\//;
const secretPattern = /(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})/;
const popupPattern = /\b(alert|confirm|prompt)\s*\(/;
const appProviderPattern = /\b(BYOAI|API key|OAuth|OpenAI|Gemini|generativelanguage|chat\/completions)\b/i;
const externalRuntimeDependencyPattern = /https:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com)|fonts\.(?:googleapis|gstatic)\.com|bootstrap-icons/i;
const forbiddenNames = new Set(["CLAUDE.md", "CODEBASE.md"]);
const forbiddenTrackedPathPattern = /(^|\/)(node_modules|offline|linkedin-post-package|test-results|playwright-report|\.codex-remote-attachments)(\/|$)|^data\/(manual-overrides\.json|latest-simulation\.json|scoreboards)(\/|$)|(^|\/).*\.((env)|(pem)|(key)|(p12)|(pfx))$|(^|\/)(exports?|backups?|logs?|scratch)(\/|$)/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
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
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const readme = readFileSync(join(root, "README.md"), "utf8");
const exportAttrs = readFileSync(join(root, ".gitattributes"), "utf8");
const zipPolicy = readFileSync(join(root, "docs", "REPO_ZIP_POLICY.md"), "utf8");
const evidenceReceipt = readFileSync(join(root, "docs", "EVIDENCE_RECEIPT.md"), "utf8");
const handoff = readFileSync(join(root, "docs", "AI_MAINTAINER_HANDOFF.md"), "utf8");
const capabilityMatrix = readFileSync(join(root, "docs", "CAPABILITY_RECOVERY_MATRIX.md"), "utf8");
const suiteShellCss = readFileSync(join(root, "suite-shell.css"), "utf8");
const commonGroundIndex = readFileSync(join(root, "apps", "commonground", "index.html"));
const commonGroundSw = readFileSync(join(root, "apps", "commonground", "sw.js"), "utf8");
const codeqlWorkflow = readFileSync(join(root, ".github", "workflows", "codeql.yml"), "utf8");
const codeqlConfig = readFileSync(join(root, ".github", "codeql", "codeql-config.yml"), "utf8");
const trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replace(/\\/g, "/"));
const forbiddenTrackedFiles = trackedFiles.filter((file) => forbiddenTrackedPathPattern.test(file));
const actualAppSlugs = readdirSync(join(root, "apps"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const launcherAppSlugs = uniqueSorted([...index.matchAll(/href=["']\.\/apps\/([^/"']+)\/["']/g)].map((match) => match[1]));
const readmeAppSlugs = uniqueSorted([...readme.matchAll(/LocalFirstApps\/apps\/([^/)]+)\//g)].map((match) => match[1]));

function exportIgnoreMap(paths) {
  const output = execFileSync("git", ["check-attr", "export-ignore", "--", ...paths], { cwd: root, encoding: "utf8" });
  const map = new Map();
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^(.*): export-ignore: (.*)$/);
    if (match) map.set(match[1].replace(/\\/g, "/"), match[2]);
  }
  return map;
}

function gitArchiveEntries() {
  const archive = execFileSync("git", ["archive", "--format=tar", "HEAD"], { cwd: root, maxBuffer: 128 * 1024 * 1024 });
  const names = [];
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    const rawSize = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = Number.parseInt(rawSize || "0", 8) || 0;
    if (name) names.push((prefix ? `${prefix}/${name}` : name).replace(/\\/g, "/"));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return names;
}

assert(readme.includes("github.com/sponsors/shfqrkhn"), "README must keep sponsor CTA.");
assert(forbiddenTrackedFiles.length === 0, `Forbidden tracked paths: ${forbiddenTrackedFiles.join(", ")}`);
assert(sameList(actualAppSlugs, expectedAppSlugs), `Actual apps folder does not match canonical app registry. actual=${actualAppSlugs.join(",")} expected=${expectedAppSlugs.join(",")}`);
assert(sameList(launcherAppSlugs, expectedAppSlugs), `Launcher cards do not match canonical app registry. launcher=${launcherAppSlugs.join(",")} expected=${expectedAppSlugs.join(",")}`);
assert(sameList(readmeAppSlugs, expectedAppSlugs), `README app links do not match canonical app registry. readme=${readmeAppSlugs.join(",")} expected=${expectedAppSlugs.join(",")}`);
assert(index.includes("github.com/sponsors/shfqrkhn"), "Launcher must keep sponsor CTA.");
assert(readme.includes("[Download current main ZIP](https://github.com/shfqrkhn/LocalFirstApps/archive/refs/heads/main.zip)"), "README must link the repository ZIP.");
assert(!readme.includes("/releases/latest"), "README must not link GitHub Releases.");
assert(readme.includes("![LocalFirstApps suite launcher](./screenshot.png)"), "README must include the suite launcher screenshot.");
assert(statSync(join(root, "screenshot.png")).isFile(), "Suite launcher screenshot missing.");
assert(index.includes("https://shfqrkhn.github.io/LocalFirstApps/screenshot.png"), "Launcher must expose social preview screenshot metadata.");
assert(pkg.scripts?.qa === "npm run test:all", "package must expose the full QA gate.");
assert(pkg.scripts?.["test:local"]?.includes("test:behavior"), "local gate must include app behavior coverage.");
assert(pkg.scripts?.["test:local"]?.includes("test:flexx"), "local gate must include native Flexx correctness coverage.");
assert(readme.includes("npm run qa"), "README must document the full QA gate.");
assert(zipPolicy.includes("npm run qa"), "Repository ZIP policy must include the full QA gate.");
assert(evidenceReceipt.includes("npm run qa"), "Evidence receipt must include the full QA gate.");
assert(handoff.includes("npm run qa"), "Maintainer handoff must include the full QA gate.");
assert(readme.includes("CAPABILITY_RECOVERY_MATRIX.md"), "README must link the capability/recovery matrix.");
for (const [slug, label] of apps) {
  assert(capabilityMatrix.includes(`| ${label} |`), `Capability/recovery matrix missing ${slug}.`);
}
for (const phrase of ["PASS_WITH_LIMITATIONS", "test:local", "keyboard", "pointer", "touch", "corrupt"]) {
  assert(capabilityMatrix.includes(phrase), `Capability/recovery matrix missing term: ${phrase}`);
}
assert(readme.includes("The repository ZIP omits source-only test and package-management files"), "README must explain runtime-focused repository ZIP archives.");
assert(readme.includes("The original standalone repo surfaces have been retired."), "README must document retired standalone repo surfaces accurately.");
assert(!readme.includes("retained only as redirects/archives"), "README must not claim deleted standalone repos are retained.");
assert(zipPolicy.includes("runtime-focused static copy"), "Repository ZIP policy must define runtime-focused archives.");
assert(zipPolicy.includes("CommonGround BYOAI/provider overlays"), "Repository ZIP policy must block retired CommonGround provider overlays.");
assert(zipPolicy.includes("Download the repository ZIP"), "Repository ZIP policy must require ZIP verification.");
assert(zipPolicy.includes("git archive"), "Repository ZIP policy must tie download claims to generated archive evidence.");
assert(evidenceReceipt.includes("PASS_WITH_LIMITATIONS"), "Evidence receipt must define limited claims.");
assert(evidenceReceipt.includes("No backend/telemetry/accounts/OAuth/API keys"), "Evidence receipt must preserve suite privacy boundary.");
assert(evidenceReceipt.includes("Per-app launcher/README/screenshot/shared shell"), "Evidence receipt must cover per-app completeness.");
for (const phrase of ["Claim Firewall Invariant", "Claim Boundaries", "must map", "NOT_RUN", "BLOCKED", "current repo state"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing claim firewall term: ${phrase}`);
}
for (const phrase of ["Currentness Watchdog", "stale, missing, inaccessible", "downgrade the affected claim", "app/repo/GitHub state"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing currentness watchdog term: ${phrase}`);
}
for (const phrase of ["Safe-To-Publish Receipt", "clean synced tree", "no GitHub Releases", "no protected tracked paths", "no open secret/dependabot/code-scanning alerts", "code-scanning not-applicable/no-analysis state", "remaining risks"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing safe-to-publish term: ${phrase}`);
}
assert(evidenceReceipt.includes("git rev-list --left-right --count 'HEAD...@{u}'"), "Evidence receipt must preserve the PowerShell-safe upstream delta command.");
assert(evidenceReceipt.includes("gh release list --limit 5"), "Evidence receipt must require a GitHub Releases absence check.");
for (const phrase of ["Runtime app code scanning", ".github/workflows/codeql.yml", "CodeQL JavaScript analysis", "PASS_WITH_LIMITATIONS"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing code scanning term: ${phrase}`);
}
for (const phrase of ["github/codeql-action/init@v4", "github/codeql-action/analyze@v4", "languages: javascript-typescript", "security-events: write", "config-file: ./.github/codeql/codeql-config.yml"]) {
  assert(codeqlWorkflow.includes(phrase), `CodeQL workflow missing: ${phrase}`);
}
for (const phrase of ["paths-ignore:", "tests/**", "node_modules/**", "test-results/**", "playwright-report/**", "apps/commonground/assets/**"]) {
  assert(codeqlConfig.includes(phrase), `CodeQL config missing: ${phrase}`);
}
for (const phrase of ["Input Accessibility Evidence", "keyboard only", "mouse/pointer only", "touch only", "platform-limited input only", "No critical workflow may require", "platform text-entry support", "Single input operation"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing input accessibility term: ${phrase}`);
}
for (const phrase of ["Design Language Evidence", "Signature Ecosystem Evidence", "shared `shfqrkhn` ecosystem", "Signature ecosystem fit", "modern minimalist", "Uiverse", "Open Props", "Design language/UI safety", "browser JS popups", "component overlap", "vendored with license notices"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing design language term: ${phrase}`);
}
for (const phrase of ["Recovery And Data Safety Evidence", "import, export, reset", "user-triggered", "local-first", "silent upload", "Recovery/data safety"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing recovery/data safety term: ${phrase}`);
}
for (const phrase of ["Mission-Critical Reliability Evidence", "self-checking", "crash-recoverable", "state-explicit", "TDD/SDD", "Autonomous AI-assisted development", "Mission-critical reliability"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing mission-critical reliability term: ${phrase}`);
}
for (const phrase of ["Pages API Residue Evidence", "current-head `Deploy GitHub Pages` workflow succeeds", "live URL fails", "PASS_WITH_LIMITATIONS", "stale residue"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing Pages API residue term: ${phrase}`);
}
for (const phrase of ["Per-App Membership Evidence", "apps/<slug>/", "launcher card", "file-mode notice", "old screenshots", "Userscripts", "future-app-intake.md"]) {
  assert(evidenceReceipt.includes(phrase), `Evidence receipt missing per-app membership term: ${phrase}`);
}
assert(handoff.includes("git rev-list --left-right --count 'HEAD...@{u}'"), "Handoff must require a PowerShell-safe current upstream delta check.");
assert(handoff.includes("treat a contradictory API summary as stale residue"), "Handoff must preserve Pages API residue handling.");
for (const phrase of ["OmniOS Transfer Contract", "Product truth", "Execution truth", "Evidence truth", "Operations truth", "Transfer truth", "GitHub Releases stay absent"]) {
  assert(handoff.includes(phrase), `Handoff missing OmniOS transfer contract term: ${phrase}`);
}
for (const phrase of ["Reliability truth", "self-checking", "crash-recoverable", "state-explicit", "TDD/SDD-backed", "remove complexity"]) {
  assert(handoff.includes(phrase), `Handoff missing reliability truth term: ${phrase}`);
}
for (const phrase of ["Ecosystem truth", "shared signature design system", "Design truth", "Single input truth", "modern minimalist", "MIT UI libraries/resources", "browser JS popups", "external runtime CDNs", "arbitrary component copy-paste", "combined input-mode path"]) {
  assert(handoff.includes(phrase), `Handoff missing design truth term: ${phrase}`);
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
const exportIgnoredPaths = [
  "tests",
  "package.json",
  "package-lock.json",
  "apps/flexx-files/tests",
  "apps/flexx-files/package.json",
  "apps/flexx-files/package-lock.json"
];
const runtimeZipPaths = [
  "index.html",
  "README.md",
  "suite-shell.css",
  "suite-shell.js",
  "vendor/bootstrap-5.3.0.min.css",
  "vendor/bootstrap-5.3.3.bundle.min.js",
  "vendor/bootstrap-5.3.3.min.css",
  "vendor/bootstrap-LICENSE.txt",
  "vendor/chart-4.4.2.umd.js",
  "vendor/chartjs-LICENSE.md",
  "apps/ts-dash/index.html",
  "apps/commonground/index.html"
];
const exportAttrsResolved = exportIgnoreMap([...exportIgnoredPaths, ...runtimeZipPaths]);
const archiveEntries = gitArchiveEntries();
const appReadmeRecoveryPattern = /\b(export|back up|backup|reset|clearing browser storage|browser storage)\b|no separate .*?(export|import|backup|recovery) workflow|no .*?cloud backup/i;
for (const file of exportIgnoredPaths) {
  assert(exportAttrsResolved.get(file) === "set", `Git export-ignore must exclude non-runtime archive path: ${file}`);
  assert(!archiveEntries.includes(file) && !archiveEntries.some((entry) => entry.startsWith(`${file}/`)), `Generated repository archive must exclude non-runtime path: ${file}`);
}
for (const file of runtimeZipPaths) {
  assert(exportAttrsResolved.get(file) === "unspecified", `Runtime archive path must remain downloadable: ${file}`);
  if (trackedFiles.includes(file)) {
    assert(archiveEntries.includes(file), `Generated repository archive must include runtime path: ${file}`);
  } else {
    assert(existsSync(join(root, file)), `Pending runtime path must exist in the workspace before commit: ${file}`);
  }
}

assert(suiteShellCss.includes('content: "Apps";'), "Shared suite return control must use a compact visual label.");
assert(/\.lfa-suite-home\s*{[\s\S]*z-index:\s*40;/.test(suiteShellCss), "Shared suite return control must not use a blocking overlay z-index.");
assert(/\.lfa-suite-home\s*{[\s\S]*background:\s*rgba\(248,\s*250,\s*252,\s*\.72\);/.test(suiteShellCss), "Shared suite return control must stay translucent.");
assert(/\.lfa-suite-home\s*{[\s\S]*opacity:\s*\.72;/.test(suiteShellCss), "Shared suite return control must stay visually quiet by default.");
assert(/@media \(max-width: 520px\)\s*{[\s\S]*\.lfa-suite-home\s*{[\s\S]*opacity:\s*\.66;/.test(suiteShellCss), "Shared suite return control must be quieter on small screens.");
assert(/\.lfa-suite-home:focus-visible,[\s\S]*\.lfa-suite-home:hover\s*{[\s\S]*opacity:\s*1;/.test(suiteShellCss), "Shared suite return control must become fully visible on focus and hover.");
assert(/backdrop-filter:\s*blur\(12px\)/.test(suiteShellCss), "Shared suite return control must use a lightweight frosted surface.");
assert(!/background:\s*rgba\(16,\s*20,\s*18,\s*\.92\)/.test(suiteShellCss), "Shared suite return control must not revert to the heavy opaque dark pill.");

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
  assert(appReadmeRecoveryPattern.test(appReadme), `${label} README must state export/import/reset recovery behavior or an explicit limitation.`);
  assert(!appProviderPattern.test(`${appReadme}\n${appIndex}`), `${label} must not expose OAuth/API-key/provider app behavior.`);
}

assert(!existsSync(join(root, "apps", "commonground", "byoai.js")), "CommonGround must not bundle the retired BYOAI provider overlay.");
const commonGroundIndexRevision = createHash("md5").update(commonGroundIndex).digest("hex");
assert(
  commonGroundSw.includes(`url:"index.html",revision:"${commonGroundIndexRevision}"`),
  "CommonGround service worker must precache the current index.html revision."
);
const bootstrapLicense = readFileSync(join(root, "vendor", "bootstrap-LICENSE.txt"), "utf8");
assert(bootstrapLicense.includes("MIT License"), "Vendored Bootstrap must keep its MIT license notice.");
assert(bootstrapLicense.includes("@popperjs/core"), "Vendored Bootstrap bundle notice must include its bundled Popper dependency.");
const chartLicense = readFileSync(join(root, "vendor", "chartjs-LICENSE.md"), "utf8");
assert(chartLicense.includes("MIT License"), "Vendored Chart.js must keep its MIT license notice.");
assert(chartLicense.includes("@kurkle/color"), "Vendored Chart.js notice must include its bundled color dependency.");

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
    assert(!externalRuntimeDependencyPattern.test(text), `External runtime CDN/font/icon dependency found in ${relative(root, file)}`);
  }
  if (/\.html$/i.test(file)) assertLocalHtmlRefs(file, text);
  if (/\.(webmanifest|json)$/i.test(file) && /manifest/i.test(file)) assertManifestRefs(file);
}

console.log(`Static regression passed for ${apps.length} apps.`);
