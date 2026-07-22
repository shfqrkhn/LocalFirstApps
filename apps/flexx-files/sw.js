importScripts("../../shared/pwa-worker.js");

self.LFAPwaWorker.register({
    appId: "flexx-files",
    cachePrefix: "flexx-",
    shellVersion: "3.9.76",
    dataSchemaVersion: "v3",
    compatibleDataSchemas: ["v3"],
    manifestUrl: "./pwa-shell.json",
    legacyCacheNames: ["flexx-v3.9.73"],
    allowedSharedAssets: [
        "../../shared/pwa-assurance.js",
        "../../suite-shell.css",
        "../../suite-shell.js"
    ]
});
