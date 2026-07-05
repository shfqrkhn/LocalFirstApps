# Repository ZIP Policy

Users should run the live GitHub Pages suite or download the repository through **Code > Download ZIP**. The generated repository ZIP is a runtime-focused static copy of LocalFirstApps and should be safe to unzip and run without GitHub Releases or retired standalone app surfaces.

## Allowed

- Suite launcher files, shared shell files, app runtime folders under `apps/<slug>/`, public screenshots, app READMEs, manifests, and static assets.
- Local-first import/export behavior initiated by the user inside an app.
- Public docs that explain local-first behavior, file-mode limits, and app intake rules.

## Forbidden

- `node_modules/`, `test-results/`, private planning notes, backups, exports, PII, credentials, API keys, OAuth flows, telemetry, accounts, silent upload paths, JS popup APIs, and source-only maintenance files that `.gitattributes` excludes from generated archives.
- Standalone redirect folders or URLs for `AI-Studio-Cleaner`, `C3Pedal`, `CommonGround`, `Flexx-Files`, `LedgerSuite`, `Noodle-Nudge`, `PMQuiz`, or `TS-Dash`.
- CommonGround BYOAI/provider overlays or any suite app behavior that requires OAuth, API keys, or remote AI providers.

## Public Claims

- Allowed: static local-first utilities, browser-local storage, no shared backend, no telemetry, no accounts, and user-controlled file/export flows.
- Not claimed unless separately evidenced: regulated advice, external sync, account recovery, cloud backup, provider integration, or standalone app continuity outside the suite.

## Verification

Before pushing public ZIP/download-facing changes, run:

```bash
npm run qa
git diff --check
```

Download the repository ZIP through GitHub **Code > Download ZIP** or verify the generated archive with `git archive`; it must contain runtime files and no forbidden paths or app-level OAuth/API-key/provider behavior.
