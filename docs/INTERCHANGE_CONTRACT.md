# LocalFirstApps Interchange Contract

Version `1.0.0` is a dependency-free, local file contract for deliberate transfers between suite apps. It does not create a shared database, app-to-app reads, synchronization, background mutation, network transport, accounts, or telemetry.

## Data classification

| Class | Meaning | Transfer rule |
| --- | --- | --- |
| user-authored | Content entered or explicitly accepted by the user | Include only when selected and previewed |
| source-observed | A sourced observation retained with provenance | Include source and confidence; do not promote to fact |
| derived | Deterministic app output | Include method, inputs or assumptions needed to interpret it |
| operational | Receipts, local IDs, cache state and recovery metadata | Include only when required for validation or rollback |
| secret/restricted | Credentials, authentication material, hidden device data or data outside the selected record | Never include |

Classification describes provenance, not correctness. Confidence is `null` when unknown, otherwise a number from 0 through 1. Times are ISO instants with a relevant IANA timezone alongside them. Domain quantities declare units; unitless data uses an empty object.

## Portable package

The package contains format/version metadata, a collision-resistant transfer ID, source app, timezone, explicit selection, portable records, and a SHA-256 manifest. Each record has a stable ID, namespaced type, status, provenance class, confidence, owner/source app, created/updated instants, timezone, units, assumptions, conflicts, relationships, tags, app payload, revision, and idempotency key.

Readers accept compatible `1.x` packages conservatively, preserve unknown fields, and reject unsupported majors visibly. They validate structural limits and every record/package hash before mutation. App adapters—not this module—map records into app-owned storage.

## Required transfer sequence

1. Select records.
2. Preview the exact serialized content.
3. Confirm explicitly.
4. Validate structure, supported version, hashes, size and adapter compatibility.
5. Apply all records and a unique idempotency receipt in one app-owned transaction.
6. Display the receipt and offer app-scoped rollback.

Cancel performs no write. A failed or duplicate transaction performs no partial write. Rollback deletes only IDs created by that receipt and retains the receipt as replay protection. Export and legacy formats remain separate, compatible options; an adapter must never silently reinterpret them.

Unknown fields are data, never executable instructions. Rendering uses text escaping, payloads cannot select stores, and imported HTML or script-like strings remain inert user data.
