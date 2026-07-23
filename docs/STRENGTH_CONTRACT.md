# CommonGround LifeOS Strength R3B–R3E Contract

Version `1.1.0` defines the bounded Flexx-owned Strength foundation, controller,
and design-adapter boundary. The private MPES remains prime authority. R3B–R3E
do not migrate data, approve training/health content, or grant CommonGround
LifeOS access to Flexx storage.

## Ownership and topology

Flexx Files `3.9.78` remains the independently launchable canonical UI at `apps/flexx-files/`. Its storage schema remains `v3`; its worker scope, `flexx-` cache ownership, manifest, backup/reset workflow, calculations, and visible workflows remain app-owned. The LifeOS shell only links to Flexx. There is no cross-app read/write, dual-write, hidden sync, shared database, global bus, universal worker, backend, account, provider, or AI dependency.

`apps/flexx-files/strength-adapter.js` is the app-owned `1.0.0` facade. Pure implementations live under `strength/`: calculations/progression, readiness, backup/draft recovery, and the storage contract. `js/core.js` retains the storage implementation and compatibility exports; `js/app.js` consumes the facade rather than importing the core directly.

## Complete persisted-key inventory

All reset and usage operations remain prefix-scoped to `flexx_`. R3B adds, renames, migrates, or deletes no key.

| Key | Observed shape | Role |
| --- | --- | --- |
| `flexx_sessions_v3` | JSON `session[]` | Canonical completed-session history. |
| `flexx_draft_session` | JSON `session` | Debounced in-progress recovery draft. |
| `flexx_migration_version` | string `v3` | Current schema marker. |
| `flexx_prefs` | opaque legacy value | Reserved compatibility key; current runtime does not interpret it. |
| `flexx_backup_snapshot` | opaque legacy value | Reserved compatibility key; current runtime does not interpret it. |
| `flexx_audit_log` | JSON audit-entry array | App-owned bounded security diagnostics. |
| `flexx_errors` | JSON error-entry array | App-owned bounded error diagnostics. |

A session requires UUID `id`, ISO-compatible `date`, `green|yellow|red` `recoveryStatus`, and `exercises[]`. Optional persisted fields are numeric `sessionNumber`, `weekNumber`, and `totalVolume`; `warmup[]`; `cardio`; and array or legacy-object `decompress`. Exercise records preserve `id`, `name`, `weight`, and optional `setsCompleted`, `completed`, `usingAlternative`, `altName`, and `skipped`. Existing allowlist scrubbing and validation remain authoritative.

## Backup, draft, and reset compatibility

Manual backup remains `{version, exportDate, sessions}`; auto-backup remains `{version, type:"auto", sessions}`. Restore still accepts both object backups and legacy top-level session arrays, validates and scrubs every session, then overwrites only `flexx_sessions_v3` after explicit confirmation. App version metadata advances to `3.9.76`; storage schema stays `v3`, and `3.9.75` backups remain accepted. Malformed input fails closed. Quota/storage failure is visible and retains the prior sessions and unrelated localStorage.

Draft validation preserves the existing behaviors: valid drafts resume; structurally invalid parsed drafts are discarded; unparseable raw draft bytes are not overwritten; failed draft persistence retains the in-memory draft. Factory reset downloads a complete backup first, then removes only `flexx_` keys, `flexx-` caches, and the exact app worker registration.

## Calculation and readiness parity

`strength/calculations.js` owns plate loading, alternative-exercise identity, last-attempt/completion/non-deload/green lookup, stall detection, recovery multiplier, deload boundary, and progression. `strength/readiness.js` owns the existing first-session, minimum-rest, and long-gap result shapes. The UI consumes both through the Strength adapter.

The frozen pre-R3B characterization hash covers 250 deterministic histories, every public progression/lookup method, and 1,041 half-pound plate inputs. Existing focused native tests additionally cover precision, LRU behavior, alternatives, volume, draft handling, storage reset, rendering, pagination, and version consistency. R3B does not assert that the training rules are professionally approved.

## Controller boundary and compatibility inventory

The existing HTML/UI depends on exactly these `window` handlers:

- Workout mutation: `updateWarmup`, `updateCardio`, `updateDecompress`, `setRec`, `modW`, `togS`, `swapAlt`, `swapCardioLink`, `nextPhase`, `finish`.
- Timer/navigation: `skipTimer`, `skipRest`, `startCardio`, `loadMoreHistory`, `viewProtocol`, `closeProtocol`, `drawChart`.
- Recovery/destructive actions: `del`, `wipe`, `imp`.

R3C implements them through `controller/state.js`, `commands.js`, `timer.js`, `modal.js`, `views.js`, and `bindings.js`. `js/app.js` is a 209-line composition root; `bindings.js` owns the exact 20-name facade plus app-local navigation, delete, and storage-event bindings. Views use safe numeric/chart construction and sanitized protocol content. Session storage events invalidate the app cache, refresh inactive history/progress views, preserve active workouts, and ignore foreign keys. Completing a session clears active/draft state before lifecycle persistence can restore it.

## Preview, verification, and rollback

`createStrengthLifeOsPreview` accepts validated legacy/current backup input and returns only an exact deterministic proposal with `mutationAllowed:false`. It has no storage capability and is neither a migration receipt nor authorization. HealthOS and Noodle import no Strength adapter code.

`tests/r3b-strength-regression.mjs`, `tests/r3c-strength-controller-regression.mjs`, and `tests/fixtures/lifeos-strength-preview-v1.json` prove versions, storage inventory, full calculation hash, readiness, backup shapes, drafts, malformed/quota failures, preview no-mutation, every controller command/state/render/modal/timer path, exact compatibility bindings, multi-tab refresh, independent ownership, and complete offline assets. Browser gates prove full workout phases, swaps, timers, finish cancel/confirm, draft cleanup/restore, charts/protocol, reset failures, foreign survival, route/subpath/offline behavior, responsive layout, file fallback, and automated accessibility. Rollback is code-only: revert R3B `097822a` and/or R3C `93cd803`; neither changes persisted schema or user data.

R3E maps the existing legacy variables to CommonGround design contract `1.1.0`
inside Flexx-owned CSS, preserving its dense dark/orange training identity and
bottom navigation. Shell `3.9.78` integrity-binds the shared stylesheets. No
calculation, content, controller, global handler, route, format, store, worker
scope, or data changes. Revert `8e8b5a1` for R3E code/style-only rollback.
