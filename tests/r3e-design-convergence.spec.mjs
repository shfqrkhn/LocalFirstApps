import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const apps = [
  { id: "healthos", path: "apps/healthos/", identity: "dark" },
  { id: "noodle-nudge", path: "apps/noodle-nudge/", identity: "light" },
  { id: "flexx-files", path: "apps/flexx-files/", identity: "dark" }
];
const mime = new Map([
  [".css", "text/css"], [".html", "text/html"], [".js", "text/javascript"],
  [".json", "application/json"], [".png", "image/png"], [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"], [".svg", "image/svg+xml"], [".webmanifest", "application/manifest+json"]
]);
let server;
let baseUrl;

function channel(value) {
  value /= 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function parseColor(value) {
  const text = value.trim();
  if (/^#[\da-f]{6}$/i.test(text)) return [1, 3, 5].map((index) => Number.parseInt(text.slice(index, index + 2), 16));
  const match = text.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (match) return match.slice(1, 4).map(Number);
  throw new Error(`Unsupported test color: ${value}`);
}

function luminance(value) {
  const [red, green, blue] = parseColor(value).map(channel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

async function gotoReady(page, app) {
  await page.goto(`${baseUrl}${app.path}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1:visible").first()).toBeVisible();
  if (app.id === "healthos") await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
  if (app.id === "noodle-nudge") await expect(page.locator("#loader-overlay")).toHaveClass(/is-hidden/);
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

test.afterAll(async () => new Promise((resolve) => server.close(resolve)));

for (const app of apps) {
  test(`${app.id} resolves the CommonGround semantic contract with contrast and preserved identity`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoReady(page, app);
    const audit = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const role = (name) => style.getPropertyValue(name).trim();
      return {
        sheets: [...document.styleSheets].map(({ href }) => href || ""),
        roles: Object.fromEntries([
          "surface", "surface-raised", "text", "text-muted", "accent",
          "accent-contrast", "success", "warning", "danger", "focus"
        ].map((name) => [name, role(`--cg-${name}`)])),
        targets: [...document.querySelectorAll(
          "button, input:not([type=hidden]), select, textarea, a.nav-link, a.navbar-brand, a.sponsor-link, a.lfa-suite-home"
        )].filter((element) => {
          const box = element.getBoundingClientRect();
          const computed = getComputedStyle(element);
          return computed.display !== "none" && computed.visibility !== "hidden" && box.width > 0 && box.height > 0;
        }).map((element) => {
          const box = element.getBoundingClientRect();
          return { name: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 40) || element.tagName, width: box.width, height: box.height };
        }).filter(({ width, height }) => width < 44 || height < 44)
      };
    });
    expect(audit.sheets.some((href) => href.endsWith("/shared/design-primitives.css"))).toBe(true);
    for (const value of Object.values(audit.roles)) expect(value).not.toBe("");
    for (const role of ["text", "text-muted", "accent", "success", "warning", "danger", "focus"]) {
      expect(contrast(audit.roles[role], audit.roles.surface), `${app.id} ${role} contrast`).toBeGreaterThanOrEqual(role === "focus" ? 3 : 4.5);
    }
    expect(contrast(audit.roles.text, audit.roles["surface-raised"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(audit.roles["accent-contrast"], audit.roles.accent)).toBeGreaterThanOrEqual(4.5);
    expect(audit.targets).toEqual([]);
    if (app.identity === "dark") expect(luminance(audit.roles.surface)).toBeLessThan(0.1);
    else expect(luminance(audit.roles.surface)).toBeGreaterThan(0.8);
  });

  test(`${app.id} preserves focus, reduced motion, forced colors, and 200% reflow`, async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    await gotoReady(page, app);
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cg-motion-normal").trim())).toBe("0ms");
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement);
      return { tag: document.activeElement?.tagName, width: Number.parseFloat(style.outlineWidth), kind: style.outlineStyle };
    });
    expect(focus.tag).not.toBe("BODY");
    expect(focus.kind).not.toBe("none");
    expect(focus.width).toBeGreaterThanOrEqual(2);
    // A 320 CSS px viewport is the WCAG reflow equivalent of 200% zoom at 640 px.
    await page.setViewportSize({ width: 320, height: 900 });
    const overflow = await page.evaluate(() => Math.max(
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.body.clientWidth
    ));
    expect(overflow).toBeLessThanOrEqual(2);
  });
}
