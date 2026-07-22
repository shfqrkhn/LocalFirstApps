import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
let server;
let baseUrl;
let workerRevision;

const mime = new Map([
  [".css", "text/css"], [".html", "text/html"], [".js", "text/javascript"], [".json", "application/json"],
  [".png", "image/png"], [".svg", "image/svg+xml"], [".webmanifest", "application/manifest+json"]
]);

test.use({ hasTouch: true });

test.beforeAll(async () => {
  workerRevision = 1;
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === "/__test__/healthos-worker-update") {
        workerRevision += 1;
        return response.writeHead(204, { "cache-control": "no-store" }).end();
      }
      const mountedPath = url.pathname.startsWith("/subpath/LocalFirstApps/") ? url.pathname.slice("/subpath/LocalFirstApps".length) : url.pathname;
      const rawPath = mountedPath.endsWith("/") ? `${mountedPath}index.html` : mountedPath;
      const filePath = normalize(join(root, decodeURIComponent(rawPath)));
      if (!filePath.startsWith(normalize(root))) return response.writeHead(403).end("Forbidden");
      const headers = { "content-type": mime.get(extname(filePath)) || "application/octet-stream" };
      let body = await readFile(filePath);
      if (url.pathname === "/apps/healthos/sw.js") {
        headers["cache-control"] = "no-store";
        const shell = workerRevision === 1 ? "0.1.0-m3a" : `0.1.0-m3a-test-${workerRevision}`;
        body = Buffer.from(body.toString("utf8").replace('shellVersion: "0.1.0-m3a"', `shellVersion: "${shell}"`) + `\n// test-worker-revision:${workerRevision}\n`);
      }
      if (url.pathname === "/apps/healthos/pwa-shell.json" && workerRevision > 1) {
        body = Buffer.from(body.toString("utf8").replace('"shellVersion": "0.1.0-m3a"', `"shellVersion": "0.1.0-m3a-test-${workerRevision}"`));
      }
      response.writeHead(200, headers);
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function gotoHealth(page, path = "apps/healthos/") {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
}

async function saveDaily(page, { lifeState = "READY", note = "Browser fixture" } = {}) {
  await page.getByRole("button", { name: "Daily state" }).click();
  await page.getByLabel("Life state").selectOption(lifeState);
  await page.getByLabel("Mood (1–5)").selectOption("4");
  await page.getByLabel("Energy (1–5)").selectOption("3");
  await page.getByLabel("Sleep quality (1–5)").selectOption("5");
  await page.getByLabel("Stress (1–5)").selectOption("2");
  await page.getByLabel("Soreness (1–5)").selectOption("1");
  await page.getByLabel("Pain flags").fill("left knee observation");
  await page.getByLabel("Intended focus").fill("Bounded browser proof");
  await page.getByLabel("Recovery need").fill("Normal break");
  await page.getByLabel("Notes").fill(note);
  await page.getByRole("button", { name: "Save daily state" }).press("Enter");
  await expect(page.locator(".notice-success")).toContainText("without calculating a combined score");
}

test("HealthOS preserves module identity and stores distinct daily observations", async ({ page }) => {
  await gotoHealth(page);
  await expect(page.getByRole("link", { name: /Noodle Nudge/ })).toHaveAttribute("href", "../noodle-nudge/");
  await expect(page.getByRole("link", { name: /Flexx Files/ })).toHaveAttribute("href", "../flexx-files/");
  await saveDaily(page, { lifeState: "CRISIS", note: "Fields remain distinct" });
  await expect(page.locator("#daily-guidance")).toContainText("Remove productivity pressure");
  const record = await page.evaluate(async () => (await (await import("./storage.js")).getAllHealthRecords())[0]);
  expect(record.type).toBe("healthos/daily_state");
  expect(record.payload).toMatchObject({ mood: 4, energy: 3, sleep_quality: 5, stress: 2, soreness: 1, life_state: "CRISIS" });
  expect(record.payload.pain_flags).toEqual(["left knee observation"]);
  expect(record.payload).not.toHaveProperty("score");
  expect(record.payload).not.toHaveProperty("readiness_score");
});

test("HealthOS reconciles reload, manual correction, review, and duplicate completion", async ({ page }) => {
  await gotoHealth(page);
  await expect(page.getByLabel("Mode").locator("option")).toHaveCount(6);
  await page.getByLabel("Mode").selectOption("minimum-5");
  await page.getByLabel("Intention").fill("Reconcile persisted timestamps");
  await page.getByLabel("Energy before").selectOption("3");
  await page.getByRole("button", { name: "Start focus" }).press("Enter");
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByLabel("Elapsed minutes").fill("5");
  await page.getByRole("button", { name: "Apply correction" }).click();
  await expect(page.getByRole("timer")).toHaveText("00:00");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#main-content .notice-success")).toContainText("Target reached");
  await page.getByRole("button", { name: "Finish and review" }).click();
  await page.getByLabel("Outcome").fill("Timestamp reconciliation passed");
  await page.getByLabel("Stopped reason").fill("Target reached");
  await page.getByLabel("Energy after").selectOption("4");
  await page.getByRole("button", { name: "Save focus session" }).click();
  await expect(page.locator(".notice-success")).toContainText("saved once");
  const duplicate = await page.evaluate(async () => {
    const storage = await import("./storage.js");
    const records = await storage.getAllHealthRecords();
    const session = records.find((record) => record.type === "healthos/focus_session");
    const result = await storage.completeActiveTimer(session, { expectedRevision: 999 });
    return { duplicate: result.duplicate, count: (await storage.getAllHealthRecords()).filter((record) => record.type === "healthos/focus_session").length };
  });
  expect(duplicate).toEqual({ duplicate: true, count: 1 });
});

test("HealthOS duplicate tabs reject stale timer writes without silent overwrite", async ({ page, context }) => {
  await gotoHealth(page);
  await page.getByLabel("Intention").fill("Concurrency proof");
  await page.getByRole("button", { name: "Start focus" }).click();
  const duplicate = await context.newPage();
  await gotoHealth(duplicate);
  await expect(duplicate.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(duplicate.locator("#main-content .notice-warning").first()).toContainText("Another HealthOS tab changed");
  await duplicate.getByRole("button", { name: "Pause" }).click();
  await expect(duplicate.locator(".notice-error")).toContainText("changed in another tab");
  await duplicate.getByRole("button", { name: "Reload current state" }).click();
  await expect(duplicate.getByRole("button", { name: "Resume" })).toBeVisible();
});

test("HealthOS portable transfer previews, applies once, fails atomically, and rolls back", async ({ page }) => {
  await gotoHealth(page);
  await saveDaily(page, { note: "Portable source" });
  await page.getByRole("button", { name: "Transfer & recovery" }).click();
  await page.getByRole("button", { name: "Prepare JSON export" }).click();
  await expect(page.getByText("Exact export preview")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Confirm download" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  await page.locator("#portable-import").setInputFiles(path);
  await expect(page.getByText("Validated import preview")).toBeVisible();
  await page.getByRole("button", { name: "Confirm atomic import" }).click();
  await expect(page.locator(".notice-success")).toContainText("Imported 1 record");
  await page.locator("#portable-import").setInputFiles(path);
  await page.getByRole("button", { name: "Confirm atomic import" }).click();
  await expect(page.locator(".notice-error")).toContainText("already applied");
  const failures = await page.evaluate(async (text) => {
    const health = await import("../../shared/healthos.js");
    const storage = await import("./storage.js");
    const portable = await health.parseHealthPackageText(text);
    const before = (await storage.getAllHealthRecords()).length;
    const names = [];
    for (const failureMode of ["partial", "quota"]) {
      try { await storage.applyHealthPackageAtomic(portable, { failureMode }); }
      catch (error) { names.push(error.name); }
    }
    return { before, after: (await storage.getAllHealthRecords()).length, names };
  }, await readFile(path, "utf8"));
  expect(failures.after).toBe(failures.before);
  expect(failures.names).toHaveLength(2);
  await page.getByRole("button", { name: "Roll back imported records" }).click();
  await expect(page.locator(".notice-success")).toContainText("replay protection remains");
  const counts = await page.evaluate(async () => {
    const storage = await import("./storage.js");
    return { records: (await storage.getAllHealthRecords()).length, receipts: await storage.getAllHealthReceipts() };
  });
  expect(counts.records).toBe(1);
  expect(counts.receipts[0].status).toBe("rolled-back");
});

test("HealthOS complete backup gates scoped reset and restores canonical records", async ({ page }) => {
  await gotoHealth(page);
  await saveDaily(page, { note: "Reset survival" });
  await page.evaluate(async () => {
    localStorage.setItem("other_app_data", "keep");
    await (await caches.open("other-app-shell")).put("/other-app-proof", new Response("keep"));
  });
  await page.getByRole("button", { name: "Transfer & recovery" }).click();
  await page.getByRole("button", { name: "Prepare factory reset" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  const backupPromise = page.waitForEvent("download");
  const reloadPromise = page.waitForEvent("load");
  await page.getByRole("button", { name: "Back up and reset" }).click();
  const backup = await backupPromise;
  const backupPath = await backup.path();
  expect(backup.suggestedFilename()).toMatch(/^healthos-pre-reset-backup-.*\.json$/);
  await reloadPromise;
  const reset = await page.evaluate(async () => ({
    records: (await (await import("./storage.js")).getAllHealthRecords()).length,
    other: localStorage.getItem("other_app_data"),
    otherCache: (await caches.keys()).includes("other-app-shell")
  }));
  expect(reset).toEqual({ records: 0, other: "keep", otherCache: true });
  await page.getByRole("button", { name: "Transfer & recovery" }).click();
  await page.locator("#backup-import").setInputFiles(backupPath);
  await expect(page.getByText("healthos-complete-backup", { exact: false })).toBeVisible();
  const interruptedRestore = await page.evaluate(async (backupText) => {
    const storage = await import("./storage.js");
    const value = JSON.parse(backupText);
    const before = await storage.getAllHealthRecords();
    let rejected = false;
    try { await storage.restoreHealthBackupAtomic(value, { failureMode: "partial" }); }
    catch { rejected = true; }
    const after = await storage.getAllHealthRecords();
    return { rejected, before: before.map((record) => record.id), after: after.map((record) => record.id) };
  }, await readFile(backupPath, "utf8"));
  expect(interruptedRestore.rejected).toBe(true);
  expect(interruptedRestore.after).toEqual(interruptedRestore.before);
  const preferenceFailure = await page.evaluate(async (backupText) => {
    const storage = await import("./storage.js");
    const { sha256 } = await import("./omnicore-adapter.js");
    const value = JSON.parse(backupText);
    value.preferences = { audio: true, vibration: false, notifications: false, wakeLock: false };
    delete value.sha256;
    value.sha256 = await sha256(value);
    let error;
    try { await storage.restoreHealthBackupAtomic(value, { failureMode: "preferences" }); }
    catch (caught) { error = { code: caught.code, message: caught.message }; }
    return {
      error,
      records: (await storage.getAllHealthRecords()).length,
      pending: await storage.getPendingPreferenceRestore(),
      preferences: storage.loadHealthPreferences()
    };
  }, await readFile(backupPath, "utf8"));
  expect(preferenceFailure.error).toEqual({
    code: "HEALTHOS_PREFERENCES_PENDING",
    message: "Health records were restored, but cue preferences could not be saved. Retry preference recovery to finish."
  });
  expect(preferenceFailure.records).toBe(1);
  expect(preferenceFailure.pending.preferences.audio).toBe(true);
  expect(preferenceFailure.preferences.audio).toBe(false);
  await page.reload();
  await expect(page.getByText("cue preferences are still pending", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Retry preference recovery" }).first().click();
  await expect(page.locator(".notice-success")).toContainText("preference recovery completed");
  expect(await page.evaluate(async () => ({
    pending: await (await import("./storage.js")).getPendingPreferenceRestore(),
    preferences: (await import("./storage.js")).loadHealthPreferences()
  }))).toEqual({ pending: null, preferences: { audio: true, vibration: false, notifications: false, wakeLock: false } });
  await page.getByRole("button", { name: "Transfer & recovery" }).click();
  await page.locator("#backup-import").setInputFiles(backupPath);
  await page.getByRole("button", { name: "Confirm complete restore" }).click();
  await expect(page.locator(".notice-success")).toContainText("backup restored");
  expect(await page.evaluate(async () => (await (await import("./storage.js")).getAllHealthRecords()).length)).toBe(1);
});

test("HealthOS TS-Dash export is explicit and capability failures stay visible", async ({ page, context }) => {
  await context.addInitScript(() => {
    for (const [target, key] of [[window, "AudioContext"], [window, "webkitAudioContext"], [window, "Notification"], [navigator, "vibrate"], [navigator, "wakeLock"]]) {
      try { Object.defineProperty(target, key, { configurable: true, value: undefined }); } catch {}
    }
  });
  await gotoHealth(page);
  expect(await page.getByText("Unavailable here; the visible timer remains the fallback.").count()).toBeGreaterThanOrEqual(3);
  await saveDaily(page, { note: "CSV source" });
  await page.getByRole("button", { name: "Transfer & recovery" }).click();
  await page.getByRole("button", { name: "Prepare TS-Dash CSV" }).click();
  await expect(page.locator(".preview")).toContainText("correlation does not establish causation");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Confirm CSV download" }).click();
  const csv = await readFile(await (await downloadPromise).path(), "utf8");
  expect(csv).toContain("timestamp,value,metric,unit");
  expect(csv).toContain("source_app,record_id,truth_class,derivation,correlation_note");
});

test("HealthOS PWA installs stably, activates explicitly, recovers prior shell, and preserves data", async ({ page, context }) => {
  let navigations = 0;
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations += 1; });
  await gotoHealth(page);
  await saveDaily(page, { note: "PWA survival" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  expect(navigations).toBe(1);
  await page.evaluate(() => fetch("/__test__/healthos-worker-update", { method: "POST" }));
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration("./")).update());
  await expect(page.getByText("A verified HealthOS update is ready.")).toBeVisible();
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration("./")).waiting))).toBe(true);
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Reload to update" }).click()]);
  const damage = await page.evaluate(async () => {
    const { workerStatus } = await import("../../shared/pwa-assurance.js");
    const before = await workerStatus(navigator.serviceWorker.controller);
    const deleted = await (await caches.open(before.currentCacheName)).delete(new URL("./index.html", location.href).href);
    return { deleted, previous: before.previousCacheName };
  });
  expect(damage.deleted).toBe(true);
  expect(damage.previous).toBeTruthy();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Choose a bounded focus mode" })).toBeVisible();
  const recovered = await page.evaluate(async () => {
    const { workerStatus } = await import("../../shared/pwa-assurance.js");
    return { status: await workerStatus(navigator.serviceWorker.controller), records: (await (await import("./storage.js")).getAllHealthRecords()).length };
  });
  expect(recovered.status.recoveredFromPrevious).toBe(true);
  expect(recovered.records).toBe(1);
  await context.setOffline(false);
});

test("HealthOS works under a repository subpath and loads pre-existing v1 data", async ({ page, context }) => {
  await page.goto(baseUrl);
  await page.evaluate(async () => {
    await new Promise((resolve) => { const request = indexedDB.deleteDatabase("healthos-focus"); request.onsuccess = request.onerror = request.onblocked = resolve; });
    const { createDailyStateRecord } = await import("/shared/healthos.js");
    const record = await createDailyStateRecord({ date: "2024-02-29", life_state: "READY", mood: 4, energy: 3, sleep_quality: 5, stress: 2, soreness: 1, pain_flags: [], intended_focus: "Existing v1", recovery_need: "", notes: "Preserve me" }, { id: "healthos-existing-v1", createdAt: "2024-02-29T12:00:00.000Z", updatedAt: "2024-02-29T12:00:00.000Z", recordTimezone: "America/Toronto" });
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("healthos-focus", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("records", { keyPath: "id" }).add(record);
        db.createObjectStore("receipts", { keyPath: "id" }).createIndex("idempotencyKey", "idempotencyKey", { unique: true });
        db.createObjectStore("runtime", { keyPath: "id" });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
  });
  await gotoHealth(page);
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByText("2024-02-29", { exact: false })).toBeVisible();
  await page.goto(`${baseUrl}subpath/LocalFirstApps/apps/healthos/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Choose a bounded focus mode" })).toBeVisible();
  await context.setOffline(false);
});
