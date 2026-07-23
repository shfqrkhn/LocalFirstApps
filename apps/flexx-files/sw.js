importScripts("../../shared/pwa-worker.js");

self.LFAPwaWorker.register({
    appId: "flexx-files",
    cachePrefix: "flexx-",
    shellVersion: "3.9.78",
    dataSchemaVersion: "v3",
    compatibleDataSchemas: ["v3"],
    manifestUrl: "./pwa-shell.json",
    legacyCacheNames: ["flexx-v3.9.73"],
    allowedSharedAssets: [
        "../../shared/pwa-assurance.js",
        "../../shared/design-primitives.css",
        "../../shared/design-tokens.css",
        "../../suite-shell.css",
        "../../suite-shell.js"
    ]
});
