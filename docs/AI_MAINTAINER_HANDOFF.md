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
- Critical flows should be usable by keyboard-only, mouse-only, and touch-only input.

## OmniOS Transfer Contract

- Product truth: consolidated static local-first utility suite, not standalone retired app surfaces or provider/OAuth integrations.
- Execution truth: preserve per-app completeness, suite shell, file/live, visual, local-file, static, and privacy gates before publishing.
- Evidence truth: use `docs/EVIDENCE_RECEIPT.md`, per-app README/screenshot checks, protected-path scans, and tests; public claims must stay within `PASS` or `PASS_WITH_LIMITATIONS`.
- Operations truth: live Pages or current main repository ZIP are the only distribution paths; GitHub Releases stay absent.
- Transfer truth: update this handoff and the evidence receipt when app membership, screenshots, privacy claims, shared shell behavior, or public-surface guarantees change.

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
npm test
npm run test:visual
npm run test:file
npm run test:live
```

Also run a secret scan and link/media check before committing or pushing.

## Continuation Notes

- Verify the current branch delta with `git rev-list --left-right --count HEAD...@{u}` before pushing; do not rely on stale ahead/behind notes.
- Use `docs/future-app-intake.md` before adding any new module.
- Use private LocalFirstApps planning notes only to decide routing and guardrails; commit only the public-safe intake contract and app files.
- Future userscripts belong in a separate userscripts repo by default, not LocalFirstApps.
