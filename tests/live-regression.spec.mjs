import { test, expect } from "@playwright/test";

const base = "https://shfqrkhn.github.io/LocalFirstApps/";
const pages = [
  ["suite", ""],
  ["ts-dash", "apps/ts-dash/"],
  ["pmquiz", "apps/pmquiz/"],
  ["noodle-nudge", "apps/noodle-nudge/"],
  ["flexx-files", "apps/flexx-files/"],
  ["commonground", "apps/commonground/"]
];

for (const [name, path] of pages) {
  test(`live ${name} page loads without horizontal overflow`, async ({ page }) => {
    page.on("dialog", (dialog) => {
      throw new Error(`Unexpected JavaScript dialog: ${dialog.type()}`);
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("body")).toBeVisible();

    const audit = await page.evaluate(() => ({
      overflowX: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.body.clientWidth
      ),
      sponsor: document.body.innerText.includes("Sponsor") || [...document.querySelectorAll("a[href]")].some((link) => link.href.includes("github.com/sponsors/shfqrkhn"))
    }));

    expect(audit.overflowX).toBe(0);
    expect(audit.sponsor).toBe(true);
  });
}
