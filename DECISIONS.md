# Decisions

Public-safe architectural decisions for LocalFirstApps. Private source specifications remain outside this repository.

## Authority

`MPES-LocalFirstApps-Unified-v1.1.0.md` is the prime human-readable project authority. `PROJECT_STATE.yaml` records observed execution state and may not silently override the MPES. Explicit later owner directions are recorded as amendments; conflicts remain visible until resolved.

## D-001 — Consolidate LedgerSuite into CommonGround

- **State:** Accepted by repository owner
- **Decision:** CommonGround is the single active facilitation and decision application. Decision Analysis supports personal, professional, and shared contexts.
- **Amendment:** The prime MPES places LedgerSuite and CommonGround as separate components, while the owner explicitly directed their consolidation. The approved amendment changes placement only; MPES invariants for preservation, migration, recovery, offline use, accessibility, evidence, and release authority remain binding.
- **Compatibility:** Keep an unlisted, archive-excluded LedgerSuite redirect for the v0.2.0 transition. Retain LedgerSuite v1/v2 file import and same-origin database migration indefinitely.
- **Safety:** Migration validates and previews first, writes a new-ID copy atomically, records an idempotency fingerprint, and leaves the source untouched unless the user downloads a backup and explicitly confirms deletion.
- **Rollback:** Revert the consolidation commit. The source database is preserved by default, and CommonGround can restore its pre-reset/exported backups.

## D-002 — Preserve app isolation

- **State:** Accepted
- **Decision:** LifeOS, WorkOS, and OmniCore are conceptual product and assurance boundaries, not a mandate for one runtime or one screen.
- **Implementation:** Keep focused static apps independently launchable. Share only narrow contracts and use explicit user-reviewed file transfer rather than hidden cross-app writes.

## D-003 — Stage PWA updates

- **State:** Accepted
- **Decision:** Cache the complete versioned shell before installation and wait for explicit user activation when replacing an active CommonGround worker.
- **Rollback:** The prior active worker and cache remain available until the staged worker is activated.

## D-004 — Preserve hard constraints and newer concurrent edits

- **State:** Accepted
- **Decision:** Decision Analysis stores non-negotiable constraints as distinct records; comparative option scores cannot offset them. Mutable singleton records carry revisions, and a stale tab must reload instead of overwriting a newer saved revision.
- **Limit:** Independent list-item additions remain separate records, but semantic reconciliation across different records is deferred to the shared M1 conflict contract.
- **Rollback:** Export the current workspace, revert the consolidation commit, and restore the preserved LedgerSuite source or CommonGround backup as applicable.
