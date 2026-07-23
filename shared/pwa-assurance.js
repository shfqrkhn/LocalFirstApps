export const PWA_ASSURANCE_VERSION = "1.0.0";

export async function workerStatus(worker, { timeoutMs = 2500 } = {}) {
  if (!worker) return null;
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => reject(new Error("PWA worker status timed out.")), timeoutMs);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data || null);
    };
    worker.postMessage({ type: "LFA_PWA_STATUS" }, [channel.port2]);
  });
}

export function schemaCompatible(status, currentDataSchema) {
  return Boolean(status?.compatibleDataSchemas?.some((value) => String(value) === String(currentDataSchema)));
}

export async function registerPwaAssurance({ appId, scriptUrl, scope = "./", currentDataSchema, onUpdate, onControllerChange, onError } = {}) {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return null;
  const hadController = Boolean(navigator.serviceWorker.controller);
  const channel = "BroadcastChannel" in window ? new BroadcastChannel(`lfa-pwa-${appId}`) : null;
  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, { scope });
    const announceWaiting = async ({ broadcast = true } = {}) => {
      if (!registration.waiting || !navigator.serviceWorker.controller) return;
      try {
        const status = await workerStatus(registration.waiting);
        const compatible = schemaCompatible(status, currentDataSchema);
        Promise.resolve(onUpdate?.({ registration, status, compatible })).catch((error) => onError?.(error));
        if (broadcast) channel?.postMessage({ type: "update-ready" });
      } catch (error) {
        onError?.(error);
      }
    };
    await announceWaiting();
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed") announceWaiting();
      });
    });
    channel?.addEventListener("message", (event) => {
      if (event.data?.type === "update-ready") announceWaiting({ broadcast: false });
    });
    let controllerKnown = hadController || Boolean(navigator.serviceWorker.controller);
    let handledControllerChange = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!controllerKnown) {
        controllerKnown = true;
        return;
      }
      if (handledControllerChange) return;
      handledControllerChange = true;
      onControllerChange?.();
    });
    return { registration, channel };
  } catch (error) {
    onError?.(error);
    return null;
  }
}

export async function activatePwaUpdate(registration, currentDataSchema) {
  const waiting = registration?.waiting;
  if (!waiting) throw new Error("The staged update is no longer available.");
  const status = await workerStatus(waiting);
  if (!schemaCompatible(status, currentDataSchema)) throw new Error("The staged shell is not compatible with this app's current data schema.");
  waiting.postMessage({ type: "LFA_ACTIVATE_UPDATE" });
  return status;
}

export function classifyStorageEstimate(estimate) {
  const available = Number.isFinite(estimate?.usage) && Number.isFinite(estimate?.quota) && estimate.quota > 0;
  if (!available) return { available: false, usage: null, quota: null, usageRatio: null, state: "unknown" };
  const usageRatio = estimate.usage / estimate.quota;
  return { available: true, usage: estimate.usage, quota: estimate.quota, usageRatio, state: usageRatio >= 0.9 ? "high" : "healthy" };
}

export async function getPwaHealth({ cachePrefix, registration } = {}) {
  const health = {
    estimateAvailable: false,
    usage: null,
    quota: null,
    usageRatio: null,
    persisted: null,
    cacheNames: [],
    worker: null,
    state: "unknown"
  };
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const classified = classifyStorageEstimate(estimate);
      health.estimateAvailable = classified.available;
      health.usage = classified.usage;
      health.quota = classified.quota;
      health.usageRatio = classified.usageRatio;
    }
  } catch {}
  try { if (navigator.storage?.persisted) health.persisted = await navigator.storage.persisted(); } catch {}
  try { if ("caches" in window) health.cacheNames = (await caches.keys()).filter((name) => name.startsWith(cachePrefix)); } catch {}
  try { health.worker = await workerStatus(registration?.active || navigator.serviceWorker?.controller); } catch {}
  health.state = !health.estimateAvailable ? "unknown" : health.usageRatio >= 0.9 ? "high" : health.worker?.recoveredFromPrevious ? "recovered" : "healthy";
  return health;
}

export async function clearOwnedPwaCaches(cachePrefix) {
  if (!cachePrefix || cachePrefix.length < 4 || !("caches" in window)) return 0;
  const names = (await caches.keys()).filter((name) => name.startsWith(cachePrefix));
  await Promise.all(names.map((name) => caches.delete(name)));
  return names.length;
}

export function formatBytes(value) {
  if (!Number.isFinite(value)) return "unknown";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
