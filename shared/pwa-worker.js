(function installPwaWorkerContract(global) {
  "use strict";

  const CONTRACT_VERSION = "1.0.0";

  function canonicalUrl(value, base = global.location.href) {
    const url = new URL(value, base);
    url.hash = "";
    return url.href;
  }

  function hex(bytes) {
    return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function responseHash(response) {
    return hex(await crypto.subtle.digest("SHA-256", await response.clone().arrayBuffer()));
  }

  global.LFAPwaWorker = Object.freeze({
    register(config) {
      const scope = new URL(global.registration.scope);
      const manifestUrl = new URL(config.manifestUrl, global.location.href);
      const currentCacheName = `${config.cachePrefix}shell-${config.shellVersion}`;
      const metadataUrl = canonicalUrl("./__lfa_pwa_metadata__", scope.href);
      const sharedUrls = new Set((config.allowedSharedAssets || []).map((url) => canonicalUrl(url)));
      const legacyNames = new Set(config.legacyCacheNames || []);
      let manifestPromise;

      if (!config.appId || !config.cachePrefix || !config.shellVersion || manifestUrl.origin !== scope.origin || !manifestUrl.pathname.startsWith(scope.pathname)) {
        throw new Error("Invalid app-owned PWA worker configuration.");
      }

      function ownedUrl(value) {
        const url = new URL(value);
        return url.origin === scope.origin && (url.pathname.startsWith(scope.pathname) || sharedUrls.has(canonicalUrl(url.href)));
      }

      async function fetchManifest() {
        const response = await fetch(new Request(manifestUrl.href, { cache: "no-store", credentials: "same-origin" }));
        if (!response.ok || response.type === "opaque") throw new Error("PWA shell manifest is unavailable.");
        const manifest = await response.json();
        if (manifest.contractVersion !== CONTRACT_VERSION || manifest.appId !== config.appId || manifest.shellVersion !== config.shellVersion) {
          throw new Error("PWA shell manifest does not match this worker.");
        }
        if (manifest.dataSchemaVersion !== config.dataSchemaVersion || !Array.isArray(manifest.compatibleDataSchemas) || !manifest.compatibleDataSchemas.length) {
          throw new Error("PWA data-schema compatibility metadata is invalid.");
        }
        if (!Array.isArray(manifest.assets) || !manifest.assets.length) throw new Error("PWA shell manifest contains no assets.");
        const seen = new Set();
        const assets = manifest.assets.map((entry) => {
          const url = canonicalUrl(entry.url, manifestUrl.href);
          if (!ownedUrl(url) || seen.has(url) || !/^[a-f0-9]{64}$/.test(String(entry.sha256 || ""))) throw new Error("PWA shell manifest contains an unsafe or invalid asset.");
          seen.add(url);
          return { url, sha256: entry.sha256 };
        });
        const fallbackUrl = canonicalUrl(manifest.navigationFallback, manifestUrl.href);
        if (!seen.has(fallbackUrl)) throw new Error("PWA navigation fallback is not part of the complete shell.");
        return { ...manifest, assets, fallbackUrl };
      }

      async function manifest() {
        manifestPromise ||= fetchManifest();
        return manifestPromise;
      }

      async function writeMetadata(cache, value) {
        await cache.put(metadataUrl, new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } }));
      }

      async function readMetadata(cacheName) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(metadataUrl);
        if (!response) return null;
        try {
          const value = await response.json();
          return value?.contractVersion === CONTRACT_VERSION && value?.appId === config.appId ? value : null;
        } catch {
          return null;
        }
      }

      async function cacheComplete(cacheName) {
        const metadata = await readMetadata(cacheName);
        if (!metadata || !Array.isArray(metadata.assets) || !metadata.assets.length) return false;
        if (!Array.isArray(metadata.compatibleDataSchemas) || !metadata.compatibleDataSchemas.some((value) => String(value) === String(config.dataSchemaVersion))) return false;
        const fallbackUrl = canonicalUrl(metadata.fallbackUrl);
        const seen = new Set();
        const legacy = metadata.legacy === true && legacyNames.has(cacheName);
        if (!ownedUrl(fallbackUrl)) return false;
        for (const asset of metadata.assets) {
          const url = canonicalUrl(asset.url);
          if (!ownedUrl(url) || seen.has(url) || (!legacy && !/^[a-f0-9]{64}$/.test(String(asset.sha256 || "")))) return false;
          seen.add(url);
        }
        if (!seen.has(fallbackUrl)) return false;
        if (cacheName === currentCacheName && (metadata.shellVersion !== config.shellVersion || metadata.dataSchemaVersion !== config.dataSchemaVersion || legacy)) return false;
        const cache = await caches.open(cacheName);
        for (const asset of metadata.assets) {
          const response = await cache.match(asset.url);
          if (!response) return false;
          if (asset.sha256 && await responseHash(response) !== asset.sha256) return false;
        }
        return true;
      }

      async function adoptLegacyCaches() {
        for (const name of legacyNames) {
          if (!(await caches.keys()).includes(name) || await readMetadata(name)) continue;
          const cache = await caches.open(name);
          const keys = (await cache.keys()).map((request) => canonicalUrl(request.url));
          if (!keys.length || keys.some((url) => !ownedUrl(url))) continue;
          const fallbackUrl = keys.find((url) => new URL(url).pathname.endsWith("/index.html"));
          if (!fallbackUrl) continue;
          await writeMetadata(cache, {
            contractVersion: CONTRACT_VERSION,
            appId: config.appId,
            shellVersion: `legacy:${name}`,
            dataSchemaVersion: config.dataSchemaVersion,
            compatibleDataSchemas: config.compatibleDataSchemas,
            fallbackUrl,
            assets: keys.map((url) => ({ url, sha256: null })),
            stagedAt: "1970-01-01T00:00:00.000Z",
            legacy: true
          });
        }
      }

      async function stageCandidate() {
        await adoptLegacyCaches();
        const definition = await manifest();
        await caches.delete(currentCacheName);
        const cache = await caches.open(currentCacheName);
        try {
          for (const asset of definition.assets) {
            const request = new Request(asset.url, { cache: "reload", credentials: "same-origin" });
            const response = await fetch(request);
            if (!response.ok || response.type === "opaque" || await responseHash(response) !== asset.sha256) throw new Error(`PWA shell integrity failed for ${new URL(asset.url).pathname}.`);
            await cache.put(asset.url, response);
          }
          await writeMetadata(cache, {
            contractVersion: CONTRACT_VERSION,
            appId: config.appId,
            shellVersion: definition.shellVersion,
            dataSchemaVersion: definition.dataSchemaVersion,
            compatibleDataSchemas: definition.compatibleDataSchemas,
            fallbackUrl: definition.fallbackUrl,
            assets: definition.assets,
            stagedAt: new Date().toISOString(),
            legacy: false
          });
        } catch (error) {
          await caches.delete(currentCacheName);
          throw error;
        }
      }

      async function completePreviousCaches() {
        const names = (await caches.keys()).filter((name) => name.startsWith(config.cachePrefix) && name !== currentCacheName);
        const complete = [];
        for (const name of names) {
          if (!await cacheComplete(name)) continue;
          complete.push({ name, metadata: await readMetadata(name) });
        }
        return complete.sort((left, right) => String(right.metadata.stagedAt).localeCompare(String(left.metadata.stagedAt)));
      }

      async function cleanupCaches() {
        const previous = await completePreviousCaches();
        const keep = new Set([currentCacheName, previous[0]?.name].filter(Boolean));
        const names = (await caches.keys()).filter((name) => name.startsWith(config.cachePrefix));
        await Promise.all(names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)));
      }

      async function selectedShell() {
        if (await cacheComplete(currentCacheName)) return { name: currentCacheName, metadata: await readMetadata(currentCacheName), recovered: false };
        const previous = await completePreviousCaches();
        return previous[0] ? { name: previous[0].name, metadata: previous[0].metadata, recovered: true } : null;
      }

      async function status() {
        const selected = await selectedShell();
        const previous = await completePreviousCaches();
        return {
          contractVersion: CONTRACT_VERSION,
          appId: config.appId,
          shellVersion: config.shellVersion,
          dataSchemaVersion: config.dataSchemaVersion,
          compatibleDataSchemas: config.compatibleDataSchemas,
          currentCacheName,
          currentComplete: await cacheComplete(currentCacheName),
          selectedCacheName: selected?.name || null,
          recoveredFromPrevious: Boolean(selected?.recovered),
          previousCacheName: previous[0]?.name || null
        };
      }

      function unavailable(message, type = "text/plain") {
        return new Response(message, { status: 503, headers: { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" } });
      }

      async function handleNavigation() {
        const selected = await selectedShell();
        if (!selected) return unavailable("Offline shell unavailable. Reconnect and reload.", "text/html");
        const response = await (await caches.open(selected.name)).match(selected.metadata.fallbackUrl);
        return response || unavailable("Offline shell is incomplete. Reconnect and reload.", "text/html");
      }

      async function handleOwnedAsset(request) {
        const selected = await selectedShell();
        if (!selected) return fetch(request).catch(() => unavailable("Offline asset unavailable."));
        const asset = selected.metadata.assets.find((entry) => canonicalUrl(entry.url) === canonicalUrl(request.url));
        if (!asset) return fetch(request);
        const response = await (await caches.open(selected.name)).match(asset.url);
        if (response) return response;
        return unavailable("Selected offline shell is incomplete; reload to recover the prior complete shell.");
      }

      global.addEventListener("install", (event) => event.waitUntil(stageCandidate()));
      global.addEventListener("activate", (event) => event.waitUntil(cleanupCaches().then(() => global.clients.claim())));
      global.addEventListener("fetch", (event) => {
        if (event.request.method !== "GET") return;
        const url = new URL(event.request.url);
        if (url.origin !== scope.origin) return;
        if (event.request.mode === "navigate" && url.pathname.startsWith(scope.pathname)) {
          event.respondWith(handleNavigation());
          return;
        }
        if (ownedUrl(url.href)) event.respondWith(handleOwnedAsset(event.request));
      });
      global.addEventListener("message", (event) => {
        const sourceUrl = event.source?.url ? new URL(event.source.url) : null;
        const sourceInScope = sourceUrl?.origin === scope.origin && sourceUrl.pathname.startsWith(scope.pathname);
        if (event.data?.type === "LFA_ACTIVATE_UPDATE" && sourceInScope) global.skipWaiting();
        if (event.data?.type === "LFA_PWA_STATUS" && sourceInScope && event.ports?.[0]) event.waitUntil(status().then((value) => event.ports[0].postMessage(value)));
      });
    }
  });
})(self);
