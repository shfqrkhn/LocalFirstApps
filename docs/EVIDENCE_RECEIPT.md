# Evidence Receipt

This public-safe receipt keeps LocalFirstApps claims tied to evidence instead of chat history.

## Evidence Classes

- `PASS`: directly covered by current files, tests, or checks.
- `PASS_WITH_LIMITATIONS`: true only within the stated scope.
- `NOT_RUN`: not checked in the current pass.
- `BLOCKED`: cannot be checked until an external condition changes.
- `NO_GO`: failed or unsafe; do not publish until fixed.

## Claim Firewall Invariant

- Every public technical, security, privacy, download, app-membership, file/live, or support claim must map to a `Claim Boundaries` row or be added with evidence before publication.
- Public claims may not exceed `PASS` or `PASS_WITH_LIMITATIONS`; `NOT_RUN`, `BLOCKED`, and `NO_GO` items must stay unpublished or be labeled as unavailable.
- Volatile app membership, links, screenshots, file/live behavior, and GitHub settings must be rechecked from current repo state before reliance.

## Currentness Watchdog

- Recheck claim evidence before public-facing changes, not on a fixed calendar.
- If current evidence is stale, missing, inaccessible, or contradicted by app/repo/GitHub state, downgrade the affected claim to `NOT_RUN`, `BLOCKED`, or `NO_GO`.
- Do not preserve old status snapshots as proof after app membership, screenshots, shared shell behavior, links, workflows, or public privacy wording changes.

## Safe-To-Publish Receipt

- Mark this repo safe to publish only when the current pass proves a clean synced tree, no GitHub Releases, no protected tracked paths, no open secret/dependabot/code-scanning alerts or a documented code-scanning not-applicable/no-analysis state, passing required gates, and working live or repository-ZIP distribution surface.
- Runtime app code scanning uses `.github/workflows/codeql.yml` with CodeQL JavaScript analysis; missing or failed analysis must be reported as `PASS_WITH_LIMITATIONS`, `NOT_RUN`, or `NO_GO`.
- If any proof is missing, stale, or contradicted by GitHub/repo/app state, record the repo as `PASS_WITH_LIMITATIONS`, `NOT_RUN`, `BLOCKED`, or `NO_GO` instead of safe.
- The final status table must name remaining risks rather than implying safety from silence.

## Pages API Residue Evidence

- GitHub Pages API status is not sufficient by itself when it contradicts current-head workflow and live URL evidence.
- If `gh api repos/shfqrkhn/LocalFirstApps/pages` reports `errored` but the latest current-head `Deploy GitHub Pages` workflow succeeds, deployments list the same head SHA, and `https://shfqrkhn.github.io/LocalFirstApps/` returns HTTP 200, report the API summary as stale residue with `PASS_WITH_LIMITATIONS` instead of changing source.
- Treat it as a real blocker only when the latest current-head Pages workflow fails for a source/build reason, deployment SHA lags runtime payload changes, or the live URL fails.

## Input Accessibility Evidence

- After setup, critical suite workflows must remain fully usable with one available input mode: keyboard only, mouse/pointer only, touch only, or platform-limited input only.
- No critical workflow may require a combined keyboard-plus-pointer, keyboard-plus-touch, hover-plus-keyboard, drag-plus-keyboard, or browser-popup path.
- Accessibility claims require current evidence from static checks, visual/input-size checks, local-file checks, live checks, focus/label review, platform text-entry support, and tap-target/no-overflow checks where applicable.
- If keyboard-only, mouse-only, touch-only, or platform-limited operation is not directly covered for an app, label it `PASS_WITH_LIMITATIONS` or `NOT_RUN`; do not claim full accessibility from static presence alone.

## Design Language Evidence

- UI changes must preserve a modern minimalist, utilitarian, professional, joyful, responsive, local-first-suite-contextual design language with local CSS/tokens, semantic native controls, visible focus, reduced-motion-safe transitions, no horizontal overflow, and no component overlap.
- Signature Ecosystem Evidence: LocalFirstApps must look and feel like part of the shared `shfqrkhn` ecosystem while staying contextual to compact, privacy-first local utilities.
- MIT UI libraries/resources such as Uiverse, Open Props, Primer, Radix Colors, Pico CSS, Heroicons, Bootstrap Icons, Floating UI, or A11y Dialog are inspiration sources only unless a source-backed, license-checked, tested need justifies a dependency.
- Runtime third-party UI/chart dependencies must be vendored with license notices under `vendor/`; app shells and service workers must not reference runtime CDN, remote font, or remote icon URLs.
- Reject browser JS popups, blocking overlays, arbitrary component copy-paste, mixed visual systems, unbounded animation, external CDNs, or styling that hides file/live/privacy boundaries.

## Recovery And Data Safety Evidence

- App-specific import, export, reset, browser-storage, and recovery claims must remain user-triggered, local-first, and tied to current tests or explicit manual evidence.
- Each app README must state the app-specific data/recovery boundary, including export/import/reset behavior or an explicit limitation when no separate recovery workflow exists.
- Suite-wide recovery claims may cover local/file/live survivability only within tested paths; they must not imply shared cloud backup, accounts, OAuth, API keys, or silent upload.
- If an app lacks direct recovery-path coverage in the current pass, label it `PASS_WITH_LIMITATIONS` or `NOT_RUN` before public use.

## Mission-Critical Reliability Evidence

- Critical launcher, app shell, file/live, import/export/reset, and per-app workflows must stay self-checking, crash-recoverable, state-explicit, modular, maintainable, simple, one-input accessible, and TDD/SDD-backed.
- Runtime failures must fail closed with visible in-app status, preserved local user control, no browser popup APIs, no hidden upload, and no OAuth/API-key/provider overlay unless intake explicitly approves it.
- New complexity is acceptable only when it directly improves resilience, usability, state clarity, privacy, or maintainability and is covered by current tests or explicit evidence.
- Autonomous AI-assisted development must start from current files, add or update tests before broad suite or app changes, keep claims inside evidence boundaries, and leave a reproducible recovery path.

## Per-App Membership Evidence

- A suite app is public-ready only when the current repo contains its `apps/<slug>/` folder, README, screenshot, launcher card, shared shell wiring, return link, file-mode notice, and app-specific privacy/input/recovery evidence.
- The canonical app registry, actual `apps/` directories, launcher cards, and README app links must match in the static regression gate; unexpected app folders are repo-sprawl blockers until intake and docs are updated.
- Deleted standalone surfaces, old screenshots, old README text, or portfolio memories are not evidence that an app still exists, remains supported, or should be restored.
- Userscripts, provider overlays, OAuth/API-key flows, or high-trust apps must stay out of the suite unless `docs/future-app-intake.md` approves the fit and the evidence receipt gets a new bounded claim row.

## Claim Boundaries

| Area | Class | Evidence | Limit |
| --- | --- | --- | --- |
| Static local-first suite | `PASS` | launcher, app folders, static tests | Individual browser capabilities can vary by local file mode. |
| No backend/telemetry/accounts/OAuth/API keys | `PASS` | static scan and app-provider pattern test | Future apps must pass intake before joining the suite. |
| Per-app launcher/README/screenshot/shared shell | `PASS_WITH_LIMITATIONS` | static regression tests, per-app membership evidence | Recheck after each app migration, screenshot change, or app-membership claim. |
| File/live behavior clarity | `PASS_WITH_LIMITATIONS` | shared shell, local-file and live tests | GitHub Pages and local file behavior should both be tested after runtime changes. |
| Pages API summary | `PASS_WITH_LIMITATIONS` | latest current-head Pages workflow, deployments API, live HTTP 200 | The Pages API `.status` field can lag or contradict successful workflow deployments; report the residue separately. |
| Repository ZIP safety | `PASS_WITH_LIMITATIONS` | `.gitattributes`, `git check-attr export-ignore`, `git archive`, `docs/REPO_ZIP_POLICY.md`, static tests | Recheck no tests, packages, exports, private notes, or retired provider overlays are bundled. |
| Input accessibility | `PASS_WITH_LIMITATIONS` | visual target-size checks, file/live smoke, app behavior suite, capability matrix | Does not certify screen-reader behavior or every assistive technology. |
| Single input operation | `PASS_WITH_LIMITATIONS` | keyboard, pointer, and touch app behavior flows; static shell checks | Does not certify every OS assistive technology or unusual HID/browser pairing. |
| Design language/UI safety | `PASS_WITH_LIMITATIONS` | handoff/evidence docs, static tests, visual/local-file/live checks where run | Does not certify every viewport or assistive technology; each app may use contextual surfaces within the shared suite shell. |
| Signature ecosystem fit | `PASS_WITH_LIMITATIONS` | shared signature design system reference, design evidence, static/visual/live tests | Does not require identical UI components; each utility may keep its own task density and control style. |
| Recovery/data safety | `PASS_WITH_LIMITATIONS` | capability matrix; app-specific export/import/reset/corruption tests; native Flexx tests | Recovery intentionally varies by product; source-file-only and session-only boundaries remain explicit. |
| Mission-critical reliability | `PASS_WITH_LIMITATIONS` | static/visual/file/behavior gates and native correctness/recovery tests | Does not make every app equally feature-complete or replace manual assistive-technology review. |

## 2026-07-21 Local Hardening Evidence

- `PASS`: at that checkpoint, six canonical apps remained in launcher/README/folder parity with protected-path, privacy, dependency, and archive guardrails.
- `PASS`: at that checkpoint, six isolated browser flows covered valid or invalid import, export/reset where supported, persistence/repair, keyboard, pointer, and touch behavior.
- `PASS`: Flexx native checks cover plate math, last non-deload selection, draft persistence, and app-scoped reset that preserves unrelated storage.
- `PASS`: CommonGround's Sponsor control no longer occludes Settings; its index precache revision was updated with the runtime fix.
- `PASS_WITH_LIMITATIONS`: file mode provides a safe fallback, not full module/worker/PWA execution; PMQuiz has no progress backup; TS-Dash recovery relies on source/export files.
- `NOT_RUN`: live Pages validation is deliberately separate until a publication pass; no deployment is implied by local evidence.

## CommonGround v0.2.0 Consolidation Contract

- Active membership becomes five apps: TS-Dash, PMQuiz, Noodle Nudge, Flexx Files, and CommonGround. LedgerSuite is not an active app; its one-release path is an archive-excluded migration redirect.
- CommonGround owns one native-module shell, IndexedDB v4 repository, matter-type registry, export/recovery layer, and scoped PWA lifecycle for both facilitation and Decision Analysis.
- Existing facilitation records and suitability/route-out behavior remain compatible. Decision Analysis preserves LedgerSuite memo, evidence, assumptions, options, matrix, governance, outcome, pack, and recovery responsibilities without inheriting facilitation gates.
- Guided LedgerSuite migration must validate and preview before one atomic target transaction, write nothing on cancel/failure, prevent duplicate fingerprints, and never delete the source automatically.
- CommonGround export v2 uses SHA-256 integrity for matter/workspace JSON and ZIP. CommonGround v1 plus LedgerSuite v1/v2 imports remain compatibility requirements.
- Factory reset must first produce a complete backup and may clear only CommonGround-owned storage, caches, and registrations.
- Publication remains `NOT_RUN` until the full local gate, protected PR checks, exact Pages SHA, five canonical routes, and temporary redirect are independently verified.

## 2026-07-21 P0 / M4-P1 Packet Result

**Packet:** CommonGround and LedgerSuite consolidation on `agent/commonground-consolidation`
**State:** `VERIFIED` locally; owner acceptance and release are separate states.

- `PASS`: five active apps plus one unlisted, archive-excluded LedgerSuite compatibility alias are in registry/launcher/README parity.
- `PASS`: CommonGround uses readable native modules, IndexedDB v3, isolated facilitation and Decision Analysis routes, and shared/personal/professional decision contexts.
- `PASS`: hard constraints are stored and rendered separately from comparative option scores.
- `PASS`: CommonGround v2 JSON/ZIP round-trip uses SHA-256 integrity; CommonGround v1 and LedgerSuite v1 JSON/ZIP remain accepted; corrupt ZIP and bad LedgerSuite v2 integrity fail closed.
- `PASS`: same-origin LedgerSuite migration is previewed, atomic, idempotent, new-ID, and source-preserving. Its backup includes recovery logs before optional typed deletion.
- `PASS`: selected-matter deletion removes linked children without touching other matters. Factory reset downloads a valid backup and removes only CommonGround IndexedDB, scoped keys, caches, worker registrations, and OPFS data.
- `PASS`: singleton revisions reject a stale decision write rather than overwriting newer tab data. Semantic reconciliation across independent records remains an M1 limitation.
- `PASS`: first install does not reload-loop; the shell restarts offline; an updated worker waits while the old controller remains active and reloads only after explicit user activation.
- `PASS`: `npm run qa` passed static membership/security/link/archive guards, four native Flexx checks, 30 responsive cases, six file-mode cases, 15 behavior cases, and six read-only live route cases.
- `PASS`: deterministic CommonGround and five-card launcher screenshots were regenerated and visually inspected; `git diff --check`, dependency inventory, export attributes, secret-pattern, popup-API, and external-runtime scans passed.
- `PASS_WITH_LIMITATIONS`: automated accessibility evidence covers semantics, labels, visible focus, target sizes, keyboard, pointer/touch, reduced motion, responsive overflow, and modal behavior; it does not certify every screen reader or assistive technology.
- `PASS_WITH_LIMITATIONS`: browser-specific quota/eviction and longitudinal operation are not demonstrated by this bounded packet.
- `NOT_RUN`: the unpushed consolidation is not deployed. Live tests prove only that the existing six public routes respond without overflow; they do not prove the new runtime or redirect is live.
- **Rollback:** revert the local consolidation commit; LedgerSuite source storage remains preserved by default, and CommonGround pre-reset/exported bundles restore as validated copies.
- **Next exact action:** begin M1 shared interchange/recovery after owner review, or request separate publication authority for this verified packet.

## 2026-07-21 M1 Shared Interchange Packet

**State:** `VERIFIED` locally; publication remains `NOT_RUN`.

- `PASS`: `shared/interchange.js` defines dependency-free semver `1.x` portable packages with collision-resistant IDs, namespaced types, provenance/truth class, confidence, owner/source, ISO instants plus IANA timezone, units, assumptions, conflicts, relationships, tags, app payload, revisions, idempotency and SHA-256 record/package hashes.
- `PASS`: compatible future `1.x` minors are accepted conservatively, unknown record/payload fields are preserved as inert data, and other majors fail visibly. Malformed JSON, oversize/deep/complex data, duplicate IDs and hash mismatches fail before mutation.
- `PASS`: CommonGround adds portable export/import without replacing v2, v1 or LedgerSuite compatibility. Both directions show exact selected JSON and require confirmation.
- `PASS`: IndexedDB v4 adds only `transferReceipts`. Import maps to new IDs and commits the complete graph plus a unique receipt in one transaction; cancellation, simulated partial failure, deterministic quota failure, replay and a second staged tab write no partial or duplicate records.
- `PASS`: imported content can be corrected/deleted normally. Receipt rollback removes only receipt-owned IDs, retains replay protection, and leaves original workspaces intact. A real matter survives backup-before-reset and validated restore.
- `PASS`: stale singleton writes remain rejected, the updated shell caches the shared validator, and CommonGround restarts offline with the portable module available.
- `PASS`: `npm run qa` passed the static and interchange contract gates, four native Flexx checks, 30 responsive cases, six file-mode cases, 17 behavior cases and six read-only live route cases.
- `PASS`: `npm audit --audit-level=high` found zero vulnerabilities; the only direct dependency remains the development-only Playwright test runner.
- `PASS_WITH_LIMITATIONS`: deterministic quota fault injection proves atomic failure handling; it does not predict each browser's eviction policy. Automated semantics/input/viewport checks do not certify every assistive technology.
- `NOT_RUN`: no push, deployment, remote mutation or release was authorized. Read-only live checks do not prove this local M1 runtime is deployed.
- **Rollback:** use the per-receipt Settings control for an import, or revert the bounded M1 commit. The additive database upgrade does not rewrite pre-existing records.

## 2026-07-21 M2 Reusable PWA Baseline Packet

**State:** `VERIFIED` locally; publication remains `NOT_RUN`.

- `PASS`: dependency-free worker/client contracts keep each pilot's manifest, cache prefix, worker scope, data schema, update UI, storage and reset app-owned. No shared data store, synchronization, telemetry, external transmission or background business mutation was added.
- `PASS`: CommonGround and Flexx Files stage content-addressed complete shells. Missing, corrupt and quota-interrupted candidates fail closed, delete only their incomplete cache, retain the active/prior shell and preserve user data. Runtime cache integrity is rechecked so simulated corruption/eviction selects one retained last-known-good shell.
- `PASS`: first install claims without a reload loop; compatible updates wait for explicit accessible activation; incompatible schema declarations remain staged; later controller changes reload each open tab once without broadcast echo. CommonGround v3 upgrades additively to v4, and Flexx retains `v3` storage plus drafts/backups.
- `PASS`: both pilots restart offline at normal and repository-subpath URLs. Existing six safe file-mode cases cover reduced `file://` fallback. Settings expose read-only estimate/persistence/shell health, report unavailable estimates honestly and make no persistence request.
- `PASS`: CommonGround and Flexx cache clear/reset are prefix/scope limited. Both factory resets start a complete backup before deletion; Flexx browser evidence proves unrelated localStorage and cache data survive.
- `PASS`: `npm run qa` passed static, interchange, PWA manifest/hash and fail-closed worker gates, five native Flexx checks, 30 responsive cases, six file-mode cases, 23 behavior cases and six read-only live route cases.
- `PASS`: `npm audit --audit-level=high` found zero vulnerabilities; dependency/license, syntax, link/media, secret/protected-path, popup/external-runtime, archive and `git diff --check` gates passed.
- `PASS_WITH_LIMITATIONS`: missing/corrupt/quota/eviction tests use deterministic synthetic faults. Storage estimates are advisory; real browser persistence, quota and eviction policy cannot be guaranteed. Automated accessibility evidence does not certify every assistive technology.
- `NOT_RUN`: no push, deployment, release or remote mutation was authorized. Read-only live checks describe the pre-existing deployment, not this local M2 runtime.
- **Rollback:** revert the bounded M2 commit. The packet performs no destructive data migration; existing app exports and the prior complete shell remain recovery sources.

## 2026-07-22 M3A HealthOS Foundation And Focus Packet

**State:** `VERIFIED` locally; owner acceptance and publication remain separate and `NOT_RUN`.

- `PASS`: HealthOS Focus is the sixth canonical app and owns only IndexedDB `healthos-focus` v1, scoped preferences, caches and worker registration. Noodle Nudge remains canonical for reflection and Flexx Files for strength; HealthOS links to both but reads or mutates neither store. Existing app URLs, records, formats, M1 interchange and M2 PWA contracts remain preserved; the unlisted LedgerSuite compatibility URL remains available.
- `PASS`: M1-compatible `healthos/daily_state` and `healthos/focus_session` records preserve provenance, instants, IANA timezone, revision, hashes and inert compatible extensions. Mood, energy, sleep quality, stress, soreness, pain flags, intended focus, recovery need and notes stay separate; no aggregate score, diagnosis, treatment, streak pressure or forced advancement was added.
- `PASS`: 25/5, 50/10, 5- and 10-minute minimum, custom and open focus modes derive elapsed time from persisted instants. Deterministic tests cover reload/suspension-style time jumps, pause/resume/restart/skip/cancel/finish, manual correction, leap-date/DST/clock rollback/timezone change, interruptions, distractions and breaks. Browser tests cover reload reconciliation, stale duplicate tabs and idempotent completion after explicit review.
- `PASS`: portable JSON uses exact preview, confirmation, validation, atomic new-ID apply, unique durable replay receipt and rollback. Malformed/unsupported/replayed files, simulated partial/quota writes and interrupted complete restore fail closed without partial replacement. Integrity-protected complete backup restores records, receipts, active timer and preferences; factory reset begins the download and clears only HealthOS scopes.
- `PASS`: deterministic TS-Dash CSV preserves source IDs, units, truth class, derivation and the non-causal correlation note. Integration is explicit file export only; there is no hidden cross-app read, synchronization or mutation.
- `PASS`: HealthOS stages a content-addressed complete shell, requires explicit compatible activation, retains last-known-good recovery, works at root and repository subpaths, restarts offline, loads pre-existing v1 records, survives PWA update/recovery and preserves unrelated origin storage/cache data during reset. Capability detection keeps audio, vibration, notifications and wake lock opt-in with visible fallback.
- `PASS`: `npm run qa` passed static/interchange/PWA/worker/HealthOS contract gates, five native Flexx checks, 35 responsive visual cases, seven safe file-mode cases, 31 behavior cases and six read-only pre-existing live route cases. Screenshots were regenerated; syntax, dependency, license, link/media, secret/protected-path, popup/external-runtime, archive and `git diff --check` gates passed.
- `PASS_WITH_LIMITATIONS`: automated accessibility covers semantic labels/status, visible focus, keyboard start, pointer/touch actions, responsive overflow and reduced motion, not every screen reader or assistive technology. Browser/OS suspension, subtle clock changes, background cue delivery, quota and real eviction remain browser-controlled; persisted timestamps, visible anomaly state, manual correction and complete backup are the recovery paths.
- `NOT_RUN`: HealthOS is not deployed. No push, release, deployment or other remote mutation was authorized. The six live-route checks cover the pre-existing public deployment and cannot prove this local route.
- **Rollback:** revert the bounded M3A commit. No existing app store was migrated or rewritten; HealthOS's complete v1 backup restores only its own data, and the pre-M3A suite remains independently usable.
- **Next exact action:** obtain owner acceptance of M3A. Only then consider a separately bounded M3B meditation/breathing packet; C25K, mobility, sleep, distraction and all later modules remain inactive.

## Required Before Public-Facing Change

- `git status --short --ignored`
- `git rev-list --left-right --count 'HEAD...@{u}'`
- `gh release list --limit 5` returns no releases
- `npm run qa`
- `git diff --check`
- protected-path scan
- live Pages check after runtime or public-surface changes

## 2026-07-22 Adversarial Takeover Audit

**State:** audit/governance/archive packet implemented locally; **release `NO-GO`**; runtime blockers are planned, not fixed.

- `PASS`: all 220 tracked paths were inventoried; authored runtime, data, tests, configuration, and documentation received manual structural review, while binary/generated/vendor material received dimension/hash/provenance/reproducibility/license review appropriate to its form.
- `PASS`: the pre-audit `npm run test:local` baseline passed. This characterizes current behavior but did not detect the blockers below.
- `FAIL`: PMQuiz and Noodle service-worker activation can delete caches owned by other apps on the shared origin.
- `FAIL`: Noodle scoring uses dynamically compiled configuration with `unsafe-eval`; imported/config content must remain inert.
- `FAIL`: Noodle installation can survive incomplete shell caching rather than fail closed.
- `FAIL`: Flexx manifest icon declarations do not match the two byte-identical 480×480 files.
- `PASS_WITH_LIMITATIONS`: 42 inactive paths were moved—not deleted—to export-excluded `archive/`; `archive/README.md` records provenance and restoration. Compatibility code, schemas, canonical fixtures, active tests, vendors/licenses, and opaque TS-Dash runtime artifacts remain in place.
- `PASS_WITH_LIMITATIONS`: `docs/DOCUMENT_AUTHORITY.md`, `DECISIONS.md`, `PROJECT_STATE.yaml`, `docs/CODEBASE_ADVERSARIAL_AUDIT.md`, `docs/FILE_DISPOSITION.md`, and the revised implementation plan now separate authority, observed truth, evidence, source content, archive, and derived plans.
- `NOT_RUN`: no fix for R0, commit, push, deployment, release, or remote mutation is claimed by this audit packet.
- **Next exact action:** execute R0 from `docs/MPES_IMPLEMENTATION_PLAN.md`; do not begin M3B or another feature packet first.
