# CommonGround WorkOS contract

Version: 1.0.0  
Status: normative R4A foundation; locally verified implementation evidence is
recorded separately.

## Product and ownership

WorkOS is a CommonGround-owned grouping, shell, and navigation contract. It is
not a shared runtime, database, worker, event bus, or authority over another
app. `apps/commonground/workos/catalog.js`, `workos/shell.js`, and
`workos-adapter.js` are app-owned, versioned, dependency-free seams.

| Module | State | Runtime owner | R4A capability |
| --- | --- | --- | --- |
| Collaboration | active | CommonGround | existing facilitation matters |
| Decisions | active | CommonGround | existing Decision Analysis matters |
| Insights | inactive metadata | TS-Dash | none |
| Learning | inactive metadata | PMQuiz | none |
| Knowledge | inactive metadata | unassigned | none |

Only CommonGround may mutate its WorkOS records. Catalog membership grants no
route, storage, import, worker, cache, synchronization, or mutation authority.
Unknown or inactive modules fail closed and are not exposed as available
actions.

## Active-module delegation

The WorkOS adapter delegates to the authoritative CommonGround matter registry,
route map, suitability logic, and next-step selector. It must not duplicate or
reinterpret domain rules. R4A preserves:

- every facilitation and Decision Analysis matter type, route, bookmark,
  suitability gate, hard constraint, stage, revision, conflict, and deletion
  rule;
- IndexedDB `commonground-suite` version 4, all thirteen stores, indexes,
  records, transaction boundaries, receipts, and stale-write rejection;
- CommonGround v1/v2 and LedgerSuite v1/v2 import compatibility, integrity
  exports, portable preview/receipt/rollback, and backup-gated scoped reset;
- manifest, worker registration, cache scope, complete candidate staging,
  explicit activation, offline/subpath behavior, and last-known-good recovery;
- CommonGround branding, progressive disclosure, semantic navigation, status,
  modal focus containment/restoration, reduced motion, forced colors, 44 px
  targets, and responsive/reflow behavior.

LifeOS and every focused app remain independent. Cross-app exchange remains an
explicit, reviewed file transfer under the interchange contract.

## Activation prerequisites

- **Insights:** a readable behavior-first TS-Dash rewrite, recovered parity
  matrix, deterministic imports/exports, owned storage/recovery, offline/PWA
  evidence, and explicit owner acceptance.
- **Learning:** approved provenance/license/domain review, deduplication,
  deterministic session and scoring contracts, owned storage/recovery, and
  explicit owner acceptance.
- **Knowledge:** an accepted owner plus user-controlled source, schema,
  provenance, storage, export/deletion, recovery, privacy, and UI contracts.

Activation requires a later versioned decision, tests before mutation, exact
compatibility and recovery evidence, and independently reversible delivery.

## Exclusions and safe failure

WorkOS adds no shared store, cross-app read, dual write, hidden aggregation,
sync, backend, account, telemetry, AI, professional/causal claim, universal
worker, or dependency. It does not retire focused routes or compatibility
readers.

If catalog or shell integrity fails, the candidate is rejected; the active or
last-known-good CommonGround shell and user data remain untouched. R4A rollback
is code/style-only and needs no data downgrade.
