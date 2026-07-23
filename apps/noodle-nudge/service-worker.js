importScripts("../../shared/pwa-worker.js");

self.LFAPwaWorker.register({
  appId: "noodle-nudge",
  cachePrefix: "noodle-nudge-",
  shellVersion: "1.2.32-r3d",
  dataSchemaVersion: 1,
  compatibleDataSchemas: [1],
  manifestUrl: "./pwa-shell.json",
  legacyCacheNames: ["noodle-nudge-cache-v1.2.29", "noodle-nudge-cache-v1.2.30-r0"],
  allowedSharedAssets: [
    "../../shared/pwa-assurance.js",
    "../../suite-shell.css",
    "../../suite-shell.js",
    "../../vendor/bootstrap-5.3.3.min.css",
    "../../vendor/bootstrap-5.3.3.bundle.min.js",
    "../../vendor/chart-4.4.2.umd.js"
  ]
});
