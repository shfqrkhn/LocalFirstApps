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

## D-005 — Integrate through explicit portable files

- **State:** Accepted
- **Decision:** The shared M1 surface is a dependency-free semver `1.x` portable-record package and validator. Apps keep isolated storage and own narrowly scoped adapters; there is no suite database, hidden cross-app read, synchronization, background mutation, or network transport.
- **Safety:** A transfer must select, show exact serialized content, require confirmation, validate size/shape/version/hashes, apply records plus a unique idempotency receipt atomically, and expose rollback. Unknown record and payload fields stay inert and survive the CommonGround pilot round trip. Unsupported majors fail visibly.
- **Compatibility:** CommonGround portable records are additive. CommonGround export v2, CommonGround v1 import, LedgerSuite v1/v2 import, existing routes, data and source-preserving migration remain unchanged.
- **Rollback:** Roll back an individual applied receipt in Settings, or revert the M1 commit. Receipts remain after rollback as replay protection; pre-M1 data is untouched by the v4 additive store upgrade.

## D-006 — Reuse assurance, not runtime state

- **State:** Accepted
- **Decision:** CommonGround and Flexx Files use one dependency-free PWA assurance contract while retaining app-owned workers, manifests, caches, schemas, data stores, update UI, and reset behavior. No shared data store, hidden synchronization, telemetry, external transmission, or background business mutation is introduced.
- **Safety:** A content-addressed candidate must cache completely before install succeeds. Missing, corrupt, interrupted, or quota-failed candidates delete only their incomplete cache and cannot displace the active shell. Activation stays explicit and is blocked when the worker does not declare the current data schema compatible. Cache integrity is rechecked before use and one complete prior shell is retained for last-known-good recovery.
- **Operations:** First install claims without a reload loop. Later controller changes reload each open tab once. Health is read-only and reports unavailable estimates honestly. Cache clear and factory reset remain app-scoped; Flexx and CommonGround reset only after a complete backup starts successfully.
- **Compatibility:** CommonGround database v3 upgrades additively to v4; CommonGround/LedgerSuite formats, M1 receipts, Flexx `v3` storage, drafts and backups remain unchanged. Hosted repository subpaths work; `file://` remains a safe reduced fallback because browsers do not provide module/worker parity there.
- **Rollback:** Revert the M2 commit. Existing user stores are not migrated or rewritten by this packet; the retained old worker/cache or an app export remains the recovery source.

## D-007 — Add an isolated HealthOS focus surface

- **State:** Accepted for the bounded M3A packet
- **Decision:** Add `apps/healthos` as the app-owned daily-state/focus surface and minimal HealthOS navigator. Noodle Nudge remains canonical for reflection/self-inquiry and Flexx Files remains canonical for strength/readiness/progression; neither runtime or store is merged or read by HealthOS.
- **Integration:** Share only versioned M1-compatible `daily_state` and `focus_session` schemas plus pure timestamp math. Movement uses exact-preview portable files with atomic app-owned apply/receipt/rollback. TS-Dash receives explicit deterministic CSV and remains a generic source-data consumer.
- **Safety:** Keep observations distinct with no aggregate score. Timer completion is user-reviewed, stale-tab-safe and idempotent. Device cues are detected, opt-in and degradable; health language is non-diagnostic and pressure-free. Meditation, breathing, C25K, mobility, sleep and later modules stay inactive pending separate acceptance.
- **Compatibility amendment:** Preserve every existing URL during this unpublished M3A packet, including the LedgerSuite migration alias. Its earlier one-release removal note is superseded by the MPES deprecation rule: removal requires explicit approval, migration evidence, and rollback planning.
- **Rollback:** Revert the M3A commit. Existing app data and code were not migrated; HealthOS complete backup restores its own v1 records/runtime, and the pre-M3A suite remains independently usable.
