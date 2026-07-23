import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mime = new Map([
  [".css", "text/css"],
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".webmanifest", "application/manifest+json"]
]);
let server;
let baseUrl;

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

test.afterAll(async () => new Promise((resolve) => server.close(resolve)));

async function openWorkspace(page) {
  await page.goto(`${baseUrl}apps/commonground/`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Welcome to CommonGround" })).toBeVisible();
  await page.getByLabel("Workspace name").fill("R4A Workspace");
  await page.getByLabel("Workspace owner").fill("Local owner");
  await page.getByRole("button", { name: "Create Workspace" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
}

test("CommonGround exposes an app-owned WorkOS shell with only active module boundaries", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);

  await expect(page.getByText("WorkOS · Local-first facilitation and decision workspace")).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("button")).toHaveText(["Dashboard", "Matters", "Settings"]);
  await expect(navigation.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

  const catalog = page.getByRole("region", { name: "Active WorkOS modules" });
  await expect(catalog.getByRole("heading", { name: "Collaboration" })).toBeVisible();
  await expect(catalog.getByRole("heading", { name: "Decisions" })).toBeVisible();
  await expect(catalog.getByText("0 matters")).toHaveCount(2);
  for (const inactive of ["Insights", "Learning", "Knowledge"]) {
    await expect(page.getByText(inactive, { exact: true })).toHaveCount(0);
  }

  await navigation.getByRole("button", { name: "Matters" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Matters" })).toBeVisible();
  await expect(navigation.getByRole("button", { name: "Matters" })).toHaveAttribute("aria-current", "page");
});

test("WorkOS shell preserves responsive, focus, forced-color, and reduced-motion behavior", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await openWorkspace(page);

  const firstNav = page.getByRole("navigation", { name: "Main navigation" }).getByRole("button").first();
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    if (await firstNav.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(firstNav).toBeFocused();
  const focus = await firstNav.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), kind: style.outlineStyle };
  });
  expect(focus.kind).not.toBe("none");
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cg-motion-normal").trim())).toBe("0ms");

  await page.setViewportSize({ width: 320, height: 900 });
  const overflow = await page.evaluate(() => Math.max(
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
    document.body.scrollWidth - document.body.clientWidth
  ));
  expect(overflow).toBeLessThanOrEqual(2);
  for (const element of await page.locator("button:visible, input:visible, select:visible").all()) {
    const box = await element.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  }
});

test("WorkOS reset dialog traps focus, closes predictably, and restores its opener", async ({ page }) => {
  await openWorkspace(page);
  await page.getByRole("button", { name: "Settings" }).click();
  const opener = page.getByRole("button", { name: "Prepare Factory Reset" });
  await opener.click();

  const dialog = page.getByRole("dialog", { name: "Factory Reset" });
  await expect(dialog).toBeVisible();
  await expect(page.locator("#modal-phrase")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Back Up and Reset" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#modal-phrase")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
