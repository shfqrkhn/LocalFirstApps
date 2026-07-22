import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createStoredZip } from "../apps/commonground/modules/exports.js";
import { createInterchangePackage } from "../shared/interchange.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const flexxShellVersion = JSON.parse(await readFile(join(root, "config", "deliverables.json"), "utf8")).deliverables.find(({ id }) => id === "flexx-files").shellVersion;
let server;
let baseUrl;
let commonGroundWorkerRevision;
let flexxWorkerRevision;
let noodleWorkerRevision;
const pwaFaults = new Map();

const mime = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json"]
]);

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

test.use({ hasTouch: true });

test.beforeAll(async () => {
  commonGroundWorkerRevision = 1;
  flexxWorkerRevision = 1;
  noodleWorkerRevision = 1;
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (url.pathname === "/__test__/commonground-worker-update") {
        commonGroundWorkerRevision += 1;
        return response.writeHead(204, { "cache-control": "no-store" }).end();
      }
      if (url.pathname === "/__test__/flexx-worker-update") {
        flexxWorkerRevision += 1;
        return response.writeHead(204, { "cache-control": "no-store" }).end();
      }
      if (url.pathname === "/__test__/noodle-worker-update") {
        noodleWorkerRevision += 1;
        return response.writeHead(204, { "cache-control": "no-store" }).end();
      }
      if (url.pathname === "/__test__/pwa-fault") {
        const target = url.searchParams.get("target");
        const mode = url.searchParams.get("mode");
        if (target && mode) pwaFaults.set(target, mode);
        if (target && mode === "clear") pwaFaults.delete(target);
        return response.writeHead(204, { "cache-control": "no-store" }).end();
      }
      const mountedPath = url.pathname.startsWith("/subpath/LocalFirstApps/") ? url.pathname.slice("/subpath/LocalFirstApps".length) : url.pathname;
      const rawPath = mountedPath.endsWith("/") ? `${mountedPath}index.html` : mountedPath;
      const fault = pwaFaults.get(mountedPath);
      if (fault === "missing") return response.writeHead(404, { "cache-control": "no-store" }).end("Missing test asset");
      const filePath = normalize(join(root, decodeURIComponent(rawPath)));
      if (!filePath.startsWith(normalize(root))) return response.writeHead(403).end("Forbidden");
      const headers = { "content-type": mime.get(extname(filePath)) || "application/octet-stream" };
      let body = await readFile(filePath);
      if (url.pathname === "/apps/commonground/sw.js") {
        headers["cache-control"] = "no-store";
        const shell = commonGroundWorkerRevision === 1 ? "0.2.2-m2" : `0.2.2-m2-test-${commonGroundWorkerRevision}`;
        body = Buffer.from(body.toString("utf8").replace('shellVersion: "0.2.2-m2"', `shellVersion: "${shell}"`) + `\n// test-worker-revision:${commonGroundWorkerRevision}\n`);
      }
      if (url.pathname === "/apps/commonground/pwa-shell.json" && commonGroundWorkerRevision > 1) {
        body = Buffer.from(body.toString("utf8").replace('"shellVersion": "0.2.2-m2"', `"shellVersion": "0.2.2-m2-test-${commonGroundWorkerRevision}"`));
      }
      if (url.pathname === "/apps/flexx-files/sw.js") {
        headers["cache-control"] = "no-store";
        const shell = flexxWorkerRevision === 1 ? flexxShellVersion : `${flexxShellVersion}-test-${flexxWorkerRevision}`;
        body = Buffer.from(body.toString("utf8").replace(`shellVersion: "${flexxShellVersion}"`, `shellVersion: "${shell}"`) + `\n// test-worker-revision:${flexxWorkerRevision}\n`);
      }
      if (url.pathname === "/apps/flexx-files/pwa-shell.json" && flexxWorkerRevision > 1) {
        body = Buffer.from(body.toString("utf8").replace(`"shellVersion": "${flexxShellVersion}"`, `"shellVersion": "${flexxShellVersion}-test-${flexxWorkerRevision}"`));
      }
      if (url.pathname === "/apps/noodle-nudge/service-worker.js") {
        headers["cache-control"] = "no-store";
        const shell = noodleWorkerRevision === 1 ? "1.2.31-r1" : `1.2.31-r1-test-${noodleWorkerRevision}`;
        body = Buffer.from(body.toString("utf8").replace('shellVersion: "1.2.31-r1"', `shellVersion: "${shell}"`) + `\n// test-worker-revision:${noodleWorkerRevision}\n`);
      }
      if (url.pathname === "/apps/noodle-nudge/pwa-shell.json" && noodleWorkerRevision > 1) {
        body = Buffer.from(body.toString("utf8").replace('"shellVersion": "1.2.31-r1"', `"shellVersion": "1.2.31-r1-test-${noodleWorkerRevision}"`));
      }
      if (fault === "corrupt") body = Buffer.concat([body, Buffer.from("\n/* deterministic-corruption */\n")]);
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

async function gotoApp(page, slug) {
  await page.goto(`${baseUrl}apps/${slug}/`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible();
}

test("TS-Dash validates imports, exports normalized data, and clears with confirmation", async ({ page }) => {
  await gotoApp(page, "ts-dash");
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"unexpected":true}')
  });
  await expect(page.getByText("Invalid package format.")).toBeVisible();
  await page.getByRole("button", { name: "+ Import CSV" }).tap();

  const csvInput = page.locator("#csv-upload");
  await csvInput.setInputFiles({
    name: "weight.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("timestamp,value,metric,unit\n2026-01-01T09:00:00Z,180,weight,lb\n2026-01-02T09:00:00Z,179.5,weight,lb\n")
  });
  const selects = page.locator("select");
  await selects.nth(0).selectOption("timestamp");
  await selects.nth(1).selectOption("value");
  await selects.nth(2).selectOption("metric");
  await selects.nth(3).selectOption("unit");
  await page.getByRole("button", { name: "Confirm & Import" }).click();

  await expect(page.getByText("weight.csv", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Normalized CSV" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("weight_normalized.csv");

  await page.getByRole("button", { name: "Clear All Data" }).click();
  await expect(page.getByRole("dialog")).toContainText("Delete all local datasets");
  await page.getByRole("button", { name: "Continue" }).press("Enter");
  await expect(page.getByText("No datasets found.")).toBeVisible();
});

test("PMQuiz rejects malformed custom data and supports keyboard quiz/reset flow", async ({ page }) => {
  await gotoApp(page, "pmquiz");
  await page.locator("#jsonFile").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"unexpected":true}')
  });
  await page.locator("#startFromFileBtn").click();
  await expect(page.locator("#jsonLoadError")).not.toBeEmpty();

  await page.locator("#questionBankSelect").selectOption({ index: 1 });
  await page.locator("#startFromSelectBtn").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#quizInterface")).toBeVisible();
  await page.locator(".choice-btn").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#explanationContainer")).toBeVisible();
  await page.locator("#resetQuizDuringQuizBtn").tap();
  await page.locator("#resetQuizDuringQuizBtn").click();
  await expect(page.locator("#uploadSection")).toBeVisible();
});

test("Noodle Nudge exports, rejects corrupt backup data, and performs guarded reset", async ({ page }) => {
  await gotoApp(page, "noodle-nudge");
  await page.getByLabel("Settings").tap();
  await expect(page.getByText("Data Management")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export My Data/i }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^noodle-nudge-backup-.*\.json$/);

  await page.locator("#import-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"assessments":{}}')
  });
  await expect(page.locator("#toast-container")).toContainText("Import failed");

  const reset = page.getByRole("button", { name: /Reset All Data/i });
  await reset.click();
  await expect(page.locator("#toast-container")).toContainText("again within 5 seconds");
  await reset.click();
  await expect(page.locator("#toast-container")).toContainText("Data reset complete");
});

test("PMQuiz activation preserves sibling app caches", async ({ page }) => {
  await page.goto(baseUrl);
  await page.evaluate(async () => (await caches.open("r0-foreign-sentinel")).put("/r0-foreign-proof", new Response("keep")));
  await gotoApp(page, "pmquiz");
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration("./"))?.active?.state === "activated");
  expect(await page.evaluate(async () => (await caches.keys()).includes("r0-foreign-sentinel"))).toBe(true);
});

test("Noodle scoring preserves all canonical v1 outputs", async ({ page }) => {
  const expected = JSON.parse(await readFile(join(root, "tests/fixtures/noodle-scoring-v1.json"), "utf8"));
  await gotoApp(page, "noodle-nudge");
  await page.waitForFunction(() => Object.keys(NoodleNudge.State.get().assessments || {}).length === 10);
  const actual = await page.evaluate(() => {
    const output = {};
    for (const assessment of Object.values(NoodleNudge.State.get().assessments)) {
      const answers = {};
      assessment.questions?.forEach((question, index) => { answers[question.id] = assessment.responseScale[index % assessment.responseScale.length].value; });
      assessment.sections?.forEach((section) => {
        answers[section.id] = {};
        section.categories.forEach((category, index) => {
          const limit = category.limit == null ? section.items.length : category.limit;
          answers[section.id][category.id] = section.items.filter((_, itemIndex) => itemIndex % section.categories.length === index).slice(0, limit).map((item) => item.id);
        });
      });
      output[assessment.id] = NoodleNudge.Scoring.calculateResults(assessment, answers).scores.map(({ id, value }) => ({ id, value }));
    }
    return output;
  });
  expect(actual).toEqual(expected);
});

test("Noodle PWA is fail-closed, explicit, recoverable, and foreign-cache safe", async ({ page, context }) => {
  await page.goto(baseUrl);
  await page.evaluate(async () => (await caches.open("r0-foreign-sentinel")).put("/r0-foreign-proof", new Response("keep")));
  await gotoApp(page, "noodle-nudge");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.waitForFunction(() => Object.keys(NoodleNudge.State.get().assessments || {}).length === 10);
  await page.evaluate(() => NoodleNudge.State.set({ appConfig: { ...NoodleNudge.State.get().appConfig, r0Proof: "kept" } }));
  expect(await page.evaluate(async () => (await caches.keys()).includes("r0-foreign-sentinel"))).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Discover Your Core Profile" })).toBeVisible();
  await context.setOffline(false);

  await page.evaluate(() => fetch("/__test__/noodle-worker-update", { method: "POST" }));
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration("./")).update());
  await expect(page.getByText("A verified Noodle Nudge update is ready.")).toBeVisible();
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration("./")).waiting))).toBe(true);
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Reload to update" }).click()]);
  await expect(page.getByRole("heading", { name: "Discover Your Core Profile" })).toBeVisible();

  const status = async () => page.evaluate(async () => {
    const { workerStatus } = await import("../../shared/pwa-assurance.js");
    return workerStatus(navigator.serviceWorker.controller);
  });
  const activeShell = (await status()).shellVersion;
  for (const mode of ["missing", "corrupt"]) {
    await page.evaluate(([target, fault]) => fetch(`/__test__/pwa-fault?target=${encodeURIComponent(target)}&mode=${fault}`, { method: "POST" }), ["/apps/noodle-nudge/scoring.js", mode]);
    await page.evaluate(() => fetch("/__test__/noodle-worker-update", { method: "POST" }));
    const settled = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration("./");
      return new Promise(async (resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Candidate did not settle.")), 10000);
        const observe = (worker) => {
          if (!worker) return;
          const finish = () => {
            if (["redundant", "installed"].includes(worker.state)) { clearTimeout(timer); resolve(worker.state); }
          };
          worker.addEventListener("statechange", finish);
          finish();
        };
        registration.addEventListener("updatefound", () => observe(registration.installing), { once: true });
        try { await registration.update(); observe(registration.installing); } catch (error) { clearTimeout(timer); reject(error); }
      });
    });
    expect(settled).toBe("redundant");
    expect((await status()).shellVersion).toBe(activeShell);
    expect(await page.evaluate(async () => (await caches.keys()).includes("r0-foreign-sentinel"))).toBe(true);
    await page.evaluate((target) => fetch(`/__test__/pwa-fault?target=${encodeURIComponent(target)}&mode=clear`, { method: "POST" }), "/apps/noodle-nudge/scoring.js");
  }

  const damaged = await page.evaluate(async () => {
    const { workerStatus } = await import("../../shared/pwa-assurance.js");
    const worker = await workerStatus(navigator.serviceWorker.controller);
    return { deleted: await (await caches.open(worker.currentCacheName)).delete(new URL("./index.html", location.href).href), previous: worker.previousCacheName };
  });
  expect(damaged).toEqual({ deleted: true, previous: expect.any(String) });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Discover Your Core Profile" })).toBeVisible();
  const recovered = await status();
  expect(recovered.currentComplete).toBe(false);
  expect(recovered.recoveredFromPrevious).toBe(true);
  expect(await page.evaluate(() => NoodleNudge.State.get().appConfig?.r0Proof)).toBe("kept");
  await context.setOffline(false);
});

test("Flexx Files exposes touch-safe backup/restore UI and rejects corrupt restore data", async ({ page }) => {
  await gotoApp(page, "flexx-files");
  await page.getByLabel("Navigate to system settings").tap();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#backup-btn").click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/flexx.*\.json$/i);

  await page.getByLabel("Restore Data").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"sessions":"invalid"}')
  });
  await expect(page.locator("#modal-layer")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#modal-body")).toContainText(/invalid|format|sessions/i);
});

test("Flexx Files restores current backups, preserves foreign storage, and reports quota failure", async ({ page }) => {
  const fixture = JSON.parse(await readFile(join(root, "tests", "fixtures", "lifeos-strength-preview-v1.json"), "utf8"));
  await gotoApp(page, "flexx-files");
  await page.evaluate(() => localStorage.setItem("other_app_data", "keep"));
  await page.getByLabel("Navigate to system settings").tap();
  await page.getByLabel("Restore Data").setInputFiles({
    name: "flexx-current.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture.currentBackup))
  });
  const reload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Confirm and close dialog" }).click();
  await reload;
  expect(await page.evaluate(() => ({
    sessions: JSON.parse(localStorage.getItem("flexx_sessions_v3") || "[]"),
    foreign: localStorage.getItem("other_app_data")
  }))).toEqual({ sessions: fixture.currentBackup.sessions, foreign: "keep" });

  await page.getByLabel("Navigate to system settings").tap();
  await page.evaluate(() => {
    window.__flexxOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "flexx_sessions_v3") throw new DOMException("quota", "QuotaExceededError");
      return window.__flexxOriginalSetItem.call(this, key, value);
    };
  });
  await page.getByLabel("Restore Data").setInputFiles({
    name: "flexx-legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture.legacyBackup))
  });
  await page.getByRole("button", { name: "Confirm and close dialog" }).click();
  await expect(page.locator("#modal-layer")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#modal-body")).toContainText(/failed to apply import data/i);
  expect(await page.evaluate(() => ({
    sessions: JSON.parse(localStorage.getItem("flexx_sessions_v3") || "[]"),
    foreign: localStorage.getItem("other_app_data")
  }))).toEqual({ sessions: fixture.currentBackup.sessions, foreign: "keep" });
  await page.evaluate(() => { Storage.prototype.setItem = window.__flexxOriginalSetItem; delete window.__flexxOriginalSetItem; });
});

async function createCommonGroundWorkspace(page, name = "Regression Workspace") {
  await gotoApp(page, "commonground");
  await page.getByLabel("Workspace name").fill(name);
  await page.getByLabel("Workspace owner").fill("Local owner");
  await page.getByRole("button", { name: "Create Workspace" }).press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
}

test("CommonGround Decision Analysis preserves the complete decision workflow", async ({ page }) => {
  await createCommonGroundWorkspace(page);
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Regression decision");
  await page.getByLabel("Matter type").selectOption("decision-analysis");
  await page.getByRole("button", { name: "Create Matter" }).press("Enter");
  await expect(page.getByText("suitability not applicable", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Decision memo" }).click();
  await expect(page.getByLabel("Decision context")).toHaveValue("shared");
  await page.getByLabel("Decision context").selectOption("personal");
  await page.getByLabel("Core question").fill("Does the unified workflow persist safely?");
  await page.getByRole("button", { name: "Save Decision Memo" }).press("Enter");
  await expect(page.locator(".notice-success")).toContainText("Decision memo saved");
  await expect(page.getByLabel("Decision context")).toHaveValue("personal");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Regression decision/ }).click();
  await page.getByRole("button", { name: "Decision memo" }).click();
  await expect(page.getByLabel("Decision context")).toHaveValue("personal");
  await page.getByLabel("Decision context").selectOption("professional");
  await page.getByLabel("Leading choice").fill("Proceed with one CommonGround app");
  await page.getByLabel("Rationale").fill("One storage and recovery contract reduces duplication.");
  await page.getByRole("button", { name: "Save Decision Memo" }).press("Enter");
  await expect(page.locator(".notice-success")).toContainText("Decision memo saved");

  await page.getByRole("button", { name: "Evidence & assumptions" }).click();
  await page.getByLabel("Type").fill("Regression");
  await page.getByLabel("Citation").fill("Synthetic test fixture");
  await page.getByRole("button", { name: "Add Evidence" }).click();
  await page.getByLabel("Statement").fill("Local IndexedDB is available");
  await page.getByRole("button", { name: "Add Assumption" }).click();

  await page.getByRole("button", { name: "Options & matrix" }).click();
  await page.getByLabel("Constraint", { exact: true }).fill("Must preserve existing local data");
  await page.getByLabel("Why it is non-negotiable").fill("Migration may not destroy the source");
  await page.getByRole("button", { name: "Add Hard Constraint" }).click();
  await page.getByLabel("Option").fill("Unified app");
  await page.getByLabel("Comparative score (0–10)").fill("9");
  await page.getByRole("button", { name: "Add Option" }).click();
  await page.getByLabel("Dimensions").fill("Risk, Usability, Recovery");
  await page.getByRole("button", { name: "Save Matrix" }).click();

  await page.getByRole("button", { name: "Decision & governance" }).click();
  await page.getByLabel("Accountability").fill("Local owner reviews the outcome");
  await page.getByRole("button", { name: "Save Decision and Governance" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Regression decision/ }).click();
  await page.getByRole("button", { name: "Decision memo" }).click();
  await expect(page.getByLabel("Decision context")).toHaveValue("professional");
  await expect(page.getByLabel("Core question")).toHaveValue("Does the unified workflow persist safely?");

  await page.getByRole("button", { name: "Decision brief" }).click();
  await expect(page.locator(".brief-grid div").filter({ hasText: "Hard constraints" })).toContainText("1");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Markdown" }).click();
  const markdownDownload = await downloadPromise;
  expect(markdownDownload.suggestedFilename()).toMatch(/^commonground-.*\.md$/);
  expect(await readFile(await markdownDownload.path(), "utf8")).toContain("## constraint");
});

test("CommonGround keeps facilitation suitability and route isolation", async ({ page }) => {
  await createCommonGroundWorkspace(page, "Facilitation Workspace");
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Facilitation case");
  await page.getByRole("button", { name: "Create Matter" }).click();
  await page.getByRole("button", { name: "Suitability" }).click();
  await page.getByRole("button", { name: "Save Suitability" }).click();
  await expect(page.locator(".notice-error")).toContainText("requires every safety");
  for (const label of ["Participation is voluntary", "Participants have authority to engage", "No severe power imbalance prevents fair participation", "No immediate safety risk requires another route"]) {
    await page.getByLabel(label).check();
  }
  await page.getByRole("button", { name: "Save Suitability" }).click();
  await expect(page.locator(".notice-success")).toContainText("suitable to proceed");
  await page.getByRole("button", { name: "People & intake" }).click();
  await page.getByLabel("Name").fill("Participant One");
  await page.getByLabel("Process consent recorded").check();
  await page.getByRole("button", { name: "Add Participant" }).click();
  await expect(page.getByText(/Participant One/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Decision memo" })).toHaveCount(0);
});

test("CommonGround deletes only the selected matter graph", async ({ page }) => {
  await createCommonGroundWorkspace(page, "Deletion Workspace");
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Delete this matter");
  await page.getByRole("button", { name: "Create Matter" }).click();
  const deletedMatterId = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("commonground-suite");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("matters", "readonly");
    const rows = await new Promise((resolve, reject) => {
      const request = tx.objectStore("matters").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return rows.find((row) => row.title === "Delete this matter").id;
  });
  await page.getByRole("button", { name: "Suitability" }).click();
  for (const label of ["Participation is voluntary", "Participants have authority to engage", "No severe power imbalance prevents fair participation", "No immediate safety risk requires another route"]) {
    await page.getByLabel(label).check();
  }
  await page.getByRole("button", { name: "Save Suitability" }).click();
  await page.getByRole("button", { name: "People & intake" }).click();
  await page.getByLabel("Name").fill("Temporary participant");
  await page.getByRole("button", { name: "Add Participant" }).click();
  await page.getByRole("button", { name: "Matters" }).click();
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Keep this matter");
  await page.getByRole("button", { name: "Create Matter" }).click();
  await page.getByRole("button", { name: "Matters" }).click();
  await page.getByRole("button", { name: /Delete this matter/ }).click();
  await page.getByRole("button", { name: "Delete Matter" }).click();
  await page.locator("#modal-phrase").fill("DELETE");
  await page.getByRole("button", { name: "Delete Matter", exact: true }).last().click();
  await expect(page.getByRole("button", { name: /Keep this matter/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete this matter/ })).toHaveCount(0);
  const leftovers = await page.evaluate(async (matterId) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("commonground-suite");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(["matters", "participants"], "readonly");
    const matter = await new Promise((resolve) => {
      const request = tx.objectStore("matters").get(matterId);
      request.onsuccess = () => resolve(request.result);
    });
    const participants = await new Promise((resolve) => {
      const request = tx.objectStore("participants").index("matterId").getAll(matterId);
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return { matter: Boolean(matter), participants: participants.length };
  }, deletedMatterId);
  expect(leftovers).toEqual({ matter: false, participants: 0 });
});

test("CommonGround migrates LedgerSuite once and leaves the source intact", async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("ledger-suite");
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("ledger-suite", 3);
      request.onupgradeneeded = () => {
        for (const name of ["workspaces", "cases", "evidenceItems", "recoveryLogs"]) request.result.createObjectStore(name, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(["workspaces", "cases", "evidenceItems", "recoveryLogs"], "readwrite");
    tx.objectStore("workspaces").put({ id: "legacy-ws", name: "Legacy Decisions", createdAt: "2026-01-01T00:00:00.000Z" });
    tx.objectStore("cases").put({ id: "legacy-case", workspaceId: "legacy-ws", title: "Legacy choice", status: "draft", question: "Migrate?", choice: "Yes", createdAt: "2026-01-02T00:00:00.000Z" });
    tx.objectStore("evidenceItems").put({ id: "legacy-evidence", caseId: "legacy-case", kind: "Report", citation: "Fixture", notes: "Local only" });
    tx.objectStore("recoveryLogs").put({ id: "legacy-log", message: "Schema checked", createdAt: "2026-01-03T00:00:00.000Z" });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });

  await createCommonGroundWorkspace(page, "Current Workspace");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Ready to migrate")).toBeVisible();
  await expect(page.getByText("1 workspace(s), 1 decision case(s).")).toBeVisible();
  await page.getByRole("button", { name: "Migrate into CommonGround" }).click();
  await expect(page.locator(".notice-success")).toContainText("Migrated 1 LedgerSuite decision case");
  await page.getByLabel("Workspace").selectOption({ label: "Legacy Decisions" });
  await page.getByRole("button", { name: "Matters" }).click();
  await page.getByRole("button", { name: /Legacy choice/ }).click();
  await page.getByRole("button", { name: "Decision memo" }).click();
  await expect(page.getByLabel("Core question")).toHaveValue("Migrate?");
  const sourceStillExists = await page.evaluate(async () => (await indexedDB.databases()).some((database) => database.name === "ledger-suite"));
  expect(sourceStillExists).toBe(true);
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Already migrated")).toBeVisible();
  await page.getByText("Delete legacy source after migration").click();
  await page.locator("#legacy-delete-phrase").fill("DELETE LEDGER");
  await page.getByRole("button", { name: "Delete legacy database" }).click();
  await expect(page.locator(".notice-error")).toContainText("Download the legacy source backup");
  await page.getByText("Delete legacy source after migration").click();
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Legacy Backup" }).click();
  const legacyBackup = await backupPromise;
  expect(legacyBackup.suggestedFilename()).toMatch(/^ledger-suite-source-backup-.*\.json$/);
  const legacyBackupJson = JSON.parse(await readFile(await legacyBackup.path(), "utf8"));
  expect(legacyBackupJson.entities.recoveryLogs).toEqual([{ id: "legacy-log", message: "Schema checked", createdAt: "2026-01-03T00:00:00.000Z" }]);
  await page.getByText("Delete legacy source after migration").click();
  await page.locator("#legacy-delete-phrase").fill("DELETE LEDGER");
  await page.getByRole("button", { name: "Delete legacy database" }).click();
  await expect(page.locator(".app-main > .notice-success")).toHaveText("Legacy LedgerSuite database deleted.");
  const sourceRemoved = await page.evaluate(async () => !(await indexedDB.databases()).some((database) => database.name === "ledger-suite"));
  expect(sourceRemoved).toBe(true);
});

test("CommonGround rejects malformed imports and backs up before scoped reset", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createCommonGroundWorkspace(page);
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Reset recovery matter");
  await page.getByRole("button", { name: "Create Matter" }).click();
  await page.evaluate(async () => {
    localStorage.setItem("flexx_unrelated", "keep");
    await caches.open("other-app-cache");
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle("commonground", { create: true });
    const file = await directory.getFileHandle("temporary.txt", { create: true });
    const writer = await file.createWritable();
    await writer.write("temporary");
    await writer.close();
  });
  await page.getByRole("button", { name: "Settings" }).tap();
  await page.locator("#bundle-file").setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"invalid":true}') });
  await expect(page.locator(".notice-error")).toContainText("Bundle app must be commonground");
  await page.getByRole("button", { name: "Prepare Factory Reset" }).click();
  await page.locator("#modal-phrase").fill("DELETE");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back Up and Reset" }).click();
  const resetBackup = await downloadPromise;
  expect(resetBackup.suggestedFilename()).toMatch(/^commonground-pre-reset-backup-.*\.json$/);
  await expect(page.getByRole("heading", { name: "Welcome to CommonGround" })).toBeVisible();
  const unrelated = await page.evaluate(async () => ({
    value: localStorage.getItem("flexx_unrelated"),
    cache: (await caches.keys()).includes("other-app-cache"),
    commonGroundOpfsRemoved: await navigator.storage.getDirectory().then((root) => root.getDirectoryHandle("commonground")).then(() => false).catch(() => true)
  }));
  expect(unrelated).toEqual({ value: "keep", cache: true, commonGroundOpfsRemoved: true });
  await page.getByLabel("Workspace name").fill("Recovery shell");
  await page.getByLabel("Workspace owner").fill("Local owner");
  await page.getByRole("button", { name: "Create Workspace" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("#bundle-file").setInputFiles(await resetBackup.path());
  await page.getByRole("button", { name: "Import as a copy" }).click();
  await expect(page.locator("#workspace-switcher option")).toHaveCount(2);
  await page.locator("#workspace-switcher").selectOption({ label: "Regression Workspace" });
  await page.getByRole("button", { name: "Matters" }).click();
  await expect(page.getByRole("button", { name: /Reset recovery matter/ })).toBeVisible();
});

test("CommonGround export v2 round-trips as an integrity-protected copy", async ({ page }) => {
  await createCommonGroundWorkspace(page, "Round-trip Workspace");
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Round-trip matter");
  await page.getByRole("button", { name: "Create Matter" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const bundle = JSON.parse(await readFile(path, "utf8"));
  expect(bundle).toMatchObject({ app: "commonground", bundleKind: "workspace", exportVersion: 2, schemaVersion: 4 });
  expect(bundle.integrity.algorithm).toBe("SHA-256");
  await page.locator("#bundle-file").setInputFiles(path);
  await expect(page.getByText("Validated workspace bundle")).toBeVisible();
  await page.getByRole("button", { name: "Import as a copy" }).click();
  await expect(page.locator(".notice-success")).toContainText("Imported 1 matter");
  const options = page.locator("#workspace-switcher option");
  await expect(options).toHaveCount(2);
  await page.locator("#workspace-switcher").selectOption(await options.nth(1).getAttribute("value"));
  await page.getByRole("button", { name: "Matters" }).click();
  await expect(page.getByRole("button", { name: /Round-trip matter/ })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  const zipDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export ZIP" }).click();
  const zipDownload = await zipDownloadPromise;
  expect(zipDownload.suggestedFilename()).toMatch(/^commonground-backup-.*\.zip$/);
  await page.locator("#bundle-file").setInputFiles({
    name: zipDownload.suggestedFilename(),
    mimeType: "application/zip",
    buffer: await readFile(await zipDownload.path())
  });
  await expect(page.getByText("Validated workspace bundle")).toBeVisible();
  await page.getByRole("button", { name: "Import as a copy" }).click();
  await expect(page.locator(".notice-success")).toContainText("Imported 1 matter");
});

test("CommonGround accepts v1 matter packets and LedgerSuite v1 files but rejects bad v2 integrity", async ({ page }) => {
  await createCommonGroundWorkspace(page, "Compatibility Workspace");
  await page.getByRole("button", { name: "Settings" }).click();
  const commonV1 = {
    exportVersion: 1,
    schemaVersion: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    matterId: "old-matter",
    matter: { id: "old-matter", workspaceId: "old-workspace", title: "CommonGround v1 matter", type: "team-health", status: "active", suitabilityState: "suitable", currentPhase: "session", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", schemaVersion: 1 },
    participants: [], intakeRecords: [], issueNodes: [], sessions: [], commitments: [], followUps: [], exportArtifacts: []
  };
  await page.locator("#bundle-file").setInputFiles({ name: "commonground-v1.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(commonV1)) });
  await expect(page.getByText("Validated matter bundle")).toBeVisible();
  await page.getByRole("button", { name: "Import as a copy" }).click();
  await expect(page.locator(".notice-success")).toContainText("Imported 1 matter");

  const entities = {
    meta: [],
    workspaces: [{ id: "file-ws", name: "Ledger File Workspace" }],
    cases: [{ id: "file-case", workspaceId: "file-ws", title: "Ledger file decision", question: "Import?", choice: "Yes" }],
    evidenceItems: [], assumptions: [], optionSets: [], reviewMatrices: [], decisionRecords: [], outcomeReviews: [], governanceReviews: [], packHooks: [], recoveryLogs: []
  };
  await page.locator("#legacy-file").setInputFiles({ name: "ledger-v1.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, appVersion: "0.1", entities })) });
  await expect(page.getByText("Ready to migrate")).toBeVisible();
  await page.getByRole("button", { name: "Migrate staged file" }).click();
  await expect(page.locator(".notice-success")).toContainText("Migrated 1 LedgerSuite decision case");

  const zipEntities = {
    ...entities,
    workspaces: [{ id: "zip-ws", name: "Ledger ZIP Workspace" }],
    cases: [{ id: "zip-case", workspaceId: "zip-ws", title: "Ledger ZIP decision", question: "Read ZIP?", choice: "Yes" }]
  };
  const zip = createStoredZip("snapshot.json", JSON.stringify({ schemaVersion: 1, appVersion: "0.1", entities: zipEntities }));
  const zipBuffer = Buffer.from(await zip.arrayBuffer());
  await page.locator("#legacy-file").setInputFiles({ name: "ledger-v1.zip", mimeType: "application/zip", buffer: zipBuffer });
  await expect(page.getByText("Ready to migrate")).toBeVisible();

  const corruptZip = Buffer.from(zipBuffer);
  const bodyStart = 30 + corruptZip.readUInt16LE(26) + corruptZip.readUInt16LE(28);
  corruptZip[bodyStart + 5] ^= 1;
  await page.locator("#legacy-file").setInputFiles({ name: "ledger-v1-corrupt.zip", mimeType: "application/zip", buffer: corruptZip });
  await expect(page.locator(".notice-error")).toContainText("checksum failed");

  const v2Entities = {
    ...entities,
    workspaces: [{ id: "v2-ws", name: "Ledger v2 Workspace" }],
    cases: [{ id: "v2-case", workspaceId: "v2-ws", title: "Ledger v2 decision", question: "Accept v2?", choice: "Yes" }]
  };
  const v2Payload = { schemaVersion: 2, appVersion: "0.2", entities: v2Entities };
  const validV2 = { ...v2Payload, integrity: { algorithm: "fnv1a-32", value: fnv1a32(JSON.stringify(v2Payload)) } };
  await page.locator("#legacy-file").setInputFiles({ name: "ledger-v2-valid.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(validV2)) });
  await expect(page.getByText("Ready to migrate")).toBeVisible();
  await page.getByRole("button", { name: "Migrate staged file" }).click();
  await expect(page.locator(".notice-success")).toContainText("Migrated 1 LedgerSuite decision case");

  await page.locator("#legacy-file").setInputFiles({ name: "ledger-v2-invalid.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ schemaVersion: 2, appVersion: "0.1", entities, integrity: { algorithm: "fnv1a-32", value: "00000000" } })) });
  await expect(page.locator(".notice-error")).toContainText("integrity checksum");
});

test("CommonGround portable records require preview, import once, preserve extensions, and roll back", async ({ page, context }) => {
  await createCommonGroundWorkspace(page, "Portable Source");
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Portable decision");
  await page.getByLabel("Matter type").selectOption("decision-analysis");
  await page.getByRole("button", { name: "Create Matter" }).click();
  await page.getByRole("button", { name: "Evidence & assumptions" }).click();
  await page.getByLabel("Statement").fill("Portable assumption");
  await page.getByRole("button", { name: "Add Assumption" }).click();
  await page.getByRole("button", { name: "Decision brief" }).click();

  await page.getByRole("button", { name: "Export portable record" }).click();
  await expect(page.getByLabel("Portable record export preview")).toContainText("Portable decision");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByLabel("Portable record export preview")).toHaveCount(0);

  await page.getByRole("button", { name: "Export portable record" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Confirm and download" }).click();
  const portableDownload = await downloadPromise;
  expect(portableDownload.suggestedFilename()).toMatch(/\.lfa\.json$/);
  const original = JSON.parse(await readFile(await portableDownload.path(), "utf8"));
  original.records[0].futureRecordField = { preserve: "record" };
  original.records[0].payload.futurePayloadField = { preserve: "payload" };
  const portable = await createInterchangePackage({
    sourceApp: original.sourceApp,
    timezone: original.timezone,
    records: original.records,
    selection: original.selection,
    extensions: { futurePackageField: { inert: "<script>not executable</script>" } }
  });
  const portableFile = { name: "portable.lfa.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(portable)) };

  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator("#interchange-file").setInputFiles(portableFile);
  await expect(page.getByText(/Validated 1 portable record/)).toBeVisible();
  await expect(page.getByText("Preview exact selected content")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator("#workspace-switcher option")).toHaveCount(1);

  await page.locator("#interchange-file").setInputFiles(portableFile);
  const duplicatePage = await context.newPage();
  await gotoApp(duplicatePage, "commonground");
  await duplicatePage.getByRole("button", { name: "Settings" }).click();
  await duplicatePage.locator("#interchange-file").setInputFiles(portableFile);
  await page.getByRole("button", { name: "Confirm atomic import" }).click();
  await expect(page.locator(".notice-success")).toContainText("Imported 1 portable matter");
  await duplicatePage.getByRole("button", { name: "Confirm atomic import" }).click();
  await expect(duplicatePage.locator(".notice-error")).toContainText("already imported");
  await duplicatePage.close();
  await expect(page.locator("#workspace-switcher option")).toHaveCount(2);

  await page.getByRole("button", { name: "Matters" }).click();
  await page.getByRole("button", { name: /Portable decision \(Imported\)/ }).click();
  await page.getByRole("button", { name: "Decision brief" }).click();
  await page.getByRole("button", { name: "Export portable record" }).click();
  const reexportPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Confirm and download" }).click();
  const reexport = JSON.parse(await readFile(await (await reexportPromise).path(), "utf8"));
  expect(reexport.records[0]).toMatchObject({
    id: portable.records[0].id,
    sourceApp: portable.records[0].sourceApp,
    createdAt: portable.records[0].createdAt,
    truthClass: portable.records[0].truthClass,
    timezone: portable.records[0].timezone,
    revision: portable.records[0].revision
  });
  expect(reexport.records[0].futureRecordField).toEqual({ preserve: "record" });
  expect(reexport.records[0].payload.futurePayloadField).toEqual({ preserve: "payload" });

  await page.getByRole("button", { name: "Evidence & assumptions" }).click();
  await page.locator('[data-delete-store="decisionItems"]').first().click();
  await expect(page.getByText("Portable assumption")).toHaveCount(0);
  await page.getByLabel("Statement").fill("Corrected after import");
  await page.getByRole("button", { name: "Add Assumption" }).click();
  const importedMatterId = await page.evaluate(async () => (await (await import("./modules/db.js")).getAll("matters")).find((row) => row.title === "Portable decision (Imported)").id);
  await page.getByRole("button", { name: "Matters" }).click();
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Independent work after import");
  await page.getByRole("button", { name: "Create Matter" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Roll back import" }).click();
  await expect(page.locator(".notice-success")).toContainText("rolled back");
  await expect(page.locator("#workspace-switcher option")).toHaveCount(2);
  await expect(page.getByText("rolled-back", { exact: true })).toBeVisible();
  const rollbackState = await page.evaluate(async (removedMatterId) => {
    const db = await import("./modules/db.js");
    return {
      removed: (await db.getAll("matters")).some((row) => row.id === removedMatterId),
      orphanedCorrections: (await db.getAll("decisionItems")).filter((row) => row.matterId === removedMatterId).length,
      independent: (await db.getAll("matters")).some((row) => row.title === "Independent work after import")
    };
  }, importedMatterId);
  expect(rollbackState).toEqual({ removed: false, orphanedCorrections: 0, independent: true });

  await page.locator("#interchange-file").setInputFiles(portableFile);
  await page.getByRole("button", { name: "Confirm atomic import" }).click();
  await expect(page.locator(".notice-error")).toContainText("already imported");
  await expect(page.locator("#workspace-switcher option")).toHaveCount(2);
});

test("CommonGround portable import aborts partial and quota failures without mutation", async ({ page }) => {
  await createCommonGroundWorkspace(page, "Atomic Source");
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Atomic matter");
  await page.getByRole("button", { name: "Create Matter" }).click();
  const result = await page.evaluate(async () => {
    const db = await import("./modules/db.js");
    const adapter = await import("./modules/interchange-adapter.js");
    const matter = (await db.getAll("matters"))[0];
    const portable = await adapter.createCommonGroundInterchange(matter.id);
    const counts = async () => ({
      workspaces: (await db.getAll("workspaces")).length,
      matters: (await db.getAll("matters")).length,
      receipts: (await db.getAll("transferReceipts")).length
    });
    const before = await counts();
    const errors = [];
    for (const failureMode of ["partial", "quota"]) {
      try { await adapter.applyCommonGroundInterchange(portable, { failureMode }); }
      catch (error) { errors.push({ failureMode, name: error.name, message: error.message }); }
    }
    return { before, after: await counts(), errors };
  });
  expect(result.after).toEqual(result.before);
  expect(result.errors).toHaveLength(2);
  expect(result.errors.map((entry) => entry.failureMode)).toEqual(["partial", "quota"]);
});

test("CommonGround first install stays stable and its scoped shell reloads offline", async ({ page, context }) => {
  let mainFrameNavigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) mainFrameNavigations += 1;
  });
  await createCommonGroundWorkspace(page, "Offline Workspace");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.waitForTimeout(100);
  expect(mainFrameNavigations).toBe(1);
  const cacheKeys = await page.evaluate(() => caches.keys());
  expect(cacheKeys.some((key) => key.startsWith("commonground-shell-0.2.2-m2"))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Shared work, clear next steps" })).toBeVisible();
  await context.setOffline(false);
});

test("CommonGround stages an updated worker until the user activates it across tabs", async ({ page, context }) => {
  await createCommonGroundWorkspace(page, "Update Workspace");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const duplicatePage = await context.newPage();
  await gotoApp(duplicatePage, "commonground");
  await duplicatePage.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const controllerBefore = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
  await page.evaluate(() => fetch("/__test__/commonground-worker-update", { method: "POST" }));
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("./");
    await registration.update();
  });
  await expect(page.getByText("A verified CommonGround update is ready.")).toBeVisible();
  await expect(duplicatePage.getByText("A verified CommonGround update is ready.")).toBeVisible();
  const staged = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("./");
    return { waiting: Boolean(registration.waiting), controller: navigator.serviceWorker.controller?.scriptURL };
  });
  expect(staged).toEqual({ waiting: true, controller: controllerBefore });
  await Promise.all([
    page.waitForEvent("load"),
    duplicatePage.waitForEvent("load"),
    page.getByRole("button", { name: "Reload to update" }).click()
  ]);
  await expect(page.getByRole("heading", { name: "Shared work, clear next steps" })).toBeVisible();
  await expect(duplicatePage.getByRole("heading", { name: "Shared work, clear next steps" })).toBeVisible();
  await expect(page.getByText("A verified CommonGround update is ready.")).toHaveCount(0);
  const workspaceCount = await page.evaluate(async () => (await (await import("./modules/db.js")).getAll("workspaces")).length);
  expect(workspaceCount).toBe(1);
});

test("CommonGround rejects missing and corrupt candidate shells without displacing data", async ({ page }) => {
  await createCommonGroundWorkspace(page, "Fail-closed Workspace");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const status = async () => page.evaluate(async () => {
    const { workerStatus } = await import("../../shared/pwa-assurance.js");
    return workerStatus(navigator.serviceWorker.controller);
  });
  const shellBefore = (await status()).shellVersion;
  for (const mode of ["missing", "corrupt"]) {
    await page.evaluate(([target, fault]) => fetch(`/__test__/pwa-fault?target=${encodeURIComponent(target)}&mode=${fault}`, { method: "POST" }), ["/apps/commonground/app.js", mode]);
    await page.evaluate(() => fetch("/__test__/commonground-worker-update", { method: "POST" }));
    const finalState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration("./");
      return new Promise(async (resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Candidate did not settle.")), 10000);
        const observe = (worker) => {
          if (!worker) return;
          const finish = () => {
            if (["redundant", "installed"].includes(worker.state)) {
              clearTimeout(timer);
              resolve(worker.state);
            }
          };
          worker.addEventListener("statechange", finish);
          finish();
        };
        registration.addEventListener("updatefound", () => observe(registration.installing), { once: true });
        try { await registration.update(); observe(registration.installing); } catch (error) { clearTimeout(timer); reject(error); }
      });
    });
    expect(finalState).toBe("redundant");
    const registrationState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration("./");
      return { waiting: Boolean(registration.waiting), workspaces: (await (await import("./modules/db.js")).getAll("workspaces")).length };
    });
    expect(registrationState).toEqual({ waiting: false, workspaces: 1 });
    expect((await status()).shellVersion).toBe(shellBefore);
    await page.evaluate((target) => fetch(`/__test__/pwa-fault?target=${encodeURIComponent(target)}&mode=clear`, { method: "POST" }), "/apps/commonground/app.js");
  }
});

test("CommonGround recovers an evicted current asset from its last-known-good shell", async ({ page, context }) => {
  await createCommonGroundWorkspace(page, "Recovery Workspace");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.evaluate(() => fetch("/__test__/commonground-worker-update", { method: "POST" }));
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration("./")).update());
  await expect(page.getByText("A verified CommonGround update is ready.")).toBeVisible();
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "Reload to update" }).click()]);
  const damaged = await page.evaluate(async () => {
    const { workerStatus } = await import("../../shared/pwa-assurance.js");
    const before = await workerStatus(navigator.serviceWorker.controller);
    const cache = await caches.open(before.currentCacheName);
    const deleted = await cache.delete(new URL("./index.html", location.href).href);
    return { deleted, previous: before.previousCacheName };
  });
  expect(damaged.deleted).toBe(true);
  expect(damaged.previous).toBeTruthy();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Shared work, clear next steps" })).toBeVisible();
  const recovered = await page.evaluate(async () => {
    const { workerStatus } = await import("../../shared/pwa-assurance.js");
    const worker = await workerStatus(navigator.serviceWorker.controller);
    return { worker, workspaces: (await (await import("./modules/db.js")).getAll("workspaces")).length };
  });
  expect(recovered.worker.currentComplete).toBe(false);
  expect(recovered.worker.recoveredFromPrevious).toBe(true);
  expect(recovered.workspaces).toBe(1);
  await context.setOffline(false);
});

test("CommonGround upgrades a version 3 database additively", async ({ page }) => {
  await page.goto(baseUrl);
  await page.evaluate(async () => {
    await new Promise((resolve) => { const request = indexedDB.deleteDatabase("commonground-suite"); request.onsuccess = request.onerror = request.onblocked = resolve; });
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("commonground-suite", 3);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore("workspaces", { keyPath: "id" });
        store.add({ id: "workspace-v3", name: "Version 3 Workspace", owner: "Prior owner", schemaVersion: 3, revision: 1, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
  });
  await gotoApp(page, "commonground");
  await expect(page.locator("#main-content").getByText("Version 3 Workspace", { exact: true })).toBeVisible();
  const upgraded = await page.evaluate(async () => {
    const db = await (await import("./modules/db.js")).openDatabase();
    return { version: db.version, stores: [...db.objectStoreNames] };
  });
  expect(upgraded.version).toBe(4);
  expect(upgraded.stores).toContain("transferReceipts");
});

test("CommonGround and Flexx Files install and restart offline below a repository subpath", async ({ page, context }) => {
  for (const slug of ["commonground", "flexx-files"]) {
    await page.goto(`${baseUrl}subpath/LocalFirstApps/apps/${slug}/`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await context.setOffline(false);
  }
});

test("Flexx Files stages explicit updates and preserves app data", async ({ page }) => {
  await gotoApp(page, "flexx-files");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.evaluate(() => localStorage.setItem("flexx_m2_survival", "kept"));
  await page.evaluate(() => fetch("/__test__/flexx-worker-update", { method: "POST" }));
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration("./")).update());
  await expect(page.locator("#modal-layer")).toHaveAttribute("aria-hidden", "false");
  const staged = await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration("./")).waiting));
  expect(staged).toBe(true);
  await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: /Reload Now and close dialog/ }).click()]);
  expect(await page.evaluate(() => localStorage.getItem("flexx_m2_survival"))).toBe("kept");
});

test("Flexx Files backup-gated reset remains app-scoped", async ({ page }) => {
  await gotoApp(page, "flexx-files");
  await page.evaluate(async () => {
    localStorage.setItem("flexx_m2_reset", "remove");
    localStorage.setItem("other_app_data", "keep");
    await (await caches.open("other-app-shell")).put("/other-app-proof", new Response("keep"));
  });
  await page.getByLabel("Navigate to system settings").tap();
  const downloadPromise = page.waitForEvent("download");
  const reloadPromise = page.waitForEvent("load");
  await page.getByLabel("Factory Reset").click();
  await page.getByRole("button", { name: "Confirm and close dialog" }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^flexx-files-backup-.*\.json$/);
  await reloadPromise;
  const remaining = await page.evaluate(async () => ({
    owned: localStorage.getItem("flexx_m2_reset"),
    other: localStorage.getItem("other_app_data"),
    otherCache: (await caches.keys()).includes("other-app-shell")
  }));
  expect(remaining).toEqual({ owned: null, other: "keep", otherCache: true });
});

test("CommonGround rejects a stale decision write from another tab", async ({ page, context }) => {
  await createCommonGroundWorkspace(page, "Concurrency Workspace");
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Concurrent decision");
  await page.getByLabel("Matter type").selectOption("decision-analysis");
  await page.getByRole("button", { name: "Create Matter" }).click();
  await page.getByRole("button", { name: "Decision memo" }).click();
  await page.getByLabel("Core question").fill("Initial question");
  await page.getByRole("button", { name: "Save Decision Memo" }).click();

  const stalePage = await context.newPage();
  await gotoApp(stalePage, "commonground");
  await stalePage.getByRole("button", { name: "Matters" }).click();
  await stalePage.getByRole("button", { name: /Concurrent decision/ }).click();
  await stalePage.getByRole("button", { name: "Decision memo" }).click();

  await page.getByLabel("Core question").fill("Newer question from first tab");
  await page.getByRole("button", { name: "Save Decision Memo" }).click();
  await expect(page.locator(".notice-success")).toContainText("Decision memo saved");

  await stalePage.getByLabel("Leading choice").fill("Stale tab choice");
  await stalePage.getByRole("button", { name: "Save Decision Memo" }).click();
  await expect(stalePage.locator(".notice-error")).toContainText("changed in another tab");
  await stalePage.reload({ waitUntil: "domcontentloaded" });
  await stalePage.getByRole("button", { name: /Concurrent decision/ }).click();
  await stalePage.getByRole("button", { name: "Decision memo" }).click();
  await expect(stalePage.getByLabel("Core question")).toHaveValue("Newer question from first tab");
  await expect(stalePage.getByLabel("Leading choice")).toHaveValue("");
});

test("LedgerSuite compatibility path redirects to CommonGround migration", async ({ page }) => {
  await page.goto(`${baseUrl}apps/ledgersuite/`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/apps\/commonground\/?\?migrate=ledger-suite/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "Welcome to CommonGround" })).toBeVisible();
});
