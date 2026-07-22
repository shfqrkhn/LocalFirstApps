# Adversarial Codebase Audit

Date: 2026-07-22

Baseline: `68076b3997294b7f3199c0b44677b921bf073a3d` on `agent/commonground-consolidation`

Current verdict: **R0 containment is verified locally; publication remains `NOT_RUN`, and R1 source/content/CI/design debt remains open.**

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
- Flexx Files concentrates UI control in a 1,424-line `app.js` and domain/state work in a 1,042-line `core.js`, with global handlers and HTML-string rendering. Preserve its tested calculations and storage formats, then extract pure domain, repository, command, and view modules.
- Noodle Nudge remains a 65 KB HTML monolith with global state, inline presentation/handlers, and duplicated Bootstrap-era styling. R0 removed executable formulas; rebuild the remaining runtime around the validated pure scoring module during LifeOS work.
- PMQuiz has 1,774 questions, 41 duplicate-text groups (96 instances), and no item-level source, license, version, review, or retirement ledger. Treat banks as unverified content until provenance and currentness gates exist; never imply PMI endorsement.
- Noodle assessment/interpretation content lacks a formal provenance, license, version, scoring-validation, and professional-review ledger. Several credibility/public-domain statements are stronger than current evidence.
- `Complete_Strength_Protocol.md` contains prescriptive health/training rules. It is source material, not authority; product language must stay general, non-diagnostic, optional, and professionally reviewed before stronger claims.
- Flexx manifest icons declared as 192 and 512 pixels are byte-identical 480×480 files. Generate truthful maskable/any-purpose assets and add dimension checks.
- HealthOS “atomic” restore commits IndexedDB before writing preferences to `localStorage`. Move preferences into the same transaction or implement verified rollback and accurately qualify the contract.
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

## R0 Resolution

Commit `6301bc2344107a34703ba33a430b27bda678ae3f` closes the three P0 findings locally. PMQuiz cleanup and cache matching are app-scoped. Noodle uses a 13-function bounded grammar with a captured 42-rule parity fixture, no dynamic compilation or `unsafe-eval`, and the shared content-addressed fail-closed PWA contract. Unit, worker, and browser evidence covers foreign-cache survival, malicious/malformed scoring, missing/corrupt/quota candidates, explicit updates, offline restart, and last-known-good recovery. No route, store, format, or user data was migrated.
