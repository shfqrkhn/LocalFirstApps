# AI Maintainer Handoff

Last updated: 2026-07-21.
Repo: `D:\VSCode\GH\LocalFirstApps`.

Treat this as a public-safe continuation map. Re-read current files before editing.

## Authority And State

- Prime human-readable authority: owner-controlled `MPES-LocalFirstApps-Unified-v1.1.0.md` in the approved workspace reference area. It remains private unless publication is separately approved.
- Canonical observed execution state: `PROJECT_STATE.yaml`.
- Accepted amendments and visible conflicts: `DECISIONS.md`.
- Bounded implementation sequence and reusable goal prompts: `docs/MPES_IMPLEMENTATION_PLAN.md`.
- The MPES governs requirements; project state reports observations. Neither may silently override the other.

## Mission

Maintain LocalFirstApps as a consolidated suite of small, privacy-first browser utilities. It exists to reduce repo sprawl while preserving each migrated app as a native suite module.

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
- `apps/commonground`

`apps/ledgersuite` is a temporary, unlisted `v0.2.0` compatibility redirect and is not an active app. Remove the shim during the next genuine feature release after `v0.2.0`; retain LedgerSuite JSON/ZIP import support in CommonGround indefinitely.

## Key Files

- `PROJECT_STATE.yaml`: current machine-readable milestone, requirements, risks, evidence, and next action.
- `DECISIONS.md`: accepted architectural decisions and MPES amendments.
- `docs/MPES_IMPLEMENTATION_PLAN.md`: M0–M9 packet sequence and completion definition.
- `README.md`: public suite overview.
- `index.html`: suite launcher.
- `suite-shell.css` and `suite-shell.js`: shared return/file-mode shell.
- `docs/future-app-intake.md`: required intake contract for new modules.
- `docs/CAPABILITY_RECOVERY_MATRIX.md`: per-app storage, recovery, input, and test boundaries.
- `tests/static-regression.mjs`: canonical app list and static guardrails.
- `tests/app-behavior-regression.spec.mjs`: isolated synthetic-data import/export/reset/recovery flows.
- `tests/*.spec.mjs`: behavioral, visual, local-file, and live checks.
- Private planning references may exist in the local GH workspace docs bundle; do not publish or copy them by default.

## Required Checks

```bash
npm run test:local
npm run qa
```

Use `test:local` while hardening without publishing. `qa` adds the read-only live Pages gate and is required before publication. Also run a secret scan and link/media check before committing or pushing.

## Continuation Notes

- Verify the current branch delta with `git rev-list --left-right --count 'HEAD...@{u}'` before pushing; do not rely on stale ahead/behind notes.
- If the Pages API summary reports `errored`, compare the latest current-head `Deploy GitHub Pages` workflow, deployments API SHA, and live HTTP 200 before editing source; treat a contradictory API summary as stale residue and report it with limitations.
- Use `docs/future-app-intake.md` before adding any new module.
- Keep `tests/static-regression.mjs`, the actual `apps/` directories, launcher cards, and README app links in exact membership parity; an unregistered app folder is a repo-sprawl blocker, not an implicit new app.
- Keep each app README explicit about its data/recovery boundary; document export/import/reset support or state the limitation when no separate recovery workflow exists.
- Keep CommonGround's matter-type registry authoritative. Facilitation matters retain suitability and route-out behavior; Decision Analysis matters use the shared workspace/storage/export shell but never inherit facilitation-only gates.
- Preserve CommonGround export v2 plus CommonGround v1 and LedgerSuite v1/v2 import compatibility. Legacy database migration must stay previewed, atomic, idempotent, and source-preserving.
- Keep decision hard constraints distinct from comparative scores. Preserve revision checks on singleton writes so stale tabs fail visibly instead of overwriting newer records; broader semantic conflict handling belongs to M1.
- CommonGround worker updates must remain fully staged and user-activated. First install must not reload, and explicit activation must reload even when installation and update occur in the same page session.
- Keep `docs/CAPABILITY_RECOVERY_MATRIX.md`, the behavior suite, and package gates aligned whenever a recovery or input contract changes.
- Use private LocalFirstApps planning notes only to decide routing and guardrails; commit only the public-safe intake contract and app files.
- Future userscripts belong in a separate userscripts repo by default, not LocalFirstApps.
