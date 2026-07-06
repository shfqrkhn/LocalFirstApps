# AI Maintainer Handoff

Last updated: 2026-07-05.
Repo: `D:\VSCode\GH\LocalFirstApps`.

Treat this as a public-safe continuation map. Re-read current files before editing.

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
- `apps/ledgersuite`
- `apps/flexx-files`
- `apps/commonground`

## Key Files

- `README.md`: public suite overview.
- `index.html`: suite launcher.
- `suite-shell.css` and `suite-shell.js`: shared return/file-mode shell.
- `docs/future-app-intake.md`: required intake contract for new modules.
- `tests/static-regression.mjs`: canonical app list and static guardrails.
- `tests/*.spec.mjs`: visual, local-file, and live smoke checks.
- Private planning references may exist in the local GH workspace docs bundle; do not publish or copy them by default.

## Required Checks

```bash
npm run qa
```

Also run a secret scan and link/media check before committing or pushing.

## Continuation Notes

- Verify the current branch delta with `git rev-list --left-right --count 'HEAD...@{u}'` before pushing; do not rely on stale ahead/behind notes.
- If the Pages API summary reports `errored`, compare the latest current-head `Deploy GitHub Pages` workflow, deployments API SHA, and live HTTP 200 before editing source; treat a contradictory API summary as stale residue and report it with limitations.
- Use `docs/future-app-intake.md` before adding any new module.
- Keep `tests/static-regression.mjs`, the actual `apps/` directories, launcher cards, and README app links in exact membership parity; an unregistered app folder is a repo-sprawl blocker, not an implicit new app.
- Keep each app README explicit about its data/recovery boundary; document export/import/reset support or state the limitation when no separate recovery workflow exists.
- Use private LocalFirstApps planning notes only to decide routing and guardrails; commit only the public-safe intake contract and app files.
- Future userscripts belong in a separate userscripts repo by default, not LocalFirstApps.
