# AI Maintainer Handoff

Last updated: 2026-07-22.
Repo: `D:\VSCode\GH\LocalFirstApps`.

Treat this as a public-safe continuation map. Re-read current files before editing.

## Authority And State

- Prime human-readable authority: owner-controlled `MPES-LocalFirstApps-Unified-v1.1.0.md` in the approved workspace reference area. It remains private unless publication is separately approved.
- Authority hierarchy and conflict protocol: `docs/DOCUMENT_AUTHORITY.md`.
- Canonical observed execution state: `PROJECT_STATE.yaml`.
- Accepted amendments and visible conflicts: `DECISIONS.md`.
- Bounded implementation sequence and reusable goal prompts: `docs/MPES_IMPLEMENTATION_PLAN.md`.
- The MPES governs requirements; project state reports observations. Neither may silently override the other.

## Mission

Converge LocalFirstApps into two CommonGround-branded primary shells—LifeOS and WorkOS—over an invisible OmniCore source layer. Reduce user-facing sprawl while preserving isolated data/cache ownership, explicit transfer, compatibility, and independently reversible delivery.

## Product Contract

- Static files, browser storage, no server-side processing.
- Launcher works from `file://`; some apps need `http://localhost` or Pages for module/worker/PWA behavior.
- Every app must live under `apps/<slug>/`.
- Every app must keep a README, screenshot, launcher card, shared suite shell, and return link.
- No hidden backend, telemetry, account dependency, OAuth, API key, or silent upload.
- No JS popup APIs; use in-app UI.
- Critical flows should be usable with one available input mode after setup: keyboard only, mouse/pointer only, touch only, or platform-limited input only.

## OmniOS Transfer Contract

- Product truth: consolidated static local-first utility suite, not standalone retired app surfaces or provider/OAuth integrations.
- Execution truth: preserve per-app completeness, suite shell, file/live, visual, local-file, static, and privacy gates before publishing.
- Evidence truth: use `docs/EVIDENCE_RECEIPT.md`, per-app README/screenshot checks, protected-path scans, and tests; public claims must stay within `PASS` or `PASS_WITH_LIMITATIONS`.
- Operations truth: live Pages or current main repository ZIP are the only distribution paths; GitHub Releases stay absent.
- Reliability truth: keep launcher, shell, file/live, import/export/reset, and per-app flows self-checking, crash-recoverable, state-explicit, modular, maintainable, simple, one-input accessible, and TDD/SDD-backed; remove complexity that does not improve resilience or usability.
- Ecosystem truth: follow the shared signature design system in `shfqrkhn/.github/docs/SIGNATURE_DESIGN_SYSTEM.md` for public UI/UX changes; adapt it to compact local-first utilities rather than copying components blindly.
- Design truth: keep UI changes modern minimalist, utilitarian, professional, joyful, responsive, and contextual to each local-first utility; use local CSS/tokens and native controls first, treat MIT UI libraries/resources as inspiration only unless a source-backed need justifies a dependency, vendor required runtime UI/chart dependencies with license notices, and reject browser JS popups, blocking overlays, overlapping components, inaccessible controls, unbounded motion, external runtime CDNs, or arbitrary component copy-paste.
- Single input truth: after setup, critical suite workflows must remain fully operable by keyboard only, mouse/pointer only, touch only, or platform-limited input only; never require a combined input-mode path.
- Transfer truth: update this handoff and the evidence receipt when app membership, screenshots, privacy claims, shared shell behavior, or public-surface guarantees change.

## Doctrine Delta Decision

- After incidents, rescue runs, maturity passes, or repeated failures, classify reusable lessons as `promote`, `reject`, `quarantine`, or `keep_local`.
- Promote only source-backed, reusable, non-secret lessons that strengthen a gate, checklist, source rule, or failure guard without weakening local-first privacy.
- Keep private, project-specific, speculative, or unverified lessons out of public repos unless the user explicitly approves publication.

## Current Suite Apps

- `apps/ts-dash`
- `apps/pmquiz`
- `apps/noodle-nudge`
- `apps/flexx-files`
- `apps/healthos`
- `apps/commonground`

`apps/ledgersuite` is an unlisted compatibility redirect, not an active app. Preserve its URL and CommonGround LedgerSuite v1/v2 import support unless the owner separately approves deprecation with migration evidence and rollback planning.

## Current Release Status

**R3B VERIFIED_LOCAL; publication NOT_RUN.** Implementation commit `097822a` adds Flexx-owned versioned Strength calculation, readiness, recovery, storage-contract, and adapter seams after exact characterization; the existing UI consumes that adapter. All seven `flexx_` keys, v3 records/drafts, legacy/current backups, calculations, outputs, route, worker/cache scope, reset boundary, and 20 global UI handlers remain compatible. LifeOS has no Flexx storage access; its only future mapping is preview-only and non-mutating. The full candidate gate and moderate audit pass. Manual AT, real browser quota/eviction, qualified content/domain review, owner acceptance, deployment, and publication remain `NOT_RUN`. R3C controller modularization is next only after owner review; TS-Dash/WorkOS migration and later HealthOS modules remain inactive.

## Key Files

- `PROJECT_STATE.yaml`: current machine-readable milestone, requirements, risks, evidence, and next action.
- `DECISIONS.md`: accepted architectural decisions and MPES amendments.
- `docs/DOCUMENT_AUTHORITY.md`: authoritative source levels and conflict protocol.
- `docs/CODEBASE_ADVERSARIAL_AUDIT.md`: skeptical architecture, code, content, CI, and risk findings.
- `docs/FILE_DISPOSITION.md`: coverage and disposition for every tracked file family.
- `docs/MPES_IMPLEMENTATION_PLAN.md`: R0–R6 risk-first sequence and completion definition.
- `archive/README.md`: excluded historical-file manifest and restoration rules.
- `shared/interchange.js` and `docs/INTERCHANGE_CONTRACT.md`: M1 portable-record implementation and public contract.
- `shared/pwa-worker.js`, `shared/pwa-assurance.js`, and `docs/PWA_ASSURANCE_CONTRACT.md`: M2 complete-shell staging, activation, health, scoped reset, and last-known-good contract.
- `apps/noodle-nudge/scoring.js` and `apps/noodle-nudge/pwa-shell.json`: inert bounded scoring and app-owned complete-shell definition.
- `apps/healthos/modules/healthos.js`, `apps/healthos/modules/focus-timer.js`, and `docs/HEALTHOS_CONTRACT.md`: HealthOS-owned observational records, explicit transfer, timestamp-derived focus timer, and module-ownership contract. The former `shared/` URLs are compatibility re-exports.
- `apps/healthos/modules/lifeos-shell.js`, `apps/healthos/lifeos-adapter.js`, and `docs/LIFEOS_CONTRACT.md`: R3A–R3B shell membership, isolation, recovery, Reflection/Strength preview, and rollback contract.
- `apps/noodle-nudge/reflection/*`, `apps/noodle-nudge/reflection-adapter.js`, and `tests/r3a-lifeos-regression.mjs`: Noodle-owned definitions/scoring/backup-preview seams, exact parity, hostile bounds, and compatibility evidence.
- `apps/flexx-files/strength/*`, `apps/flexx-files/strength-adapter.js`, `docs/STRENGTH_CONTRACT.md`, and `tests/r3b-strength-regression.mjs`: Flexx-owned domain/recovery/storage seams, exact parity, failure bounds, and non-mutating preview evidence.
- `README.md`: public suite overview.
- `index.html`: suite launcher.
- `suite-shell.css` and `suite-shell.js`: shared return/file-mode shell.
- `docs/future-app-intake.md`: required intake contract for new modules.
- `config/deliverables.json`, `config/dependencies.json`, and `config/runtime-artifact.json`: canonical versions, dependency provenance, and curated artifact policy.
- `governance/content-review-ledger.json`: deterministic quarantined content inventory; null provenance is unresolved, never approval.
- `shared/omnicore/manifest.json`, `shared/omnicore/*.js`, `tests/omnicore-regression.mjs`, and `docs/OMNICORE_BOUNDARIES.md`: R2 semver inventory, pure contracts, two-consumer/fault proof, ownership exclusions, and rollback.
- `shared/design-tokens.css`, `shared/design-primitives.css`, and `docs/DESIGN_LANGUAGE.md`: shared visual semantics consumed by CommonGround and HealthOS without surrendering app palette/layout ownership.
- `docs/TS_DASH_REWRITE_CONTRACT.md`: frozen opaque runtime disposition and readable-rewrite parity gate.
- `docs/CAPABILITY_RECOVERY_MATRIX.md`: per-app storage, recovery, input, and test boundaries.
- `tests/static-regression.mjs`: canonical app list and static guardrails.
- `tests/app-behavior-regression.spec.mjs`: isolated synthetic-data import/export/reset/recovery flows.
- `tests/*.spec.mjs`: behavioral, visual, local-file, and live checks.
- Private planning references may exist in the local GH workspace docs bundle; do not publish or copy them by default.

## Required Checks

```bash
npm run test:local
npm run ci:candidate
npm run qa
```

Use `test:local` while hardening without publishing. `qa` adds the read-only live Pages gate and is required before publication. Also run a secret scan and link/media check before committing or pushing.

## Continuation Notes

- After owner review of verified R3B, execute only the bounded R3C Flexx Strength controller modularization goal in `docs/MPES_IMPLEMENTATION_PLAN.md`. Do not begin data migration, TS-Dash/WorkOS work, later HealthOS modules, content approval, retirement, or publication.
- Keep OmniCore pure and dependency-free. Every promoted contract requires a minimal semver API, two real consumers, app-owned adapters, explicit failure behavior, deterministic faults, and code-only rollback. Never move app transaction scope, stores, workers, routes, or domain records into OmniCore.
- Treat `archive/` as historical evidence only. Restore rather than copy from it, and only after establishing a current owner, reference, assertion, and gate.
- Verify the current branch delta with `git rev-list --left-right --count 'HEAD...@{u}'` before pushing; do not rely on stale ahead/behind notes.
- If the Pages API summary reports `errored`, compare the latest current-head `Deploy GitHub Pages` workflow, deployments API SHA, and live HTTP 200 before editing source; treat a contradictory API summary as stale residue and report it with limitations.
- Use `docs/future-app-intake.md` before adding any new module.
- Keep `tests/static-regression.mjs`, the actual `apps/` directories, launcher cards, and README app links in exact membership parity; an unregistered app folder is a repo-sprawl blocker, not an implicit new app.
- Keep each app README explicit about its data/recovery boundary; document export/import/reset support or state the limitation when no separate recovery workflow exists.
- Keep CommonGround's matter-type registry authoritative. Facilitation matters retain suitability and route-out behavior; Decision Analysis matters use the shared workspace/storage/export shell but never inherit facilitation-only gates.
- Preserve CommonGround export v2 plus CommonGround v1 and LedgerSuite v1/v2 import compatibility. Legacy database migration must stay previewed, atomic, idempotent, and source-preserving.
- Keep portable transfer file-only and explicit: select, exact preview, confirm, validate, atomic app-owned apply, unique receipt and rollback. Accept compatible `1.x` conservatively, preserve unknown record/payload fields, reject other majors, and never add hidden shared storage or synchronization.
- Keep decision hard constraints distinct from comparative scores. Preserve revision checks on singleton writes and portable conflict metadata so stale or duplicate tabs fail visibly instead of overwriting newer records.
- CommonGround, Flexx, HealthOS, and Noodle worker updates must remain app-owned, content-addressed, completely staged, schema-compatible, and user-activated. PMQuiz's legacy worker must remain cache-prefix and named-cache scoped. First install must not reload; later activation reloads each open tab once. Missing/corrupt/quota-failed candidates must delete only their incomplete cache, and a corrupt/evicted current shell must select the retained complete prior shell.
- Preserve app ownership boundaries: cache prefixes, registrations, data stores, health UI and reset remain scoped. Health checks must not request persistence or imply that browser quota/eviction is controllable. Keep hosted subpaths and safe `file://` fallback covered.
- CommonGround LifeOS currently uses the bounded HealthOS navigation/daily-state/focus surface only. Noodle Nudge remains canonical for Reflection and Flexx Files for Strength; HealthOS/LifeOS must not read either store. Keep meditation, breathing, C25K, mobility, sleep and later modules inactive until separately accepted.
- Persist focus timestamps and derive duration from instants. Preserve reload/sleep reconciliation, clock/timezone anomaly visibility, manual correction, explicit pause/resume/restart/skip/cancel/review, stale-tab rejection and idempotent completion. Device cues remain detected, opt-in and visibly degradable.
- Keep HealthOS transfer explicit and file-based: exact preview, confirm, atomic app-owned apply, durable replay receipt and rollback. TS-Dash stays generic and receives only deterministic user-exported CSV; correlation language must remain non-causal.
- The local M3A route is not deployed. Existing live-route checks do not prove HealthOS publication.
- Keep `docs/CAPABILITY_RECOVERY_MATRIX.md`, the behavior suite, and package gates aligned whenever a recovery or input contract changes.
- Use private LocalFirstApps planning notes only to decide routing and guardrails; commit only the public-safe intake contract and app files.
- Future userscripts belong in a separate userscripts repo by default, not LocalFirstApps.
