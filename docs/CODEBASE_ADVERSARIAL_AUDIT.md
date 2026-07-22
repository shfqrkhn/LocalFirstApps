# Adversarial Codebase Audit

Date: 2026-07-22

Baseline: `68076b3997294b7f3199c0b44677b921bf073a3d` on `agent/commonground-consolidation`

Current verdict: **R3B CommonGround LifeOS Strength foundation is verified locally with declared review limitations; publication and app-data migration remain `NOT_RUN`.**

## Scope And Method

All 220 tracked paths were inventoried. The active tree contains 178 paths; 42 proven-inactive paths are now in the reversible archive. Every authored runtime, test, configuration, data, and documentation file received manual structural review. JavaScript and JSON received syntax/parse checks; references, cache ownership, storage, transfer, dependencies, manifests, CI, and test behavior were traced. Images were inspected by dimensions and hashes; generated/minified/vendor files were assessed by provenance, reproducibility, integration, and license rather than pretending minified lines are maintainable source. Git internals, `node_modules`, and generated test results are not first-party source.

The pre-audit `npm run test:local` passed. That is useful characterization evidence, not proof of release safety: the suite did not test the P0 failures below.

## Findings At Audit Time

| Priority | Finding | Why the current design fails | Required correction and proof |
| --- | --- | --- | --- |
| P0 | PMQuiz and Noodle Nudge service-worker activation delete every same-origin cache not on their local allowlist. | Multiple apps share one Pages origin; opening one app can erase another app's shell cache. App isolation is therefore false. | Delete only app-owned prefixes. Add cross-app sentinel-cache browser and worker tests proving install, activate, update, cache clear, and reset never touch foreign caches. |
| P0 | Noodle Nudge compiles scoring strings with `new Function`; its CSP permits `unsafe-eval` and inline execution. | Configuration is executable content, contrary to MPES safety boundaries; malformed or replaced assessment data gains code execution authority. | Replace formulas with a bounded allowlisted interpreter for the complete observed grammar. Validate every rule; remove `unsafe-eval`, then eliminate remaining inline handlers/styles during the LifeOS rewrite. |
| P0 | Noodle's worker can install after shell caching fails. | An incomplete candidate can activate, so offline readiness is asserted without a complete shell. | Adopt the app-owned content-addressed, fail-closed PWA contract and prove incomplete staging cannot displace the last known good shell. |

## High-Risk Debt

- TS-Dash ships an opaque 446 KB generated JavaScript bundle and Workbox output without readable source, a reproducible build, or complete third-party provenance. Recover the original source or behavior-first rewrite it; never refactor the bundle as source.
- R3B reduced Flexx `core.js` to 591 physical lines by extracting characterized calculation, readiness, recovery, and storage-contract seams. The remaining 1,580-line `app.js`, 20 global handlers, HTML-string rendering, and app-owned persistence controller remain coupled and require an incremental parity-gated controller/view packet.
- Noodle Nudge remains a 65 KB HTML monolith with global state, inline presentation/handlers, and duplicated Bootstrap-era styling. R0 removed executable formulas; rebuild the remaining runtime around the validated pure scoring module during LifeOS work.
- PMQuiz has 1,774 questions, 41 duplicate-text groups (96 instances), and no item-level source, license, version, review, or retirement ledger. Treat banks as unverified content until provenance and currentness gates exist; never imply PMI endorsement.
- Noodle assessment/interpretation content lacks a formal provenance, license, version, scoring-validation, and professional-review ledger. Several credibility/public-domain statements are stronger than current evidence.
- `Complete_Strength_Protocol.md` contains prescriptive health/training rules. It is source material, not authority; product language must stay general, non-diagnostic, optional, and professionally reviewed before stronger claims.
- Flexx manifest icons declared as 192 and 512 pixels are byte-identical 480×480 files. Generate truthful maskable/any-purpose assets and add dimension checks.
- HealthOS cross-storage restore was corrected in R3A: IndexedDB commits a durable preference-recovery marker with restored state, a failed preference write rejects visibly, and idempotent retry completes without repeating record restoration.
- CommonGround advertises inconsistent app/shell/suite versions. Establish one generated version source per deliverable.
- CI couples pull-request `qa` to the already-deployed live site, while Pages uploads the repository root. Split candidate-local gates from post-deploy verification and build a curated runtime artifact.
- Shared design is only a return-control stylesheet. Each app has independent tokens, Bootstrap versions, component patterns, density, messaging, and interaction semantics. Create one CommonGround token/primitive/accessibility package while allowing domain-specific layouts.
- Automated accessibility checks do not establish screen-reader, switch-control, zoom, cognitive-load, or longitudinal usability conformance. Keep the limitation explicit and add a manual AT matrix before release.

## Greenfield Decision

I would not build the suite as seven independent static code styles sharing one origin. The target should be two CommonGround-branded product shells—LifeOS and WorkOS—over an invisible, dependency-light OmniCore source layer. OmniCore supplies design tokens/primitives, schemas, portable transfer, app-scoped persistence/PWA ownership, recovery, errors, time, and test harnesses. It must not become a shared database, event bus, hidden synchronizer, or cross-app service worker.

Migration remains strangler-style and independently reversible:

| Current surface | Target | Treatment |
| --- | --- | --- |
| CommonGround | WorkOS shell | Preserve matter/data/transfer contracts; refactor controller and views. |
| TS-Dash | WorkOS Insights | Recover source or behavior-first rewrite; preserve imports/exports and generic analysis. |
| PMQuiz | WorkOS Learning | Preserve user-visible study workflow; govern and deduplicate content. |
| HealthOS Focus | LifeOS shell seed | Preserve records/timer; correct atomic recovery. |
| Noodle Nudge | LifeOS Reflection | Rewrite runtime and safe scoring; migrate data explicitly. |
| Flexx Files | LifeOS Strength | Preserve math/store/export behavior; modular rewrite. |
| LedgerSuite alias | Compatibility only | Keep unlisted until owner-approved deprecation evidence and rollback exist. |

Compatibility routes and stores remain untouched until target parity, exact-preview migration, backup/restore, rollback, accessibility, offline, and owner acceptance all pass. Consolidation reduces supported primary surfaces, not safety boundaries.

## Archive Result

Moved, not deleted: 16 unused CommonGround splash images, one unused CommonGround SVG sheet, 23 unbaselined Flexx benchmark experiments, one failure-swallowing Python harness, and one manual input fixture. `archive/README.md` records every path family and restoration rule. The archive is excluded from runtime ZIPs, CodeQL, and active regression scans.

## Defeaters And Limits

This audit does not certify clinical/psychometric/exam content, copyright provenance, every assistive technology, real browser eviction, or the inaccessible TS-Dash source. Minified/vendor/generated code was not falsely represented as line-by-line maintainable authorship. Those limitations are explicit work items, not inferred passes.

The exact ordered remediation and acceptance gates are in `docs/MPES_IMPLEMENTATION_PLAN.md`; per-file disposition is in `docs/FILE_DISPOSITION.md`.

## R1 Resolution

Commit `620dbdd` closes the structural R1 packet locally. TS-Dash source recovery was exhausted and its four generated artifacts are hash-frozen behind a behavior-first rewrite contract. Twelve identified dependencies have provenance/license/replacement decisions and generate deterministic notices/SBOM. Pages builds a curated 123-file artifact; candidate and postdeploy checks are separated. Flexx icons now match 192/512 declarations. One deliverables contract projects versions and PWA hashes. CommonGround design and OmniCore boundaries were explicit foundation-only contracts at that checkpoint.

R2 implementation commit `1db2892` then extracted only the duplication proven by CommonGround and HealthOS: error/result, canonical integrity, time, IndexedDB completion/fault propagation, and receipt transitions. Both apps use app-owned adapters; databases, mutations, workers, routes, and domain records remain isolated. HealthOS-only schema/timer code is no longer misclassified as shared infrastructure, while its old module URLs remain compatibility re-exports. The full candidate now builds 133 curated runtime files and passes two-consumer/fault, format, atomicity, replay, stale-write, foreign-scope, offline, visual, file-mode, and accessibility gates.

R3A implementation commit `17863b9` seeds the CommonGround LifeOS `1.0.0` label through a HealthOS-owned shell adapter without absorbing any app runtime. Health preference restore is failure-visible and resumable across IndexedDB/localStorage. Noodle owns the extracted ten-definition, 42-rule Reflection scoring and backup-preview seams; the original scoring URL and legacy backup shapes remain compatible, hostile inputs fail closed, and future LifeOS mapping is exact, preview-only, and mutation-forbidden.

R3B implementation commit `097822a` extracts Flexx-owned versioned Strength calculation, readiness, recovery, storage-contract, and adapter seams after exact characterization. Seven persisted keys, v3 records/drafts, legacy/current backups, 20 global UI handlers, route, worker/cache boundary, calculations, outputs, and independent reset remain compatible. LifeOS receives no Flexx storage authority; its only data-shaped contract is a mutation-forbidden preview. The candidate builds 144 curated runtime files with 35 behavior cases.

The content ledger inventories and quarantines 3,868 PMQuiz/Noodle/Flexx records and reports 41 PMQuiz duplicate groups; unsupported public claims were softened without inventing provenance. Automated route-level accessibility, responsive, behavior, local-file, CSP, icon, version, artifact, and visual gates pass. Qualified content/domain review, manual AT testing, postdeploy execution, and publication remain `NOT_RUN` and must not be represented as passes.

## R0 Resolution

Commit `6301bc2344107a34703ba33a430b27bda678ae3f` closes the three P0 findings locally. PMQuiz cleanup and cache matching are app-scoped. Noodle uses a 13-function bounded grammar with a captured 42-rule parity fixture, no dynamic compilation or `unsafe-eval`, and the shared content-addressed fail-closed PWA contract. Unit, worker, and browser evidence covers foreign-cache survival, malicious/malformed scoring, missing/corrupt/quota candidates, explicit updates, offline restart, and last-known-good recovery. No route, store, format, or user data was migrated.
