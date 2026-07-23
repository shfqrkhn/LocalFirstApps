import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const fixture = JSON.parse(await readFile(new URL("./fixtures/r4b-ts-dash-golden.json", import.meta.url), "utf8"));
let server;
let baseUrl;

const mime = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json"
};

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/__test__/insights-preview") {
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/shared/design-tokens.css"><link rel="stylesheet" href="/shared/design-primitives.css"><link rel="stylesheet" href="/apps/commonground/workos/insights/preview.css"></head><body><main id="preview"></main><script type="module">import { mountInsightsPreview } from "/apps/commonground/workos/insights/index.js"; mountInsightsPreview(document.querySelector("#preview"), ${JSON.stringify(fixture.trendPoints)}, { datasetName: "trend", initialMetric: "weight" });</script></body></html>`;
      return response.writeHead(200, { "content-type": "text/html" }).end(html);
    }
    const raw = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
    const path = normalize(join(root, raw.replace(/^\/+/, "")));
    if (!path.startsWith(root)) return response.writeHead(403).end("Forbidden");
    try {
      const body = await readFile(path);
      response.writeHead(200, { "content-type": mime[extname(path)] || "application/octet-stream", "cache-control": "no-store" }).end(body);
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

test("readable normalization matches the frozen TS-Dash runtime", async ({ page }) => {
  await page.goto(`${baseUrl}apps/ts-dash/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "+ Import CSV" }).click();
  await page.locator("#csv-upload").setInputFiles({
    name: "edge.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(fixture.edgeCsv)
  });
  const selects = page.locator("select");
  await selects.nth(0).selectOption("timestamp");
  await selects.nth(1).selectOption("value");
  await selects.nth(2).selectOption("metric");
  await selects.nth(3).selectOption("unit");
  await selects.nth(4).selectOption("utc");
  await selects.nth(5).selectOption("latest");
  await page.getByRole("button", { name: "Confirm & Import" }).click();
  await expect(page.getByText('1 duplicate timestamp conflicts resolved using "latest" policy.')).toBeVisible();
  const packageDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Dataset JSON" }).click();
  const legacyDownload = await packageDownload;
  const legacyPackage = JSON.parse(await readFile(await legacyDownload.path(), "utf8"));

  const legacy = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("TSDashDB");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction(["datasets", "points"]);
    const request = transaction.objectStore("points").getAll();
    const points = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return points.map(({ id, dataset_id, ...point }) => point);
  });
  const successor = await page.evaluate(async ({ csv, mapping, legacyPackage }) => {
    const module = await import("/apps/commonground/workos/insights/index.js");
    const parsed = module.parseCsv(csv);
    const normalized = module.normalizeRows(parsed.rows, {
      datasetId: "ignored",
      mapping,
      dateOnlyTimezone: "utc",
      conflictPolicy: "latest"
    }).points.map(({ dataset_id, ...point }) => point);
    const imported = module.importDatasetPackage(legacyPackage);
    const reexported = JSON.parse(module.buildDatasetPackage(
      legacyPackage.dataset,
      legacyPackage.points,
      legacyPackage.exported_at
    ).text);
    return {
      normalized,
      imported: {
        dataset: imported.dataset,
        points: imported.points.map(({ id, dataset_id, ...point }) => point)
      },
      reexported
    };
  }, { csv: fixture.edgeCsv, mapping: fixture.mapping, legacyPackage });
  expect(successor.normalized).toEqual(legacy);
  expect(successor.imported.dataset.id).toBe(legacyPackage.dataset.id);
  expect(successor.imported.dataset.name).toBe(legacyPackage.dataset.name);
  expect(successor.imported.points).toEqual(legacy);
  expect(successor.reexported).toEqual(legacyPackage);
});

test("legacy TSDashDB v1 upgrades additively to v2", async ({ page }) => {
  await page.goto(`${baseUrl}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase("TSDashDB");
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("TSDashDB", 10);
      request.onupgradeneeded = () => {
        const db = request.result;
        const datasets = db.createObjectStore("datasets", { keyPath: "id" });
        datasets.createIndex("name", "name");
        datasets.createIndex("updated_at", "updated_at");
        const points = db.createObjectStore("points", { keyPath: "id", autoIncrement: true });
        points.createIndex("dataset_id", "dataset_id");
        points.createIndex("metric_key", "metric_key");
        points.createIndex("timestamp_ms", "timestamp_ms");
        points.createIndex("[dataset_id+metric_key]", ["dataset_id", "metric_key"]);
        datasets.put({ id: "legacy", name: "legacy", updated_at: 1, row_count: 1 });
        points.put({ dataset_id: "legacy", metric_key: "weight", timestamp_ms: 1767225600000, value: 180, unit: "lb", raw_value: "180", is_interpolated: 0 });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
  });
  await page.goto(`${baseUrl}apps/ts-dash/`, { waitUntil: "networkidle" });
  await expect(page.getByText("legacy", { exact: true })).toBeVisible();
  const state = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("TSDashDB");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(["datasets", "points", "metric_settings"]);
    const count = (store) => new Promise((resolve, reject) => {
      const request = tx.objectStore(store).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return { version: db.version, stores: [...db.objectStoreNames], datasets: await count("datasets"), points: await count("points") };
  });
  expect(state).toEqual({ version: 20, stores: ["datasets", "metric_settings", "points"], datasets: 1, points: 1 });
});

test("inactive Insights preview is accessible, responsive, and non-causal", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`${baseUrl}__test__/insights-preview`, { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Insights preview" })).toBeVisible();
  await expect(page.getByText("Inactive parallel preview")).toBeVisible();
  await expect(page.getByText(/does not establish causation/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /Weight trend/ })).toBeVisible();
  await expect(page.getByRole("table", { name: "Visible weight values" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("2 visible points");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".insights-preview")).getPropertyValue("--insights-motion").trim())).toBe("0ms");

  await page.getByRole("button", { name: "All time" }).press("Enter");
  await expect(page.getByRole("status")).toContainText("5 visible points");
  const controls = await page.locator("button, select").evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  for (const control of controls) {
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.height).toBeGreaterThanOrEqual(44);
  }
});

test("content-addressed successor sources load offline without activation", async ({ page, context }) => {
  await page.goto(`${baseUrl}apps/commonground/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  const offline = await page.evaluate(async () => {
    const module = await import("./workos/insights/index.js");
    const stylesheet = await fetch("./workos/insights/preview.css");
    return {
      activation: module.INSIGHTS_CONTRACT.activation,
      owner: module.INSIGHTS_CONTRACT.owner,
      stylesheet: stylesheet.ok
    };
  });
  await context.setOffline(false);
  expect(offline).toEqual({ activation: false, owner: "commonground", stylesheet: true });
});
