# LocalFirstApps PWA Assurance Contract

Version `1.0.0` is a narrow, dependency-free assurance layer for independently owned static apps. It shares shell staging, integrity checks, update coordination and read-only health reporting—not application storage, migrations, business state, synchronization, telemetry or network services.

## App-owned shell manifest

Each pilot app owns a `pwa-shell.json` declaring its app ID, shell version, data-schema version, compatible prior schemas, navigation fallback and every required asset with a SHA-256 digest. Paths must stay inside that app's scope or an exact shared-asset allowlist.

Installation fetches every candidate asset without using an HTTP cache, rejects missing, opaque, cross-boundary or hash-mismatched responses, and deletes the incomplete candidate cache. A failed candidate never calls `skipWaiting`, displaces the active worker or mutates user data.

## Activation and recovery

An installed update waits. The app displays its shell/schema status and only an explicit accessible user action sends the activation message. First installation never reloads the page. Existing tabs reload once after an explicitly activated controller change so one tab cannot continue on a mixed shell.

Activation retains the newest complete prior cache as last-known-good and removes only older app-prefixed caches. Fetches select one complete shell; they never fill a missing asset from a different version. If the current cache becomes incomplete, navigation recovers the prior complete shell. If no complete shell exists, the worker fails closed with a visible offline response.

## Storage and reset

Health reporting reads the browser's origin estimate, persistence status, app-prefixed cache list and worker recovery status. It does not request persistence or write application data. Missing APIs and browser-controlled quota/eviction are reported as unknown or degraded, never as guaranteed durability.

Application data remains app-owned. Cache reset uses an explicit app prefix. Data reset retains each app's existing validated backup/confirmation requirements and must never delete another app's storage, cache or worker. File mode remains a reduced, clearly labeled launcher/fallback mode; it does not claim module or worker support.
