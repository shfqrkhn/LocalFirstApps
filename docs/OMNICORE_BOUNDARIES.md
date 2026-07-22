# OmniCore boundaries

OmniCore is a reusable contract layer, not a monolithic application, global database, or mandatory framework.

## R2 implemented surface

`shared/omnicore/manifest.json` is the machine-readable `1.0.0` inventory. It records license, consumers, adapters, non-goals, and failure behavior for each promoted contract.

- `errors.js`: typed failures, validation reports, and expected-revision checks.
- `integrity.js`: canonical JSON and SHA-256.
- `time.js`: explicit ISO instant conversion, validation, and local timezone resolution.
- `indexeddb.js`: request completion, transaction completion, request-fault propagation, and safe abort helpers only.
- `receipts.js`: fail-closed rollback eligibility and immutable rollback state transition.
- Existing portable transfer, app-scoped PWA assurance, and design primitives remain part of the proven surface.

CommonGround and HealthOS consume these modules only through app-owned adapters. They retain separate databases, transaction scopes, error wording, workers, caches, domain records, routes, and reset/recovery flows. The old `shared/healthos.js` and `shared/focus-timer.js` URLs are compatibility re-exports; their canonical implementations are HealthOS-owned under `apps/healthos/modules/`.

## Share

- Design tokens, accessibility primitives, suite navigation, PWA assurance, deterministic build metadata, content-review schemas, version projections, import/export envelopes, and test utilities.
- Pure functions and adapters with explicit inputs, outputs, ownership, schema versions, migrations, and failure behavior.

## Keep app-owned

- IndexedDB/localStorage databases, domain records, scoring, calculations, routes, manifests, service workers, recovery flows, and user-facing terminology.
- CommonGround owns LedgerSuite compatibility. TS-Dash remains WorkOS analytics. HealthOS owns timers and wellness records. Flexx Files owns strength records. Noodle Nudge and PMQuiz own their content and scoring domains.

## Integration rules

1. No implicit reads across app stores, shared mutable singleton, global event bus, or background data transfer.
2. Transfer is user-initiated, previewed, schema-validated, attributable, reversible where possible, and never deletes the source.
3. A shared contract has one canonical definition and app-specific adapters. Version incompatibility fails closed with a useful message.
4. App migrations ship independently after parity tests. Existing routes and file formats remain supported until an explicit, tested deprecation window closes.
5. Shared code must be smaller and clearer than the duplication it replaces; otherwise keep the boundary duplicated and documented.

## Verification and rollback

`tests/omnicore-regression.mjs` proves two-adapter canonical/hash/time parity, typed validation/revision/receipt failures, IndexedDB request-fault propagation, abort behavior, semver metadata, license metadata, and complete offline shell inclusion. Existing browser tests prove atomic partial/quota failure, replay rejection, stale writes, format compatibility, app-scoped recovery, and foreign-cache survival. Reverting R2 is code-only: no database version, persisted record, route, export/import format, or compatibility path changed.
