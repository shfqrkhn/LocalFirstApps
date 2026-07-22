import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const apps = [
  ["ts-dash", "TS-Dash", "screenshot.png"],
  ["pmquiz", "PMQuiz", "screenshot.png"],
  ["noodle-nudge", "Noodle Nudge", "images/screenshot.jpeg"],
  ["flexx-files", "Flexx Files", "screenshot.png"],
  ["healthos", "HealthOS Focus", "screenshot.png"],
  ["commonground", "CommonGround", "screenshot-app.png"]
];
const expectedAppSlugs = apps.map(([slug]) => slug).sort();
const compatibilityAliases = ["ledgersuite"];

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
    if (entry.name === ".git" || entry.name === "archive" || entry.name === "node_modules") continue;
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
const projectState = readFileSync(join(root, "PROJECT_STATE.yaml"), "utf8");
const decisions = readFileSync(join(root, "DECISIONS.md"), "utf8");
const mpesPlan = readFileSync(join(root, "docs", "MPES_IMPLEMENTATION_PLAN.md"), "utf8");
const suiteShellCss = readFileSync(join(root, "suite-shell.css"), "utf8");
const commonGroundIndex = readFileSync(join(root, "apps", "commonground", "index.html"));
const commonGroundSw = readFileSync(join(root, "apps", "commonground", "sw.js"), "utf8");
const commonGroundPwaShell = readFileSync(join(root, "apps", "commonground", "pwa-shell.json"), "utf8");
const commonGroundManifest = JSON.parse(readFileSync(join(root, "apps", "commonground", "manifest.webmanifest"), "utf8"));
const commonGroundApp = readFileSync(join(root, "apps", "commonground", "app.js"), "utf8");
const commonGroundDb = readFileSync(join(root, "apps", "commonground", "modules", "db.js"), "utf8");
const commonGroundLegacy = readFileSync(join(root, "apps", "commonground", "modules", "legacy.js"), "utf8");
const commonGroundMatterTypes = readFileSync(join(root, "apps", "commonground", "modules", "matter-types.js"), "utf8");
const commonGroundInterchange = readFileSync(join(root, "apps", "commonground", "modules", "interchange-adapter.js"), "utf8");
const sharedInterchange = readFileSync(join(root, "shared", "interchange.js"), "utf8");
const sharedPwaClient = readFileSync(join(root, "shared", "pwa-assurance.js"), "utf8");
const sharedPwaWorker = readFileSync(join(root, "shared", "pwa-worker.js"), "utf8");
const interchangeContract = readFileSync(join(root, "docs", "INTERCHANGE_CONTRACT.md"), "utf8");
const pwaContract = readFileSync(join(root, "docs", "PWA_ASSURANCE_CONTRACT.md"), "utf8");
const healthContract = readFileSync(join(root, "docs", "HEALTHOS_CONTRACT.md"), "utf8");
const flexxSw = readFileSync(join(root, "apps", "flexx-files", "sw.js"), "utf8");
const flexxPwaShell = readFileSync(join(root, "apps", "flexx-files", "pwa-shell.json"), "utf8");
const healthSw = readFileSync(join(root, "apps", "healthos", "sw.js"), "utf8");
const healthPwaShell = readFileSync(join(root, "apps", "healthos", "pwa-shell.json"), "utf8");
const healthApp = readFileSync(join(root, "apps", "healthos", "app.js"), "utf8");
const healthStorage = readFileSync(join(root, "apps", "healthos", "storage.js"), "utf8");
const pmQuizWorker = readFileSync(join(root, "apps", "pmquiz", "service-worker.js"), "utf8");
const noodleIndex = readFileSync(join(root, "apps", "noodle-nudge", "index.html"), "utf8");
const noodleScoring = readFileSync(join(root, "apps", "noodle-nudge", "scoring.js"), "utf8");
const noodleWorker = readFileSync(join(root, "apps", "noodle-nudge", "service-worker.js"), "utf8");
const sharedHealth = readFileSync(join(root, "shared", "healthos.js"), "utf8");
const sharedFocusTimer = readFileSync(join(root, "shared", "focus-timer.js"), "utf8");
const codeqlWorkflow = readFileSync(join(root, ".github", "workflows", "codeql.yml"), "utf8");
const codeqlConfig = readFileSync(join(root, ".github", "codeql", "codeql-config.yml"), "utf8");
const trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replace(/\\/g, "/"));
const headTrackedFiles = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replace(/\\/g, "/"));
const forbiddenTrackedFiles = trackedFiles.filter((file) => forbiddenTrackedPathPattern.test(file));
const actualAppSlugs = readdirSync(join(root, "apps"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .filter((entry) => !compatibilityAliases.includes(entry.name))
  .map((entry) => entry.name)
  .sort();
const launcherAppSlugs = uniqueSorted([...index.matchAll(/href=["']\.\/apps\/([^/"']+)\/["']/g)].map((match) => match[1]));
const readmeAppSlugs = uniqueSorted([
  ...[...readme.matchAll(/LocalFirstApps\/apps\/([^/)]+)\//g)].map((match) => match[1]),
  ...[...readme.matchAll(/\]\(\.\/apps\/([^/)]+)\//g)].map((match) => match[1])
]);

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
assert(!launcherAppSlugs.includes("ledgersuite"), "LedgerSuite compatibility alias must not appear in the launcher.");
assert(!readmeAppSlugs.includes("ledgersuite"), "LedgerSuite compatibility alias must not appear in the active README registry.");
assert(existsSync(join(root, "apps", "ledgersuite", "index.html")), "LedgerSuite compatibility redirect is missing.");
assert(existsSync(join(root, "apps", "ledgersuite", "retire.js")), "LedgerSuite retirement controller is missing.");
assert(existsSync(join(root, "apps", "ledgersuite", "sw.js")), "LedgerSuite retirement service worker is missing.");
assert(index.includes("github.com/sponsors/shfqrkhn"), "Launcher must keep sponsor CTA.");
assert(readme.includes("[Download current main ZIP](https://github.com/shfqrkhn/LocalFirstApps/archive/refs/heads/main.zip)"), "README must link the repository ZIP.");
assert(!readme.includes("/releases/latest"), "README must not link GitHub Releases.");
assert(readme.includes("![LocalFirstApps suite launcher](./screenshot.png)"), "README must include the suite launcher screenshot.");
assert(statSync(join(root, "screenshot.png")).isFile(), "Suite launcher screenshot missing.");
assert(index.includes("https://shfqrkhn.github.io/LocalFirstApps/screenshot.png"), "Launcher must expose social preview screenshot metadata.");
assert(pkg.scripts?.qa === "npm run test:all", "package must expose the full QA gate.");
assert(pkg.version === "0.3.0", "suite version must identify the bounded HealthOS M3A packet.");
for (const phrase of ["mpes_authority: prime", "M1-shared-interchange-and-recovery", "M2-reusable-pwa-baseline", "M3A-healthos-foundation-and-focus-timer", "D-001", "D-005", "D-006", "D-007", "NOT_RUN", "no publication authority granted"]) {
  assert(projectState.includes(phrase), `PROJECT_STATE.yaml missing required state: ${phrase}`);
}
for (const phrase of ["prime human-readable project authority", "Consolidate LedgerSuite into CommonGround", "owner explicitly directed their consolidation", "Stage PWA updates", "Reuse assurance, not runtime state", "Add an isolated HealthOS focus surface"]) {
  assert(decisions.includes(phrase), `DECISIONS.md missing required decision evidence: ${phrase}`);
}
for (const phrase of ["Non-Negotiable Architecture", "R0 — Contain confirmed safety defects", "R3 — Complete CommonGround LifeOS", "R4 — Complete CommonGround WorkOS", "Definition of 100%", "Next `/goal` Prompt"]) {
  assert(mpesPlan.includes(phrase), `MPES implementation plan missing required section: ${phrase}`);
}
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
for (const phrase of ["paths-ignore:", "tests/**", "node_modules/**", "test-results/**", "playwright-report/**"]) {
  assert(codeqlConfig.includes(phrase), `CodeQL config missing: ${phrase}`);
}
assert(!codeqlConfig.includes("apps/commonground/"), "Readable CommonGround runtime source must remain inside CodeQL analysis.");
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
for (const phrase of ["Prime human-readable authority", "PROJECT_STATE.yaml", "DECISIONS.md", "MPES_IMPLEMENTATION_PLAN.md", "Neither may silently override"]) {
  assert(handoff.includes(phrase), `Handoff missing MPES authority routing: ${phrase}`);
}
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
  "archive export-ignore",
  "package.json export-ignore",
  "package-lock.json export-ignore",
  "apps/flexx-files/tests export-ignore",
  "apps/flexx-files/package.json export-ignore",
  "apps/flexx-files/package-lock.json export-ignore",
  "apps/ledgersuite export-ignore"
]) {
  assert(exportAttrs.includes(exportIgnored), `Repository ZIP/source archives must exclude non-runtime file: ${exportIgnored}`);
}
const exportIgnoredPaths = [
  "archive",
  "tests",
  "package.json",
  "package-lock.json",
  "apps/flexx-files/tests",
  "apps/flexx-files/package.json",
  "apps/flexx-files/package-lock.json",
  "apps/ledgersuite"
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
  "apps/healthos/index.html",
  "apps/healthos/app.js",
  "apps/healthos/screenshot.png",
  "shared/healthos.js",
  "shared/focus-timer.js",
  "apps/commonground/index.html"
];
const exportAttrsResolved = exportIgnoreMap([...exportIgnoredPaths, ...runtimeZipPaths]);
const archiveEntries = gitArchiveEntries();
const pendingExportAttributeChange = execFileSync("git", ["diff", "--", ".gitattributes"], { cwd: root, encoding: "utf8" }).trim().length > 0;
const appReadmeRecoveryPattern = /\b(export|back up|backup|reset|clearing browser storage|browser storage)\b|no separate .*?(export|import|backup|recovery) workflow|no .*?cloud backup/i;
for (const file of exportIgnoredPaths) {
  assert(exportAttrsResolved.get(file) === "set", `Git export-ignore must exclude non-runtime archive path: ${file}`);
  assert(
    (!archiveEntries.includes(file) && !archiveEntries.some((entry) => entry.startsWith(`${file}/`))) || pendingExportAttributeChange,
    `Generated repository archive must exclude non-runtime path: ${file}`
  );
}
for (const file of runtimeZipPaths) {
  assert(exportAttrsResolved.get(file) === "unspecified", `Runtime archive path must remain downloadable: ${file}`);
  if (headTrackedFiles.includes(file)) {
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
assert(commonGroundManifest.name === "CommonGround", "Manifest product name must be exactly CommonGround.");
assert(commonGroundManifest.description.includes("facilitation and decision"), "Manifest must describe both unified workflows.");
assert(commonGroundIndex.toString("utf8").includes('type="module" src="./app.js"'), "CommonGround must load readable native modules.");
for (const phrase of ["decision-analysis", "suitability not applicable", "Decision context", "Hard constraints", "expectedRevision", "activate-update", "backup", "migration"]) {
  assert(`${commonGroundApp}\n${commonGroundMatterTypes}`.includes(phrase), `CommonGround app source missing unified contract: ${phrase}`);
}
for (const phrase of ['DB_VERSION = 4', 'decisionBriefs', 'decisionItems', 'migrationReceipts', 'transferReceipts', 'record changed in another tab']) {
  assert(commonGroundDb.includes(phrase), `CommonGround database source missing v3 contract: ${phrase}`);
}
for (const phrase of ['ledger-suite', 'sourceFingerprint', 'alreadyMigrated', 'writeGraphAtomic']) {
  assert(commonGroundLegacy.includes(phrase), `CommonGround legacy migration source missing: ${phrase}`);
}
for (const phrase of ["INTERCHANGE_VERSION", "formatVersion", "idempotencyKey", "recordHashes", "packageHash", "Unsupported interchange major version", "unknownFieldsPreserved"]) {
  assert(sharedInterchange.includes(phrase), `Shared interchange contract missing: ${phrase}`);
}
for (const phrase of ["createCommonGroundInterchange", "applyCommonGroundInterchange", "rollbackCommonGroundInterchange", "writeInterchangeAtomic"]) {
  assert(commonGroundInterchange.includes(phrase), `CommonGround interchange adapter missing: ${phrase}`);
}
for (const phrase of ["Data classification", "Required transfer sequence", "shared database", "unknown fields", "rollback"]) {
  assert(interchangeContract.includes(phrase), `Interchange documentation missing: ${phrase}`);
}
for (const phrase of ["LFAPwaWorker.register", 'shellVersion: "0.2.2-m2"', "dataSchemaVersion: 4", "legacyCacheNames"]) {
  assert(commonGroundSw.includes(phrase), `CommonGround service worker missing M2 contract: ${phrase}`);
}
for (const phrase of ["LFAPwaWorker.register", 'shellVersion: "3.9.75"', 'dataSchemaVersion: "v3"', "legacyCacheNames"]) {
  assert(flexxSw.includes(phrase), `Flexx service worker missing M2 contract: ${phrase}`);
}
for (const phrase of ["LFAPwaWorker.register", 'shellVersion: "0.1.0-m3a"', "dataSchemaVersion: 1", 'cachePrefix: "healthos-"']) {
  assert(healthSw.includes(phrase), `HealthOS service worker missing M2 contract: ${phrase}`);
}
for (const phrase of ["contractVersion", "compatibleDataSchemas", "navigationFallback", "sha256", "../../shared/pwa-assurance.js"]) {
  assert(commonGroundPwaShell.includes(phrase), `CommonGround shell manifest missing: ${phrase}`);
  assert(flexxPwaShell.includes(phrase), `Flexx shell manifest missing: ${phrase}`);
  assert(healthPwaShell.includes(phrase), `HealthOS shell manifest missing: ${phrase}`);
}
for (const phrase of ["healthos/daily_state", "healthos/focus_session", "LIFE_STATES", "healthRecordsToTsDashCsv", "correlation does not establish causation"]) {
  assert(sharedHealth.includes(phrase), `HealthOS shared schema missing: ${phrase}`);
}
for (const phrase of ["FOCUS_MODES", "segmentStartedAt", "reconcileFocusTimer", "clockAnomaly", "createBreakTimer"]) {
  assert(sharedFocusTimer.includes(phrase), `Trustworthy focus timer missing: ${phrase}`);
}
for (const phrase of ["Noodle Nudge", "Flexx Files", "Start focus", "Manual correction", "Optional device cues", "Prepare factory reset"]) {
  assert(healthApp.includes(phrase), `HealthOS app surface missing: ${phrase}`);
}
for (const phrase of ["healthos-focus", "expectedRevision", "idempotencyKey", "applyHealthPackageAtomic", "rollbackHealthReceipt", "createHealthBackup"]) {
  assert(healthStorage.includes(phrase), `HealthOS app-owned storage missing: ${phrase}`);
}
for (const phrase of ["Topology and ownership", "Typed portable records", "Trustworthy timer", "Observation and recovery boundaries", "Deferred modules"]) {
  assert(healthContract.includes(phrase), `HealthOS contract missing: ${phrase}`);
}
for (const phrase of ["registerPwaAssurance", "activatePwaUpdate", "getPwaHealth", "clearOwnedPwaCaches", "schemaCompatible"]) {
  assert(sharedPwaClient.includes(phrase), `PWA client assurance missing: ${phrase}`);
}
for (const phrase of ["stageCandidate", "cacheComplete", "adoptLegacyCaches", "selectedShell", "LFA_ACTIVATE_UPDATE"]) {
  assert(sharedPwaWorker.includes(phrase), `PWA worker assurance missing: ${phrase}`);
}
for (const phrase of ["App-owned shell manifest", "Activation and recovery", "last-known-good", "app-prefixed", "File mode"]) {
  assert(pwaContract.includes(phrase), `PWA assurance documentation missing: ${phrase}`);
}
assert(!/install[\s\S]{0,300}skipWaiting/.test(sharedPwaWorker), "PWA updates must not skip waiting during install.");
assert(pmQuizWorker.includes("key.startsWith(CACHE_PREFIX)"), "PMQuiz cache cleanup must be app-prefix scoped.");
assert(!pmQuizWorker.includes("caches.match("), "PMQuiz must not search sibling app caches.");
assert(!noodleIndex.includes("unsafe-eval") && !noodleIndex.includes("new Function"), "Noodle scoring content must remain inert.");
assert(noodleIndex.includes("activatePwaUpdate") && noodleIndex.includes("registerPwaAssurance"), "Noodle updates must be explicitly activated through PWA assurance.");
assert(noodleScoring.includes("ALLOWED_FUNCTIONS") && noodleScoring.includes("LIMITS"), "Noodle scoring must use an allowlisted bounded interpreter.");
assert(noodleWorker.includes('cachePrefix: "noodle-nudge-"') && noodleWorker.includes("LFAPwaWorker.register"), "Noodle worker must use the app-owned PWA contract.");
assert(!existsSync(join(root, "apps", "commonground", "assets")) || readdirSync(join(root, "apps", "commonground", "assets")).length === 0, "Opaque CommonGround generated assets must be removed.");
assert(!existsSync(join(root, "apps", "commonground", "workbox-8c29f6e4.js")), "Duplicate CommonGround Workbox runtime must be removed.");
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
