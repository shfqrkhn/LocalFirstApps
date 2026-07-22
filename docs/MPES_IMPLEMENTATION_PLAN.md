# MPES Implementation Plan

Status: revised 2026-07-22 after full adversarial audit. This is an A6 execution plan. The private `MPES-LocalFirstApps-Unified-v1.1.0.md` is the A1 prime product authority; explicit owner amendments in `DECISIONS.md` govern final CommonGround-branded LifeOS/WorkOS convergence.

## Non-Negotiable Architecture

- Two primary product shells: CommonGround LifeOS and CommonGround WorkOS.
- One invisible OmniCore source layer for design primitives, validation, explicit interchange, app-scoped PWA/storage/recovery, time, errors, and test utilities.
- No suite database, hidden cross-app reads/writes, universal service worker, implicit sync, backend, telemetry, account, provider key, or remote AI dependency.
- Preserve every current route, store, export/import, migration, and compatibility path until its replacement passes parity, recovery, rollback, accessibility, offline, and owner-acceptance gates.
- Ship in independently reversible packets. No feature packet may bypass an open safety blocker.

## Ordered Delivery

### R0 — Contain confirmed safety defects

Scope: make PMQuiz and Noodle workers cache-prefix safe; replace Noodle `new Function` formulas with a schema-validated allowlisted interpreter; remove `unsafe-eval`; make Noodle shell staging fail closed. Add cross-app cache sentinels, formula positive/negative vectors, CSP checks, and offline/update/recovery browser tests.

Gate: all foreign caches and stores survive every lifecycle/reset path; no executable imported/config content; incomplete candidates never activate; existing data and scoring fixtures remain compatible. Rollback is code-only and leaves app data untouched.

Result: **VERIFIED_LOCAL** on 2026-07-22. Runtime commit `6301bc2` contains the fixes; exact parity covers 42 rules across 10 assessments, and worker/browser tests cover malicious formulas, foreign-cache/store survival, complete staging, explicit activation, offline restart, staging faults, and last-known-good recovery. Publication is `NOT_RUN`.

### R1 — Establish trustworthy source, content, CI, and design foundations

Recover TS-Dash readable source and reproducible output or specify a behavior-first rewrite. Add third-party/license inventory. Correct Flexx icons and enforce manifest dimensions. Reconcile versions from one source. Split candidate checks from post-deploy checks and publish only a constructed runtime artifact. Create CommonGround tokens, typography, spacing, color, focus, form, dialog, status, navigation, responsive, reduced-motion, and error primitives without centralizing app data.

Create item-level provenance/review schemas for PMQuiz, Noodle assessments/content, and strength guidance. Remove/downgrade unsupported endorsement, psychometric, clinical, and prescriptive claims pending qualified review.

Gate: reproducible clean build; deterministic artifact inventory; licenses complete; CSP/icon/version/artifact tests pass; WCAG-oriented keyboard/pointer/touch/zoom/reduced-motion checks plus a documented manual AT matrix; no visual parity regression.

### R2 — Build OmniCore by extraction

Promote only already-proven pure contracts: schema validation, hashing/portable transfer, scoped PWA/cache ownership, storage transactions, timestamps, recovery receipts, error/result types, design primitives, and test fixtures. Version each public module and give each shell an adapter. Do not create a framework before a second real consumer proves the abstraction.

Gate: CommonGround and one second app consume each promoted contract; old formats round-trip byte/semantically as specified; fault injection proves atomicity, idempotency, stale-write rejection, and foreign-scope preservation.

### R3 — Complete CommonGround LifeOS

Use HealthOS Focus as the shell seed. Fix preference restore atomicity. Rewrite Noodle as Reflection using inert validated assessment definitions and pure scoring. Extract Flexx domain math/storage into Strength modules, then replace its global UI/controller incrementally. Add meditation/breathing only after M3A owner acceptance; keep C25K, mobility, sleep, and later modules inactive until separately accepted.

Gate per migrated module: exact data inventory; dual-read/verified-write or explicit previewed file migration; backup before mutation; replay-safe receipt and rollback; route/store/export parity; offline/PWA isolation; non-diagnostic language; one-input and AT evidence. Keep the old surface available until owner acceptance.

### R4 — Complete CommonGround WorkOS

Refactor CommonGround facilitation/Decision Analysis into the WorkOS shell without changing matter-type boundaries, hard constraints, revisions, imports, or Ledger compatibility. Rebuild TS-Dash as Insights from recovered source/behavior contracts. Move PMQuiz into Learning only after content governance, deduplication, provenance, and deterministic session/recovery design. Add Knowledge as an explicit user-controlled source library, not hidden aggregation.

Gate per module: behavioral and format parity, exact-preview transfer, scoped storage/reset/PWA, accessibility, offline recovery, content provenance, and owner acceptance. Generic analysis must never infer causality or professional advice.

### R5 — Converge and retire safely

Make LifeOS and WorkOS the only primary launcher cards after every module reaches parity. Compatibility URLs remain lightweight redirects/migration surfaces. Deprecation requires usage/migration evidence, complete export, tested restore and rollback, owner approval, and a dated removal decision. Archive source only after the final supported release window; never archive required migrations or format readers.

Gate: no stranded data, broken bookmarks, duplicate authority, foreign-cache mutation, or unowned content; repository ZIP contains only curated runtime; archive manifest is complete.

### R6 — Release and operational closure

Run the full local suite, independent security/privacy/license/accessibility/content review, clean-install/upgrade/rollback/offline/quota/multi-tab tests, `git diff --check`, and protected PR checks. Publish only with explicit authority. Verify the exact deployed commit and all routes from a fresh and an upgraded profile. Record limitations and recovery drills; keep GitHub Releases absent unless separately approved.

Definition of 100%: all MPES requirements are mapped to passing evidence or an owner-accepted explicit non-goal; no P0/P1 defect is open; source is readable/reproducible; two coherent shells replace primary app sprawl; all retained data/contracts/routes recover; content and third-party provenance are reviewable; accessibility and offline behavior have both automated and manual evidence; documentation authority/state match the deployed commit.

## Next `/goal` Prompt

`/goal Complete LocalFirstApps R1 engineering foundations after verified R0. Reconcile live state and preserve all compatibility/data boundaries. Recover readable TS-Dash source from workspace/history if possible; otherwise freeze behavioral/import/export/offline parity tests and specify a behavior-first rewrite—never edit generated bundles as source. Establish deterministic builds, dependency/license/SBOM inventory, curated runtime artifact generation, and separate candidate, deployment, and post-deploy gates. Fix Flexx icon dimensions with manifest tests; create one generated version source per deliverable. Create truthful provenance schemas and review ledgers for every PMQuiz item, Noodle assessment/content record, and strength/wellness claim: source, license, version, review date, reviewer, status, supersession, and claim limits. Detect duplicates; quarantine or soften unsupported endorsement, psychometric, clinical, and prescriptive claims without inventing provenance. Specify the CommonGround design language: accessible color/type/spacing/elevation/motion/focus/form/dialog/navigation/status/error tokens and responsive density rules. Update documentation and evidence. Run deterministic build, artifact, CSP, icon, license, content-schema, local behavior, and diff gates; commit locally only. No publication or premature app migration.`

Do not start R2 until R1 is locally verified and reviewed. Later packets should be generated from the then-current state rather than copying stale prompts.
