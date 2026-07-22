# OmniCore boundaries

OmniCore is a reusable contract layer, not a monolithic application, global database, or mandatory framework.

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
