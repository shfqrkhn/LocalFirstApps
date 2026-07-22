# File Disposition Ledger

This ledger covers every tracked path at the 2026-07-22 audit. A glob is used only where every matched file has the same ownership and disposition. `KEEP` means preserve the contract, not freeze the implementation.

| Paths | Count | Disposition |
| --- | ---: | --- |
| `.github/codeql/codeql-config.yml`, `.github/dependabot.yml` | 2 | KEEP; exclude archive and keep dependency/security policy current. |
| `.github/workflows/codeql.yml`, `static-check.yml`, `pages.yml`, `post-deploy.yml` | 4 | KEEP; candidate, constructed deployment artifact, and read-only postdeploy gates are separated. |
| `.gitattributes`, `.gitignore`, `.nojekyll`, `LICENSE` | 4 | KEEP; archive and generated-artifact exclusions are binding hygiene. |
| `package.json`, `package-lock.json` | 2 | KEEP/REFACTOR; make local/release gates explicit and deterministic. |
| `PROJECT_STATE.yaml`, `DECISIONS.md` | 2 | KEEP/UPDATE; A4 observed state and A2 accepted amendments. |
| `README.md` | 1 | UPDATE with each supported-surface or recovery change; descriptive only. |
| `index.html`, `styles.css`, `suite-shell.css`, `suite-shell.js`, root `screenshot.png` | 5 | REFACTOR into the CommonGround launcher/design foundation; preserve file-mode behavior. |
| `docs/AI_MAINTAINER_HANDOFF.md`, `CAPABILITY_RECOVERY_MATRIX.md`, `EVIDENCE_RECEIPT.md` | 3 | KEEP/UPDATE as evidence and operational truth. |
| `docs/INTERCHANGE_CONTRACT.md`, `PWA_ASSURANCE_CONTRACT.md`, `HEALTHOS_CONTRACT.md`, `REPO_ZIP_POLICY.md`, `future-app-intake.md` | 5 | KEEP as bounded A3 contracts; revise only with implementation, tests, and decisions. |
| `docs/MPES_IMPLEMENTATION_PLAN.md` | 1 | KEEP/UPDATE as the current risk-first execution plan; A6 derived. |
| `docs/DOCUMENT_AUTHORITY.md`, `CODEBASE_ADVERSARIAL_AUDIT.md`, `FILE_DISPOSITION.md` | 3 | KEEP/UPDATE; governance, audit, and coverage ledger. |
| `docs/ACCESSIBILITY_TEST_MATRIX.md`, `DESIGN_LANGUAGE.md`, `OMNICORE_BOUNDARIES.md`, `THIRD_PARTY.md`, `TS_DASH_REWRITE_CONTRACT.md` | 5 | KEEP/UPDATE as R1 foundations; limitations and adoption gates are binding. |
| `config/deliverables.json`, `dependencies.json`, `runtime-artifact.json`, `ts-dash-legacy.json` | 4 | KEEP as canonical deterministic build/version/provenance/frozen-artifact inputs. |
| `governance/CONTENT_POLICY.md`, `content-review.schema.json`, `content-review-ledger.json` | 3 | KEEP/REGENERATE; all content remains quarantined until accountable review. |
| `shared/interchange.js`, `pwa-assurance.js`, `pwa-worker.js` | 3 | KEEP as proven pure OmniCore contracts; preserve narrow contracts and app ownership. |
| `shared/healthos.js`, `shared/focus-timer.js` | 2 | COMPATIBILITY RE-EXPORTS; canonical domain implementations are HealthOS-owned and URLs remain supported. |
| `shared/omnicore/*` | 6 | KEEP/HARDEN only with semver, two real consumers, app-owned adapters, explicit failures, deterministic faults, and code-only rollback. |
| `shared/fixtures/commonground-matter-record-v1.json` | 1 | KEEP as canonical compatibility fixture. |
| `shared/design-tokens.css`, `design-primitives.css` | 2 | KEEP/ADOPT IN BOUNDED PACKETS; no mass migration without parity evidence. |
| `tools/*.mjs`, `tools/generate-flexx-icons.ps1`, `tools/assets/flexx-icon-source.png` | 6 | KEEP as deterministic generators/verifiers and their canonical icon source; excluded from runtime. |
| `vendor/*` | 6 | KEEP temporarily; consolidate duplicate Bootstrap versions only after visual/behavior parity and preserve notices. |
| `tests/*.mjs`, `tests/*.spec.mjs`, `tests/fixtures/*` | 19 | KEEP/EXTEND; R0–R2 isolation, scoring, PWA, OmniCore, icon, artifact, provenance, responsive, and automated accessibility gates are present. |
| `apps/commonground/README.md`, `index.html`, `styles.css`, manifest, PWA shell, worker, screenshot, 9 active icons | 16 | KEEP/REFACTOR; WorkOS shell and unified design migration. |
| `apps/commonground/app.js`, `modules/*.js` | 7 | REFACTOR behind preserved v1/v2/Ledger/interchange/storage contracts; keep the OmniCore adapter app-owned. |
| `apps/healthos/*`, `apps/healthos/modules/*` | 13 | KEEP/REFACTOR as LifeOS seed; domain/timer modules and OmniCore adapter are app-owned; fix restore atomicity before migration. |
| `apps/ledgersuite/*` | 3 | COMPATIBILITY; never archive/remove without explicit deprecation gates. |
| `apps/noodle-nudge/JSON/Content_*.json` | 4 | REVIEW/SCHEMA; retain as inert content with provenance and claim controls. |
| `apps/noodle-nudge/JSON/Q*.json` | 10 | REVIEW/SCHEMA; validate scoring, licensing, versions, and interpretations. |
| Noodle README, icons, favicon, screenshot, manifest, PWA shell | 7 | KEEP/UPDATE; R0 shell definition is app-owned and fail closed. |
| `apps/noodle-nudge/index.html`, `service-worker.js`, `scoring.js` | 3 | KEEP/REFACTOR; R0 removed executable scoring and adopted scoped fail-closed PWA; later LifeOS migration must preserve parity. |
| `apps/pmquiz/QuestionBanks/*.json` | 8 | QUARANTINE CONTENT CLAIMS; provenance, license, deduplication, versioning, and review required. |
| PMQuiz README, icons, screenshot, manifest, favicon-equivalent assets | 5 | KEEP/UPDATE with Learning migration. |
| `apps/pmquiz/app.js`, `index.html`, `style.css`, `theme.js`, `json-worker.js`, `service-worker.js` | 6 | REFACTOR; immediately fix cache ownership, then extract content/session/view boundaries. |
| Flexx README, `index.html`, manifest, PWA shell, worker, screenshot, favicon, 2 icons | 9 | KEEP/REFACTOR; icon dimensions are corrected and generated; retain scoped recovery. |
| `apps/flexx-files/Complete_Strength_Protocol.md` | 1 | SOURCE/PROFESSIONAL REVIEW; never normative product authority. |
| `apps/flexx-files/css/styles.css` and `js/*.js` | 9 | REFACTOR incrementally around characterization tests; split domain/storage/commands/views. |
| Flexx package files | 2 | KEEP; only maintained correctness scripts remain addressable. |
| `apps/flexx-files/tests/*` | 17 | KEEP as characterization/correctness evidence; strengthen assertions where source-string based. |
| `apps/ts-dash/README.md`, HTML, manifest, icons/favicon, screenshot | 6 | KEEP/UPDATE while preserving the current route and user workflow. |
| `apps/ts-dash/assets/*.js`, `assets/*.css`, `sw.js`, `workbox-*.js` | 5 | REPLACE FROM SOURCE; recover reproducible source or behavior-first rewrite, with licenses and parity proof. |
| `archive/commonground-unused-assets/*` | 17 | ARCHIVE; unreferenced assets, excluded from runtime and authority. |
| `archive/flexx-files-legacy-tests/*` | 25 | ARCHIVE; non-gating experiments/manual harnesses, excluded from runtime and authority. |
| `archive/README.md` | 1 | KEEP as recovery manifest. |

Counts reflect the 251-file tracked R1 implementation layout at commit `620dbdd`. Before any later deletion, prove no route, manifest, worker shell, import, migration, test, license, provenance record, or user recovery path depends on the target.
