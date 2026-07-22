importScripts("../../shared/pwa-worker.js");

self.LFAPwaWorker.register({
  appId: "healthos",
  cachePrefix: "healthos-",
  shellVersion: "0.1.0-m3a",
  dataSchemaVersion: 1,
  compatibleDataSchemas: [1],
  manifestUrl: "./pwa-shell.json",
  legacyCacheNames: [],
  allowedSharedAssets: [
    "../../shared/interchange.js",
    "../../shared/healthos.js",
    "../../shared/focus-timer.js",
    "../../shared/pwa-assurance.js",
    "../../suite-shell.css",
    "../../suite-shell.js"
  ]
});
