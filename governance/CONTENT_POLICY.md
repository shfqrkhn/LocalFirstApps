# Content provenance and claims policy

All PMQuiz questions, Noodle Nudge assessments/content/scoring interpretations, and Flexx Files strength/wellness guidance require a ledger record. The generated ledger is an inventory, not an endorsement.

- New or changed content starts `quarantined` with source, license, version, evidence, reviewer, review date, supersession, and claim limits stated truthfully. Unknown values remain `null`; they are never invented.
- `approved` requires an accountable reviewer, review date, lawful reuse basis, directly supporting evidence, product-scope fit, and a user-facing statement no stronger than that evidence.
- Health, psychological, legal, safety, certification-readiness, diagnostic, prescriptive, causation, and endorsement claims require domain review. Until then, label them educational/self-reflective, soften or remove them, and tell users when professional guidance may be appropriate.
- Scores are app-specific reflections or practice results, not universal measures, diagnosis, treatment, safety clearance, certification readiness, or third-party endorsement.
- Duplicate content is reported, not automatically deleted. Removal must preserve identifiers, stored answers/results, exports/imports, and compatibility paths.
- Retired content remains attributable through `supersedes`; never rewrite user history silently.

Run `node tools/content-governance.mjs --write` after intentional source changes and `node tools/content-governance.mjs` in verification.
