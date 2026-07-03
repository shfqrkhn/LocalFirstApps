import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
let server;
let baseUrl;

const pages = [
  ["suite", ""],
  ["ts-dash", "apps/ts-dash/"],
  ["pmquiz", "apps/pmquiz/"],
  ["noodle-nudge", "apps/noodle-nudge/"],
  ["ledgersuite", "apps/ledgersuite/"],
  ["flexx-files", "apps/flexx-files/"],
  ["commonground", "apps/commonground/"]
];

const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 3840, height: 2160 }
];

const mime = new Map([
  [".css", "text/css"],
  [".gif", "image/gif"],
  [".html", "text/html"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json"]
]);

async function collectLayoutAudit(page) {
  return page.evaluate(() => ({
    overflowX: Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.body.clientWidth
    ),
    visibleBody: document.body.getBoundingClientRect().width > 0,
    undersizedInteractive: [...document.querySelectorAll("a[href], button, input, select, textarea")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0 && box.height < 28;
      })
      .slice(0, 5)
      .map((element) => element.id || element.textContent?.trim()?.slice(0, 40) || element.tagName.toLowerCase())
  }));
}

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

for (const [name, path] of pages) {
  for (const viewport of viewports) {
    test(`${name} has no page-level horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      page.on("dialog", (dialog) => {
        throw new Error(`Unexpected JavaScript dialog: ${dialog.type()}`);
      });
      await page.setViewportSize(viewport);
      await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();

      let audit;
      await expect
        .poll(async () => {
          try {
            audit = await collectLayoutAudit(page);
            return true;
          } catch {
            return false;
          }
        }, { timeout: 5000 })
        .toBe(true);

      expect(audit.visibleBody).toBe(true);
      expect(audit.overflowX).toBe(0);
      expect(audit.undersizedInteractive).toEqual([]);
    });
  }
}
