# Archive

Historical, non-runtime material moved out of active app trees on 2026-07-22. This directory is excluded from repository ZIPs, CodeQL runtime analysis, and active regression scans. Archived files are evidence only: they are not tests, requirements, supported assets, or implementation precedent.

Nothing here was deleted. Restore a file with `git mv archive/<path> <original-path>` after re-establishing a current reference, owner, and gate.

## Manifest

| Archived paths | Previous location | Reason |
| --- | --- | --- |
| `commonground-unused-assets/apple-splash/*.png` (16 files) | `apps/commonground/icons/splash/` | No HTML, manifest, CSS, worker, or documentation reference; redundant launch artwork increased runtime-tree noise. |
| `commonground-unused-assets/icons.svg` | `apps/commonground/icons.svg` | Unreferenced source sheet; active PNG icons remain. |
| `flexx-files-legacy-tests/benchmark_*` (23 files) | `apps/flexx-files/tests/` | Ad hoc experiments with no baseline, threshold, CI gate, or maintained package entrypoint. They cannot establish a performance claim. |
| `flexx-files-legacy-tests/verify_e2e_flow.py` | `apps/flexx-files/tests/` | Obsolete screenshot harness that swallowed failures and could exit successfully after an error. |
| `flexx-files-legacy-tests/verify_input_zoom.html` | `apps/flexx-files/tests/` | Manual one-off browser fixture with no automated assertion or current test reference. |

The archived benchmark filenames are: `benchmark_accessibility.mjs`, `benchmark_accessibility_audit.js`, `benchmark_app_lookup.mjs`, `benchmark_audit_log.mjs`, `benchmark_calculator.mjs`, `benchmark_chart_logic.mjs`, `benchmark_delete_session.mjs`, `benchmark_get_last_non_deload.mjs`, `benchmark_logger.mjs`, `benchmark_lookup.mjs`, `benchmark_plate_load.mjs`, `benchmark_render_history_cache.mjs`, `benchmark_render_nav.mjs`, `benchmark_render_nav_skip.mjs`, `benchmark_render_warmup_optimization.mjs`, `benchmark_sanitize_json.mjs`, `benchmark_sanitize_url.mjs`, `benchmark_save_draft.mjs`, `benchmark_save_session_lookup.mjs`, `benchmark_save_session_real.mjs`, `benchmark_storage.mjs`, `benchmark_storage_reset.mjs`, and `benchmark_storage_usage.mjs`.

## Archive Rule

Archive only when reachability and ownership checks show that a path is inactive. Never archive user-data compatibility code, migrations, portable schemas, legal notices, source licenses, canonical fixtures, or recovery tests merely because they are old. Prefer deletion only after a later explicit retention decision.
