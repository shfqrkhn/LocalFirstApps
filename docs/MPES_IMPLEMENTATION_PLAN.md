# MPES v1.1.0 Implementation Plan

`MPES-LocalFirstApps-Unified-v1.1.0.md` is the prime human-readable authority. `PROJECT_STATE.yaml` is the machine-readable observed state. Owner-approved amendments belong in `DECISIONS.md`; neither state nor implementation may silently override the MPES.

## Analysis

The MPES is a portfolio architecture and assurance contract, not permission for a monolith. It requires two user-facing groupings—LifeOS and WorkOS—under an invisible OmniCore assurance layer, with Insight, Knowledge, and Learning engines. Focused apps stay independently usable; integration uses narrow schemas and explicit user-reviewed transfer. Core workflows must remain local, offline after installation, no-AI, portable, recoverable, accessible, and static-hostable.

The observed repository already provides five focused apps and local verification infrastructure. The in-progress CommonGround packet is an out-of-order WorkOS proof authorized by the owner. It merges LedgerSuite into CommonGround; this is an explicit amendment to the MPES placement table, not a waiver of its compatibility or assurance requirements. Broader HealthOS, interchange, Insight, Learning, Knowledge, PMOS, and optional AI modules remain incomplete and must not be implied by this packet.

## Universal Packet Contract

Every packet starts from current files and records baseline HEAD/status, requirements, affected data and routes, fixtures, success evidence, rollback, risks, and authority. Implement the smallest reversible change with tests first or alongside it. Validate imports before preview; mutate only after confirmation and atomically where material. Preserve old URLs, data, and exports until migration and rollback pass. Update `PROJECT_STATE.yaml`, decisions, risks, evidence, screenshots, and handoff. Stop on failed gates, unsafe uncertainty, non-convergence, absent authority, or negligible value. No push, release, deployment, remote mutation, credential use, purchase, or external adapter activation without explicit owner approval.

## Execution Order

### P0 — Close current packet and reconcile baseline

Finish CommonGround/LedgerSuite local verification; record the owner amendment, exact migration/rollback evidence, known limitations, and local commit. Then re-inventory all app routes, storage, exports, service workers, dependencies, accessibility, screenshots, and test gates against current HEAD. Gate: reproducible clean baseline, no unexplained conflict, no publication claim.

### M1 — Shared interchange and recovery proof

Define the minimal semver portable-record envelope, data classifications, manifest, validation errors, unknown-field policy, provenance, revisions, IDs, timezone/unit rules, and fixtures. Add round-trip, unsupported-major, malformed, replay, atomicity, correction/deletion, quota, and rollback tests. Pilot in one app without replacing its prior export; document adapter/migration. Gate: no loss, no partial mutation, explicit preview/confirmation/receipt.

### M2 — PWA baseline proof

Extract only a narrow reusable pattern for versioned manifests, complete shell staging, user-visible activation, offline fallback, scoped cache reset, storage health, subpaths, and reduced file mode. Pilot in CommonGround, then one contrasting app. Test first install, refresh, offline restart, update/stale/missing assets, interrupted update, old/new schema combinations, multiple tabs, user-data survival, quota/eviction. Gate: no mixed shell/schema and recoverable prior cache.

### M3 — HealthOS convergence

Preserve Noodle Nudge and Flexx Files as recognizable canonical modules. Define versioned daily-state and module-session schemas plus explicit user-reviewed transfers; add a small HealthOS launcher/shared navigation, not shared hidden storage. Implement trustworthy Pomodoro/open timer first with timestamp reconciliation, reload/sleep/duplicate-tab tests, manual correction, degraded modes, no diagnosis/streak pressure, export and TS-Dash adapter fixture. After acceptance, separately add meditation/breathing, then data-driven C25K, mobility/recovery, sleep and distraction records. Gate each module independently.

### M4 — WorkOS integration

Close the CommonGround Decision Analysis proof with personal/professional/shared context, evidence/assumptions/options, hard constraints separate from scoring, authority/dissent/invalidation, outcome review, export, migration, accessibility, offline update, stale-writer and recovery evidence. Then build the smallest PMOS Basic console only if a recurring need is demonstrated; Managed, Assured, and Advanced remain progressive opt-ins. Gate: no professional approval implied and full manual/no-AI fallback.

### M5 — Insight Engine adapter

Keep TS-Dash generic and source-app records canonical. Import explicit HealthOS and CommonGround envelopes, preview transformations, label missingness and correlation limits, preserve precision/timezone/units, and export reproducible derived data plus chart configuration. Gate: deterministic fixtures and no hidden cross-app reads.

### M6 — Learning Engine

Preserve PMQuiz, add local Course Pack folder/file inventory and module mapping, then integrate question-bank candidates, confidence-before-answer, calibration, spaced review, weak-area selection, delayed retest, and explicit Knowledge export. Exclude authenticated scraping, submission, grading, proctoring, bypass, and required large-media transcoding. Gate: offline/no-AI completion and portable progress.

### M7 — Knowledge Engine decision and proof

Evaluate the supplied Zettelkasten artifact against retain, wrap, modularize, or keep-separate options. Select only after migration, import security, performance, deterministic manifest, ID/link/backlink, snapshot, correction/deletion, and recovery evidence. Transactional app data becomes knowledge only through explicit user selection.

### M8 — Optional enterprise AI modules

Only after M1–M7 are stable, implement deterministic Enterprise AI Workflow Lab and manual AI Factory Router modes. Start with no-provider and manual copy/paste packets. Any future adapter is optional, capability/freshness declared, previews exact data, marks candidate output, requires explicit acceptance, and never directly mutates canonical records or causes external effects. Gate unavailable/refusal/timeout/malformed tests and owner approval for any network or credential behavior.

### M9 — Release and operating assurance

Run full static, component, integration, browser-target, accessibility, keyboard/touch, offline, CSP/security, dependency/license, migration, portability, deletion-closure, concurrency, locale/timezone/unit, and no-network/no-AI gates. Conduct a fresh critic/diff/rollback pass. Release only with explicit authority through protected checks; verify exact deployed SHA and routes. Continue controlled-operation and longitudinal evidence before claiming `OPERATING_ASSURED`.

## Completion Definition

Completion means every accepted MPES requirement is traceable to implementation and current evidence, or is explicitly owner-accepted as retired/not applicable with rationale. All preserved URLs/data/formats have tested compatibility or approved deprecation; recovery and manual fallback remain reachable; critical workflows pass claimed accessibility/offline/no-AI modes; project state, decisions, risks, evidence, release notes, and handoff agree; the exact released configuration is observed. Code existence alone is never completion.

## Consolidated `/goal` Prompts

Use one prompt at a time. Each inherits the prime MPES and Universal Packet Contract above.

1. `/goal Reconcile and close P0: inspect current LocalFirstApps HEAD, worktree, instructions, five active apps plus LedgerSuite compatibility alias, routes, storage, exports, service workers, dependencies, screenshots, docs, and tests. Finish the bounded CommonGround consolidation verification without broadening scope; prove legacy migration/import/reset/offline/update/decision-context compatibility and rollback. Update PROJECT_STATE, decisions, risks, evidence, and handoff; commit locally only if all local gates pass. Do not publish or mutate remotes.`
2. `/goal Implement M1 shared interchange and recovery proof from the prime MPES. Create the smallest semver envelope, manifest, validator, fixtures, provenance/revision/timezone/unit rules, and explicit preview-confirm-atomic-apply-receipt flow. Pilot in one existing app while preserving prior exports. Test round trip, unknown fields, unsupported major, corrupt/oversize/replayed input, stale writer, quota, correction/deletion closure, rollback, and no external transmission. Update project evidence; stop at the verified local gate.`
3. `/goal Implement M2 reusable PWA baseline proof. Pilot a narrow versioned shell/update/reset/storage-health contract in CommonGround and one contrasting app without central runtime coupling. Test install, refresh, offline restart, staged update, stale/missing assets, interruption, old/new schemas, multiple tabs, eviction/quota, subpaths, file fallback, and user-data survival. Preserve last-known-good recovery; update state/evidence; no deployment.`
4. `/goal Implement M3 HealthOS convergence in gated packets. Preserve Noodle Nudge and Flexx Files, define shared daily-state/session interchange without hidden shared storage, add minimal shared navigation, then implement trustworthy Pomodoro/open timer with timestamp reconciliation, degraded modes, manual correction, offline/accessibility/duplicate-tab tests, and TS-Dash export. Only after acceptance add meditation/breathing and C25K as separate packets. Keep health language observational and no-AI.`
5. `/goal Complete M4 WorkOS proof under the owner-approved CommonGround amendment. Verify personal/professional/shared Decision Analysis, hard constraints versus scoring, evidence, authority, dissent, invalidation, governance, outcome review, migration, exports, concurrency, accessibility, offline and recovery. Then implement only PMOS Basic if evidence demonstrates need; keep higher modes inactive. No implied professional approval, AI dependency, or publication.`
6. `/goal Implement M5 Insight Engine adapters. Keep TS-Dash generic and source records canonical; import explicit HealthOS and CommonGround envelopes with preview, deterministic transforms, missingness/correlation labels, precision/timezone/unit preservation, and derived-data/chart-config export. Add fixtures and regression tests; forbid hidden storage reads or cross-app mutation.`
7. `/goal Implement M6 Learning Engine locally: preserve PMQuiz; add Course Pack folder/file inventory and module mapping; integrate question candidates, confidence, calibration, spaced review, weak-area selection, delayed retest, progress portability, and explicit Knowledge export. Exclude authenticated scraping, submissions, grading, proctoring, bypass, and mandatory transcoding. Prove offline/no-AI and recovery gates.`
8. `/goal Execute M7 Knowledge Engine decision. Inspect the Zettelkasten source and compare retain, wrap, modularize, and keep-separate options using migration, import security, performance, stable IDs, Markdown, links/backlinks, manifests, snapshots, deletion/correction, and recovery evidence. Implement only the lowest-complexity accepted option; require explicit user selection before transactional records become knowledge.`
9. `/goal Execute M8 then M9 only after prior gates pass. Build deterministic no-provider Enterprise AI Workflow Lab and manual AI Router first; keep adapters optional, freshness-scoped, previewed, human-accepted, and unable to cause side effects. Run full release assurance, fresh critic and rollback review. Publish only with explicit owner authority and verify the exact deployed SHA; gather controlled and longitudinal evidence before OPERATING_ASSURED.`
