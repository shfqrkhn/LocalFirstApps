importScripts("../../shared/pwa-worker.js");

self.LFAPwaWorker.register({
  appId: "commonground",
  cachePrefix: "commonground-",
  shellVersion: "0.3.0-r4a",
  dataSchemaVersion: 4,
  compatibleDataSchemas: [3, 4],
  manifestUrl: "./pwa-shell.json",
  legacyCacheNames: ["commonground-shell-v0.2.1"],
  allowedSharedAssets: [
    "../../shared/interchange.js",
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
