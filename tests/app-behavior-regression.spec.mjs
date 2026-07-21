import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
let server;
let baseUrl;

const mime = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json"]
]);

test.use({ hasTouch: true });

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const rawPath = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
      const filePath = normalize(join(root, decodeURIComponent(rawPath)));
      if (!filePath.startsWith(normalize(root))) return response.writeHead(403).end("Forbidden");
      response.writeHead(200, { "content-type": mime.get(extname(filePath)) || "application/octet-stream" });
      response.end(await readFile(filePath));
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

test("LedgerSuite persists memo edits, rejects malformed imports, repairs corruption, and backs up reset", async ({ page }) => {
  let mainFrameNavigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      mainFrameNavigations += 1;
    }
  });

  await gotoApp(page, "ledgersuite");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.waitForTimeout(100);
  expect(mainFrameNavigations).toBe(1);

  await page.locator("#memo-title").fill("Regression decision");
  await page.locator("#memo-question").fill("Does this persist safely?");
  await page.getByRole("button", { name: "Save Memo" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#status")).toContainText("Decision memo saved locally");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#memo-title")).toHaveValue("Regression decision");

  await page.locator("#import-file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("not json")
  });
  await expect(page.locator("#status")).toContainText("Failed to parse import file");
  await expect(page.locator("#commit-import-btn")).toBeDisabled();

  await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("ledger-suite");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("cases", "readwrite");
    tx.objectStore("cases").put({ id: "corrupt-case" });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.locator("details.expandable-panel > summary").tap();
  await page.getByRole("button", { name: "Run Integrity Repair" }).click();
  await expect(page.locator("#status")).toContainText("Removed 1 record");

  const reset = page.getByRole("button", { name: "Reset Local Data" });
  await reset.click();
  await expect(page.locator("#status")).toContainText("Click reset again");
  const downloadPromise = page.waitForEvent("download");
  await reset.click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/^ledger-suite-pre-reset-backup-.*\.json$/);
  await expect(page.locator("#status")).toContainText("Local data reset complete");
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

test("CommonGround keeps navigation operable and validates import/reset recovery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page, "commonground");
  await page.locator("#ws-name").fill("Regression Workspace");
  await page.locator("#ws-owner").fill("Local Facilitator");
  await page.getByRole("button", { name: "Create Workspace" }).press("Enter");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).tap();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  const sponsorOverlap = await page.evaluate(() => {
    const sponsor = document.querySelector('a[href*="github.com/sponsors"]');
    if (!sponsor) return ["missing Sponsor link"];
    const a = sponsor.getBoundingClientRect();
    return [...document.querySelectorAll('a[href], button, input, select, textarea, summary')]
      .filter((element) => element !== sponsor)
      .filter((element) => {
        const b = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.visibility !== "hidden" && style.display !== "none" && b.width > 0 && b.height > 0 &&
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      })
      .map((element) => element.id || element.textContent?.trim()?.slice(0, 40) || element.tagName);
  });
  expect(sponsorOverlap).toEqual([]);
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.locator("#import-btn").click();
  await (await fileChooserPromise).setFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"invalid":true}')
  });
  await expect(page.locator(".global-notice")).toContainText("Import blocked");

  await page.getByRole("button", { name: "Factory Reset" }).click();
  await page.locator("#modal-factory-reset-phrase").fill("DELETE");
  await page.getByRole("button", { name: "Factory Reset" }).last().click();
  await expect(page.locator("#create-workspace-form")).toBeVisible();
});
