# Third-party software inventory

`config/dependencies.json` is authoritative and generates the runtime SBOM and notices. Exact versions are recorded where the lockfile, vendored filename, license file, or runtime banner proves them.

TS-Dash is an exception: only a minified generated bundle survives. Recognizable package signatures and embedded version strings are recorded with `signature-only-version-unknown` or `version-observed-in-opaque-bundle`; this is provenance disclosure, not proof of a complete dependency graph. Its replacement is governed by `TS_DASH_REWRITE_CONTRACT.md`.

The candidate gate rejects missing evidence, licenses, source URLs, review dates, or undeclared runtime artifacts. Generated `dist/_meta/sbom.cdx.json` is CycloneDX JSON; `THIRD_PARTY_NOTICES.txt` and the artifact manifest are deterministic.
