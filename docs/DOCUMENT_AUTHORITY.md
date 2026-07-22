# Document Authority

This hierarchy resolves conflicts; it does not turn observations into requirements or source content into professional guidance.

| Level | Authority | Files and rule |
| --- | --- | --- |
| A0 | Binding external constraints | Applicable law, platform/security/privacy constraints, and the repository owner's latest explicit instruction. These always win. |
| A1 | Prime product authority | Private `MPES-LocalFirstApps-Unified-v1.1.0.md`, amended only by explicit owner decisions recorded in `DECISIONS.md`. The MPES is the ultimate project specification beneath A0. |
| A2 | Accepted decisions | `DECISIONS.md`. It makes owner-approved MPES amendments and unresolved conflicts visible; it cannot invent owner intent. |
| A3 | Normative engineering contracts | `docs/INTERCHANGE_CONTRACT.md`, `docs/PWA_ASSURANCE_CONTRACT.md`, `docs/HEALTHOS_CONTRACT.md`, `docs/REPO_ZIP_POLICY.md`, and `docs/future-app-intake.md`. They govern their bounded interfaces only. |
| A4 | Observed execution truth | `PROJECT_STATE.yaml`, current Git state, runtime source, schemas, tests, CI, and deployment evidence. They prove what exists; they cannot silently redefine A0–A3. |
| A5 | Evidence and operations | `docs/EVIDENCE_RECEIPT.md`, `docs/CAPABILITY_RECOVERY_MATRIX.md`, `docs/AI_MAINTAINER_HANDOFF.md`, and this audit. Claims must remain within their evidence limits. |
| A6 | Derived plans | `docs/MPES_IMPLEMENTATION_PLAN.md`. Plans are replaceable execution proposals, never product authority. |
| A7 | Descriptive/source material | Root/app READMEs, screenshots, question banks, assessment/content JSON, and `apps/flexx-files/Complete_Strength_Protocol.md`. They may describe or supply content but cannot override requirements or establish medical, legal, psychometric, licensing, or exam-authority claims. |
| A8 | Historical archive | `archive/`. Recovery evidence only; never current behavior, a test gate, or an authority. |

## Conflict Protocol

1. Stop destructive or release work when two applicable sources disagree.
2. Record the conflict and affected data/compatibility surface in `PROJECT_STATE.yaml`.
3. Apply the higher level. Within one level, use the narrower accepted contract; if still tied, use the later explicit owner decision.
4. Preserve user data and compatibility while ambiguity remains.
5. Update the decision, contract, tests, evidence, and handoff together. Never “resolve” a conflict only in implementation.

The current owner amendment narrows the final product to CommonGround-branded LifeOS and WorkOS surfaces while retaining isolated stores, explicit file transfer, migration compatibility, and independently reversible delivery. Existing focused apps remain supported migration sources until parity, recovery, and retirement gates pass.
