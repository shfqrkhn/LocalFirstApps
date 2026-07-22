# File Disposition Ledger

This ledger covers every tracked path at the 2026-07-22 audit. A glob is used only where every matched file has the same ownership and disposition. `KEEP` means preserve the contract, not freeze the implementation.

| Paths | Count | Disposition |
| --- | ---: | --- |
| `.github/codeql/codeql-config.yml`, `.github/dependabot.yml` | 2 | KEEP; exclude archive and keep dependency/security policy current. |
| `.github/workflows/codeql.yml`, `static-check.yml`, `pages.yml` | 3 | REFACTOR; separate local candidate, deployment-artifact, and post-deploy gates. |
| `.gitattributes`, `.gitignore`, `.nojekyll`, `LICENSE` | 4 | KEEP; archive and generated-artifact exclusions are binding hygiene. |
| `package.json`, `package-lock.json` | 2 | KEEP/REFACTOR; make local/release gates explicit and deterministic. |
| `PROJECT_STATE.yaml`, `DECISIONS.md` | 2 | KEEP/UPDATE; A4 observed state and A2 accepted amendments. |
| `README.md` | 1 | UPDATE with each supported-surface or recovery change; descriptive only. |
| `index.html`, `styles.css`, `suite-shell.css`, `suite-shell.js`, root `screenshot.png` | 5 | REFACTOR into the CommonGround launcher/design foundation; preserve file-mode behavior. |
| `docs/AI_MAINTAINER_HANDOFF.md`, `CAPABILITY_RECOVERY_MATRIX.md`, `EVIDENCE_RECEIPT.md` | 3 | KEEP/UPDATE as evidence and operational truth. |
| `docs/INTERCHANGE_CONTRACT.md`, `PWA_ASSURANCE_CONTRACT.md`, `HEALTHOS_CONTRACT.md`, `REPO_ZIP_POLICY.md`, `future-app-intake.md` | 5 | KEEP as bounded A3 contracts; revise only with implementation, tests, and decisions. |
| `docs/MPES_IMPLEMENTATION_PLAN.md` | 1 | KEEP/UPDATE as the current risk-first execution plan; A6 derived. |
| `docs/DOCUMENT_AUTHORITY.md`, `CODEBASE_ADVERSARIAL_AUDIT.md`, `FILE_DISPOSITION.md` | 3 | KEEP/UPDATE; governance, audit, and coverage ledger. |
| `shared/interchange.js`, `pwa-assurance.js`, `pwa-worker.js`, `healthos.js`, `focus-timer.js` | 5 | KEEP/HARDEN as pure OmniCore candidates; preserve narrow contracts and app ownership. |
| `shared/fixtures/commonground-matter-record-v1.json` | 1 | KEEP as canonical compatibility fixture. |
| `vendor/*` | 6 | KEEP temporarily; consolidate duplicate Bootstrap versions only after visual/behavior parity and preserve notices. |
| `tests/*.mjs`, `tests/*.spec.mjs`, `tests/fixtures/*` | 16 | KEEP/EXTEND; R0 isolation/scoring/PWA gates are present; add icon, reproducibility, artifact, and AT gates in later packets. |
| `apps/commonground/README.md`, `index.html`, `styles.css`, manifest, PWA shell, worker, screenshot, 9 active icons | 16 | KEEP/REFACTOR; WorkOS shell and unified design migration. |
| `apps/commonground/app.js`, `modules/*.js` | 6 | REFACTOR behind preserved v1/v2/Ledger/interchange/storage contracts. |
| `apps/healthos/*` | 10 | KEEP/REFACTOR as LifeOS seed; fix restore atomicity and unify design. |
| `apps/ledgersuite/*` | 3 | COMPATIBILITY; never archive/remove without explicit deprecation gates. |
| `apps/noodle-nudge/JSON/Content_*.json` | 4 | REVIEW/SCHEMA; retain as inert content with provenance and claim controls. |
| `apps/noodle-nudge/JSON/Q*.json` | 10 | REVIEW/SCHEMA; validate scoring, licensing, versions, and interpretations. |
| Noodle README, icons, favicon, screenshot, manifest, PWA shell | 7 | KEEP/UPDATE; R0 shell definition is app-owned and fail closed. |
| `apps/noodle-nudge/index.html`, `service-worker.js`, `scoring.js` | 3 | KEEP/REFACTOR; R0 removed executable scoring and adopted scoped fail-closed PWA; later LifeOS migration must preserve parity. |
| `apps/pmquiz/QuestionBanks/*.json` | 8 | QUARANTINE CONTENT CLAIMS; provenance, license, deduplication, versioning, and review required. |
| PMQuiz README, icons, screenshot, manifest, favicon-equivalent assets | 5 | KEEP/UPDATE with Learning migration. |
| `apps/pmquiz/app.js`, `index.html`, `style.css`, `theme.js`, `json-worker.js`, `service-worker.js` | 6 | REFACTOR; immediately fix cache ownership, then extract content/session/view boundaries. |
| Flexx README, `index.html`, manifest, PWA shell, worker, screenshot, favicon, 2 icons | 9 | KEEP/REFACTOR; replace invalid icon sizes and retain scoped recovery. |
| `apps/flexx-files/Complete_Strength_Protocol.md` | 1 | SOURCE/PROFESSIONAL REVIEW; never normative product authority. |
| `apps/flexx-files/css/styles.css` and `js/*.js` | 9 | REFACTOR incrementally around characterization tests; split domain/storage/commands/views. |
| Flexx package files | 2 | KEEP; only maintained correctness scripts remain addressable. |
| `apps/flexx-files/tests/*` | 17 | KEEP as characterization/correctness evidence; strengthen assertions where source-string based. |
| `apps/ts-dash/README.md`, HTML, manifest, icons/favicon, screenshot | 6 | KEEP/UPDATE while preserving the current route and user workflow. |
| `apps/ts-dash/assets/*.js`, `assets/*.css`, `sw.js`, `workbox-*.js` | 5 | REPLACE FROM SOURCE; recover reproducible source or behavior-first rewrite, with licenses and parity proof. |
| `archive/commonground-unused-assets/*` | 17 | ARCHIVE; unreferenced assets, excluded from runtime and authority. |
| `archive/flexx-files-legacy-tests/*` | 25 | ARCHIVE; non-gating experiments/manual harnesses, excluded from runtime and authority. |
| `archive/README.md` | 1 | KEEP as recovery manifest. |

Counts reflect the current 229-file tracked layout after the audit/archive and five R0 additions. Before any later deletion, prove no route, manifest, worker shell, import, migration, test, license, or user recovery path depends on the target.
