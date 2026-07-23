# MPES Implementation Plan

Status: revised 2026-07-23 after verified R4A. This is an A6 execution plan. The private `MPES-LocalFirstApps-Unified-v1.1.0.md` is the A1 prime product authority; explicit owner amendments in `DECISIONS.md` govern final CommonGround-branded LifeOS/WorkOS convergence.

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

Result: **VERIFIED_LOCAL_WITH_LIMITATIONS** on 2026-07-22 in commit `620dbdd`. Source recovery found no readable TS-Dash source, so four generated artifacts are hash-frozen behind a behavior-first rewrite contract. The candidate gate builds a deterministic curated 123-file runtime and passes dependency/license/SBOM, CSP, icon, canonical-version, 3,868-record content ledger, 41-duplicate-group, local behavior, visual, file-mode, and automated accessibility checks. Unsupported user-facing content claims were softened. Manual AT/domain/content review, postdeploy execution, and publication remain `NOT_RUN`; no app/store/format/route was migrated.

### R2 — Build OmniCore by extraction

Promote only already-proven pure contracts: schema validation, hashing/portable transfer, scoped PWA/cache ownership, storage transactions, timestamps, recovery receipts, error/result types, design primitives, and test fixtures. Version each public module and give each shell an adapter. Do not create a framework before a second real consumer proves the abstraction.

Gate: CommonGround and one second app consume each promoted contract; old formats round-trip byte/semantically as specified; fault injection proves atomicity, idempotency, stale-write rejection, and foreign-scope preservation.

Result: **VERIFIED_LOCAL** on 2026-07-22 in implementation commit `1db2892`. OmniCore `1.0.0` now provides dependency-free error/result, canonical integrity, time, IndexedDB completion, and recovery-receipt modules, with the existing portable-transfer, app-scoped PWA, design, and fixture contracts recorded in one manifest. CommonGround and HealthOS consume the promoted seams through app-owned adapters. HealthOS domain/timer implementations moved under HealthOS ownership while their former shared URLs remain compatibility re-exports. No store, database version, record schema, route, format, cache prefix, worker scope, or user data changed. Deterministic two-consumer/fault tests, the existing atomic/replay/stale/foreign-scope browser suites, 35 visual cases, seven file routes, seven accessibility routes, a deterministic 133-file build, and a zero-vulnerability moderate audit pass locally. Manual AT, real browser eviction/quota, owner acceptance, publication, and deployment remain `NOT_RUN`.

### R3 — Complete CommonGround LifeOS

Use HealthOS Focus as the shell seed. Fix preference restore atomicity. Rewrite Noodle as Reflection using inert validated assessment definitions and pure scoring. Extract Flexx domain math/storage into Strength modules, then replace its global UI/controller incrementally. Add meditation/breathing only after M3A owner acceptance; keep C25K, mobility, sleep, and later modules inactive until separately accepted.

Gate per migrated module: exact data inventory; dual-read/verified-write or explicit previewed file migration; backup before mutation; replay-safe receipt and rollback; route/store/export parity; offline/PWA isolation; non-diagnostic language; one-input and AT evidence. Keep the old surface available until owner acceptance.

R3A result: **VERIFIED_LOCAL** on 2026-07-22 in implementation commit `17863b9`. CommonGround LifeOS `1.0.0` is an app-owned shell contract seeded by the unchanged HealthOS Focus runtime. HealthOS restore now commits a durable preference-recovery marker with records/receipts/runtime before one localStorage write; injected preference failure rejects visibly and an idempotent retry completes without re-restoring records. Noodle owns a versioned Reflection catalog/scorer/backup-preview adapter: all ten definitions and 42 captured outputs pass, hostile inputs fail closed, legacy scoring URL and backups remain compatible, and the only future LifeOS mapping is exact, preview-only, and mutation-forbidden. No route, store, schema, format, worker/cache scope, UI data model, or user data migrated. Full candidate, deterministic 139-file build, moderate audit, visual, file, behavior, accessibility, offline, and foreign-scope gates pass locally. Manual AT/content review, owner acceptance, deployment, and publication remain `NOT_RUN`.

R3B result: **VERIFIED_LOCAL** on 2026-07-22 in implementation commit `097822a`. Flexx Files owns versioned Strength calculation, readiness, recovery, storage-contract, and app-adapter seams; its existing UI now consumes the adapter. Exact characterization preserves all public calculations, seven `flexx_` persisted keys, v3 session/draft shapes, legacy/current backups, 20 global handlers, output formats, route, worker/cache scope, and independent reset. Malformed/quota faults fail visibly without replacing prior or foreign data. The only future LifeOS data mapping is exact, preview-only, and mutation-forbidden. Full candidate, deterministic 144-file build, 35 behavior cases, moderate audit, offline, accessibility, and foreign-scope gates pass locally. Training/content review, manual AT, owner acceptance, deployment, and publication remain `NOT_RUN`.

R3C result: **VERIFIED_LOCAL** on 2026-07-22 in implementation commit `93cd803`. Flexx now owns versioned state/selectors, commands, timer, modal, safe views/chart, and DOM/storage bindings; `js/app.js` is a 209-line composition root and the exact 20 legacy `window` names remain an explicit compatibility facade. Characterization and deterministic/browser faults cover all commands and phase/render/modal/timer paths, resume/draft, progression/deload, swaps, pagination/chart/protocol, malformed/quota import, reset cancel/failure, multi-tab refresh, and unrelated scope survival. Completion cannot be reintroduced as a draft. Route, visible behavior, seven `flexx_` keys, v3 data/formats, calculations, outputs, worker/cache scope, and app independence remain unchanged. Full candidate, deterministic 150-file build, 37 behavior cases, moderate audit, offline, accessibility, and foreign-scope gates pass locally. Manual AT, qualified content review, owner acceptance, deployment, and publication remain `NOT_RUN`.

R3D result: **VERIFIED_LOCAL** on 2026-07-22 in implementation commit `0d8634c`. Noodle now owns versioned state/selectors, transactional storage, content, assessment-session, settings/recovery, safe DOM/chart view, and lifecycle/binding modules. Its former 61 KB/471-line HTML monolith is a 65-line shell with a 119-line composition root and nine evidenced compatibility names; inline handlers/dynamic HTML are absent and script CSP no longer permits `unsafe-inline`. Atomic session commits merge with the latest v1 record, lifecycle refresh preserves active forms, imports fail without partial replacement, and reset starts a complete backup. All ten assessments, both input modes, 42 outputs, legacy/current/malformed/quota imports, history/reload, multi-tab, foreign storage/cache, reset failure/success, offline/update/recovery, responsive/file/accessibility gates pass. Route, `NoodleNudgeDB` v1 store/key/records, backup/scoring/content, old scoring URL, worker/cache scope, and app independence remain unchanged. Full candidate, deterministic 160-file build, 39 behavior cases, moderate audit, and diff checks pass locally. Manual AT, qualified content review, owner acceptance, deployment, and publication remain `NOT_RUN`.

R3E result: **VERIFIED_LOCAL** on 2026-07-23 in implementation commit
`8e8b5a1`. CommonGround design contract `1.1.0` now has HealthOS, Noodle, and
Flexx app-owned semantic mappings and integrity-bound shell versions. The three
LifeOS surfaces share type, spacing, shape, surfaces, statuses, focus, 44 px
targets, elevation, overlay, and motion while retaining recognizable green,
blue, and orange identities. Deterministic adoption/PWA-integrity evidence and
browser contrast, forced-color, reduced-motion, reflow, visual, one-input,
file/subpath/offline/update/recovery, and behavior parity pass. No route, store,
format, domain output, worker scope, cache prefix, compatibility path, or user
data changed. Selectable theme persistence is explicitly deferred for lack of
an accepted owner/storage/recovery contract. The 160-file candidate and
zero-vulnerability moderate audit pass; manual AT, real quota/eviction,
qualified content/domain review, owner acceptance, deployment, and publication
remain `NOT_RUN`.

### R4 — Complete CommonGround WorkOS

Refactor CommonGround facilitation/Decision Analysis into the WorkOS shell without changing matter-type boundaries, hard constraints, revisions, imports, or Ledger compatibility. Rebuild TS-Dash as Insights from recovered source/behavior contracts. Move PMQuiz into Learning only after content governance, deduplication, provenance, and deterministic session/recovery design. Add Knowledge as an explicit user-controlled source library, not hidden aggregation.

Gate per module: behavioral and format parity, exact-preview transfer, scoped storage/reset/PWA, accessibility, offline recovery, content provenance, and owner acceptance. Generic analysis must never infer causality or professional advice.

R4A result: **VERIFIED_LOCAL** on 2026-07-23 in implementation commit
`f52d957`. CommonGround WorkOS catalog, shell, and adapter `1.0.0` activate only
Collaboration and Decisions over the unchanged matter registry. Insights,
Learning, and Knowledge remain inert prerequisite metadata. CommonGround
`0.3.0` preserves IndexedDB v4/thirteen stores, every matter/route/revision
rule, v1/v2 and LedgerSuite compatibility, portable transfer/reset, scoped PWA,
offline/update/recovery, focused-app independence, and user data. Full
candidate, 163-file deterministic build, 35 visual, seven file, 39 behavior,
16 accessibility/design/WorkOS cases, focused R4A, and zero-vulnerability audit
pass locally. Manual AT/domain/content review, real quota/eviction, owner
acceptance, deployment, and publication remain `NOT_RUN`.

### R5 — Converge and retire safely

Make LifeOS and WorkOS the only primary launcher cards after every module reaches parity. Compatibility URLs remain lightweight redirects/migration surfaces. Deprecation requires usage/migration evidence, complete export, tested restore and rollback, owner approval, and a dated removal decision. Archive source only after the final supported release window; never archive required migrations or format readers.

Gate: no stranded data, broken bookmarks, duplicate authority, foreign-cache mutation, or unowned content; repository ZIP contains only curated runtime; archive manifest is complete.

### R6 — Release and operational closure

Run the full local suite, independent security/privacy/license/accessibility/content review, clean-install/upgrade/rollback/offline/quota/multi-tab tests, `git diff --check`, and protected PR checks. Publish only with explicit authority. Verify the exact deployed commit and all routes from a fresh and an upgraded profile. Record limitations and recovery drills; keep GitHub Releases absent unless separately approved.

Definition of 100%: all MPES requirements are mapped to passing evidence or an owner-accepted explicit non-goal; no P0/P1 defect is open; source is readable/reproducible; two coherent shells replace primary app sprawl; all retained data/contracts/routes recover; content and third-party provenance are reviewable; accessibility and offline behavior have both automated and manual evidence; documentation authority/state match the deployed commit.

## Next `/goal` Prompt

`/goal Complete bounded LocalFirstApps R4B readable Insights successor in parallel after verified R4A. Local reversible implementation only. Re-read the prime private MPES, supplementary OmniOS guidance, live Git/state/decisions, WORKOS and TS_DASH_REWRITE contracts, frozen TS-Dash runtime/hashes, storage/import/export/PWA/design/accessibility evidence, dependency inventory, and current tests. Preserve authority/evidence separation and report limitations; do not claim OmniOS conformance. Before mutation, adversarially characterize every evidenced TS-Dash behavior and define failing golden/parity tests. Build a readable dependency-minimal CommonGround-owned Insights successor behind the inactive WorkOS boundary: pure typed-by-contract parsing/validation/normalization/transformation/selectors, deterministic tables/text plus equivalent charts, accessible responsive preview UI, explicit non-causal language, and app-owned storage/recovery/PWA seams only where exact behavior requires them. Preserve /apps/ts-dash/, opaque artifacts/hashes, TSDashDB v1/v2 and migrations, accepted CSV/JSON mappings, units/missing/order/round/date behavior, filenames/exports, clear confirmation, install/offline, CSP, keyboard/pointer/touch, reduced motion, and foreign scope. Do not activate Insights, route/cut over, migrate/dual-write/read TS-Dash data from CommonGround, delete opaque code, change TS-Dash behavior/formats, touch PMQuiz/Learning/Knowledge, add backend/account/telemetry/AI/sync/shared store/universal worker, retire/archive/publish, or add a dependency without evidence. Use a test-only/explicit preview boundary; unknown/malformed/stale/quota/partial/concurrent cases fail visibly and atomically. Prove old/new golden transformation and import/export parity, legacy upgrades, rollback/recovery, no cross-app access, complete content-addressed shell, file/subpath/offline/update/LKG, 320–3840 px and 200%-equivalent reflow, contrast/focus/modal/status/reduced-motion/forced-color, and deterministic build. Update contracts/state/decision/evidence/handoff only to observed facts; keep owner cutover, manual AT, real quota/eviction, deployment and publication NOT_RUN. Run focused gates, npm run ci:candidate, npm audit --audit-level=moderate, sync/content governance, git diff --check, artifact and clean tracked-status checks. Commit locally; do not push or deploy.`

Do not start R4B until R4A is reviewed. Later packets must be regenerated from
current state.
