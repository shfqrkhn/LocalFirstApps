# CommonGround LifeOS R3A Contract

Version `1.0.0` defines the bounded CommonGround LifeOS foundation. The private MPES remains prime authority. This packet does not authorize data migration, route retirement, content approval, later HealthOS modules, or a shared runtime.

## Shell and ownership

CommonGround LifeOS is the product shell label seeded by the existing `apps/healthos/` runtime. HealthOS Focus keeps its route, installed-app identity, IndexedDB `healthos-focus` v1, `healthos.preferences.v1` key, `healthos-` cache prefix, worker scope, records, timer, transfer/backup/CSV formats, and recovery behavior.

`apps/healthos/modules/lifeos-shell.js` is the pure module catalog. `apps/healthos/lifeos-adapter.js` is the app-owned adapter over OmniCore error/result, time, and receipt seams; the existing shared design primitives remain the visual seam. The bounded modules are:

- **Focus:** active seed owned by HealthOS with app-owned data access.
- **Reflection:** adapter-only preparation owned by Noodle Nudge; LifeOS has no data access.
- **Strength:** link to the canonical Flexx Files surface; LifeOS has no data access.

There is no suite database, hidden cross-app read/write, global bus, universal worker, implicit synchronization, backend, account, provider, or remote AI dependency.

## Recoverable preference restore

HealthOS backup format `1.x` is unchanged. Restore validates integrity, then one IndexedDB transaction replaces records, receipts, runtime timer state, and writes a `pending-preference-restore` marker. Only after that transaction commits does one normalized localStorage preference write occur. Success removes the marker. A failed preference write rejects with `HEALTHOS_PREFERENCES_PENDING`, never claims full success, leaves restored records available, and exposes an idempotent retry. Failure to clear the marker is also recoverable by retry. Partial IndexedDB failure still aborts without mutation.

## Reflection extraction

Noodle Nudge owns `reflection/definitions.js`, `reflection/scoring.js`, `reflection/backup.js`, and `reflection-adapter.js`. Its current route, UI, `NoodleNudgeDB` v1, backup behavior, PWA scope, and user data are unchanged. The former `scoring.js` URL is a compatibility re-export.

The catalog fixes the ten canonical local assessment paths and validates identity, interaction structure, and inert scoring expressions before activation. This structural/scoring validation is not professional, psychometric, clinical, provenance, license, or content approval; all content remains quarantined. The captured 42-rule outputs remain exact.

Legacy Noodle backups, including backups without `userHistory`, remain accepted by the extracted compatibility validator. `createLifeOsReflectionPreview` produces only a deterministic, explicit, non-mutating proposed mapping. It cannot write any app store and is not a migration receipt or authorization.

## Verification and rollback

`tests/r3a-lifeos-regression.mjs` proves module boundaries, versioned adapters, ten-definition/42-rule coverage, hostile definition/expression/backup rejection, old scoring URL compatibility, old backup compatibility, exact preview mapping, no mutation authority, and complete offline shells. Browser tests prove preference failure/retry, existing format/recovery behavior, stale/replay/atomic faults, independent Noodle/Flexx surfaces, foreign cache/store survival, responsive/file/offline operation, and automated accessibility.

Rollback is code-only: revert implementation commit `17863b9`. No database version, persistent schema, route, compatibility URL, format, cache prefix, worker scope, or user data was migrated.
