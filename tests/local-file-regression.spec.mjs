import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const pages = [
  ["suite", ""],
  ["ts-dash", "apps/ts-dash/"],
  ["pmquiz", "apps/pmquiz/"],
  ["noodle-nudge", "apps/noodle-nudge/"],
  ["ledgersuite", "apps/ledgersuite/"],
  ["flexx-files", "apps/flexx-files/"],
  ["commonground", "apps/commonground/"]
];

for (const [name, path] of pages) {
  test(`${name} has a safe local-file fallback`, async ({ page }) => {
    page.on("dialog", (dialog) => {
      throw new Error(`Unexpected JavaScript dialog: ${dialog.type()}`);
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(pathToFileURL(join(root, path, "index.html")).href, { waitUntil: "domcontentloaded" });

    await expect(page.locator(".lfa-file-notice")).toBeVisible();
    await expect(page.locator(".lfa-file-notice")).toContainText(/localhost|GitHub Pages/);
    if (path) await expect(page.locator(".lfa-suite-home")).toBeVisible();

    const overflowX = await page.evaluate(() => Math.max(
      0,
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.body.clientWidth
    ));
    expect(overflowX).toBe(0);
  });
}
