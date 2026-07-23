# TS-Dash readable-source recovery and rewrite contract

Status: source recovery exhausted; opaque runtime frozen and unchanged; bounded
readable parallel successor verified locally in R4B without cutover authority.

No readable TS-Dash source or source map exists in the current checkout, any local branch/tag/reflog/unreachable Git object, or another workspace project inspected on 2026-07-22. The runtime is a Vite-generated JavaScript bundle and generated Workbox output. Generated files must not be hand-edited.

## Disposition

Keep the current route and bundle as a frozen compatibility implementation while building a readable replacement. Do not integrate it with WorkOS data or claim reproducibility until the following behavior-first parity gate passes.

## Required parity

- Preserve `/apps/ts-dash/`, installation/offline launch, keyboard navigation, responsive layout, and reduced motion.
- Preserve `TSDashDB` v1/v2 records and migrations without destructive reset; test upgrade from representative legacy data and concurrent/stale writers.
- Preserve accepted JSON/CSV inputs, rejection messages, mappings, normalized exports, file names, clear confirmation, and explicit user-directed file transfer.
- Freeze current transformations as golden input/output fixtures. Define units, missing-value behavior, ordering, rounding, date/time handling, and deterministic output.
- Preserve current visualizations while adding equivalent tables/text. Never imply causation or expose a universal score.
- Meet the CommonGround design, CSP, content, license, local-file, offline, accessibility, deterministic-build, and artifact gates.
- The rewrite may replace React/Dexie/Papa Parse/Workbox/chart/state/ID dependencies only after parity; every retained dependency needs exact provenance, license, security posture, bundle impact, replacement path, and tests.

Cutover requires old/new side-by-side fixture parity, import/export round trips, storage migration/recovery evidence, browser and assistive-technology evidence, and a rollback path. Remove the opaque bundle only after one verified release retains a compatibility reader/exporter.

R4B implementation commit `0f5b455` satisfies the readable parsing,
normalization, deterministic analytics/file-transform, semantic preview,
frozen-runtime golden comparison, legacy JSON round-trip, additive v1-to-v2
upgrade, inactive offline-source, and automated accessibility prerequisites.
It intentionally does not supply production routing, app-owned persisted
storage/import UI, real quota/eviction evidence, manual assistive-technology
evidence, owner acceptance, migration, cutover, retirement, or release
evidence. Those remain mandatory later gates.
