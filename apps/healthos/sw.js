importScripts("../../shared/pwa-worker.js");

self.LFAPwaWorker.register({
  appId: "healthos",
  cachePrefix: "healthos-",
  shellVersion: "0.1.1-r3e",
  dataSchemaVersion: 1,
  compatibleDataSchemas: [1],
  manifestUrl: "./pwa-shell.json",
  legacyCacheNames: [],
  allowedSharedAssets: [
    "../../shared/interchange.js",
    "../../shared/healthos.js",
    "../../shared/focus-timer.js",
    "../../shared/omnicore/errors.js",
    "../../shared/omnicore/indexeddb.js",
    "../../shared/omnicore/integrity.js",
    "../../shared/omnicore/receipts.js",
    "../../shared/omnicore/time.js",
    "../../shared/design-primitives.css",
    "../../shared/design-tokens.css",
    "../../shared/pwa-assurance.js",
    "../../suite-shell.css",
    "../../suite-shell.js"
  ]
});
