import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const routes = ['/', '/apps/commonground/', '/apps/healthos/', '/apps/ts-dash/', '/apps/pmquiz/', '/apps/noodle-nudge/', '/apps/flexx-files/'];
const mime = new Map([
  ['.css', 'text/css'], ['.html', 'text/html'], ['.js', 'text/javascript'], ['.json', 'application/json'],
  ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json']
]);
let server;
let baseUrl;

test.beforeAll(async () => {
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      const raw = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
      const file = normalize(join(root, decodeURIComponent(raw)));
      if (!file.startsWith(normalize(root))) return response.writeHead(403).end('Forbidden');
      response.writeHead(200, { 'content-type': mime.get(extname(file)) || 'application/octet-stream' });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => new Promise(resolve => server.close(resolve)));

for (const route of routes) {
  test(`${route} has an operable semantic baseline`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1').first()).toBeVisible();
    const defects = await page.locator('button, input, select, textarea').evaluateAll(controls => controls
      .filter(control => {
        if (control.type === 'hidden' || control.hidden) return false;
        const labels = control.labels ? [...control.labels].map(label => label.textContent).join(' ') : '';
        return !(control.getAttribute('aria-label') || control.getAttribute('aria-labelledby') || labels.trim() || control.textContent.trim() || control.title);
      })
      .map(control => `${control.tagName.toLowerCase()}#${control.id || '(no-id)'}`));
    expect(defects, `Unnamed controls at ${route}`).toEqual([]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `Horizontal overflow at ${route}`).toBeLessThanOrEqual(2);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
  });
}
