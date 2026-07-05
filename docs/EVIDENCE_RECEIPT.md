# Evidence Receipt

This public-safe receipt keeps LocalFirstApps claims tied to evidence instead of chat history.

## Evidence Classes

- `PASS`: directly covered by current files, tests, or checks.
- `PASS_WITH_LIMITATIONS`: true only within the stated scope.
- `NOT_RUN`: not checked in the current pass.
- `BLOCKED`: cannot be checked until an external condition changes.
- `NO_GO`: failed or unsafe; do not publish until fixed.

## Claim Firewall Invariant

- Every public technical, security, privacy, download, app-membership, file/live, or support claim must map to a `Claim Boundaries` row or be added with evidence before publication.
- Public claims may not exceed `PASS` or `PASS_WITH_LIMITATIONS`; `NOT_RUN`, `BLOCKED`, and `NO_GO` items must stay unpublished or be labeled as unavailable.
- Volatile app membership, links, screenshots, file/live behavior, and GitHub settings must be rechecked from current repo state before reliance.

## Claim Boundaries

| Area | Class | Evidence | Limit |
| --- | --- | --- | --- |
| Static local-first suite | `PASS` | launcher, app folders, static tests | Individual browser capabilities can vary by local file mode. |
| No backend/telemetry/accounts/OAuth/API keys | `PASS` | static scan and app-provider pattern test | Future apps must pass intake before joining the suite. |
| Per-app launcher/README/screenshot/shared shell | `PASS_WITH_LIMITATIONS` | static regression tests | Recheck after each app migration or screenshot change. |
| File/live behavior clarity | `PASS_WITH_LIMITATIONS` | shared shell, local-file and live tests | GitHub Pages and local file behavior should both be tested after runtime changes. |
| Repository ZIP safety | `PASS_WITH_LIMITATIONS` | `.gitattributes`, `docs/REPO_ZIP_POLICY.md`, static tests | Recheck no tests, packages, exports, private notes, or retired provider overlays are bundled. |

## Required Before Public-Facing Change

- `git status --short --ignored`
- `git rev-list --left-right --count HEAD..."@{u}"`
- `npm run test:all`
- `git diff --check`
- protected-path scan
- live Pages check after runtime or public-surface changes
