import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const mime = new Map([[".css", "text/css"], [".html", "text/html"], [".js", "text/javascript"], [".json", "application/json"], [".png", "image/png"], [".svg", "image/svg+xml"], [".webmanifest", "application/manifest+json"]]);
const server = createServer(async (request, response) => {
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
const baseUrl = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}apps/commonground/`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Workspace name").fill("Operations & People");
  await page.getByLabel("Workspace owner").fill("Local owner");
  await page.getByRole("button", { name: "Create Workspace" }).click();
  await page.getByRole("button", { name: "New Matter" }).click();
  await page.getByLabel("Matter title").fill("Unify the operating workflow");
  await page.getByLabel("Matter type").selectOption("decision-analysis");
  await page.getByRole("button", { name: "Create Matter" }).click();
  await page.getByRole("button", { name: "Decision memo" }).click();
  await page.getByLabel("Decision context").selectOption("professional");
  await page.getByLabel("Core question").fill("How should facilitation and decision work share one reliable local workspace?");
  await page.getByLabel("Leading choice").fill("Use one CommonGround matter model with workflow-specific stages.");
  await page.getByLabel("Rationale").fill("Shared storage, recovery, and navigation reduce complexity without mixing domain gates.");
  await page.getByRole("button", { name: "Save Decision Memo" }).click();
  await page.locator(".notice-success").waitFor();
  await page.getByRole("button", { name: "Evidence & assumptions" }).click();
  await page.getByLabel("Type").fill("Architecture review");
  await page.getByLabel("Citation").fill("Local-first consolidation evidence");
  await page.getByRole("button", { name: "Add Evidence" }).click();
  await page.getByRole("button", { name: "Options & matrix" }).click();
  await page.getByLabel("Constraint", { exact: true }).fill("Preserve existing user data and recovery paths.");
  await page.getByRole("button", { name: "Add Hard Constraint" }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Unify the operating workflow/ }).click();
  await page.getByRole("heading", { name: "Unify the operating workflow" }).waitFor();
  await page.screenshot({ path: join(root, "apps", "commonground", "screenshot-app.png"), fullPage: false });

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: join(root, "screenshot.png"), fullPage: false });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
