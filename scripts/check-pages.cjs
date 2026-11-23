const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFile } = require("node:fs/promises");
const { createServer } = require("node:http");
const { extname, join } = require("node:path");
const { chromium } = require("playwright");

const types = new Map([
  [".html", "text/html"], [".js", "text/javascript"], [".css", "text/css"],
  [".svg", "image/svg+xml"], [".woff2", "font/woff2"],
]);
const artifact = join(__dirname, "../pages-dist");

async function checkSite(browser, site) {
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("requestfailed", (request) => failures.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });

  for (const slug of ["", "about/", "collaborate/", "careers/"]) {
    assert.equal((await page.goto(site + slug)).status(), 200);
    await page.locator(".board h1").waitFor();
    if (slug !== "") {
      const active = await page.locator('nav a[aria-current="page"]').getAttribute("href");
      assert.equal(active.replace(/\/$/, "") + "/", site + slug);
    }
  }

  assert.equal((await page.goto(site + "coming-soon/")).status(), 200);
  await page.locator(".coming-soon-cup.is-ready").waitFor({ timeout: 60_000 });
  assert.deepEqual(failures, []);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const canvas = page.locator(".coming-soon-cup.is-ready");
  await canvas.waitFor({ timeout: 60_000 });
  // Wait until the ready fade has finished before comparing the canvas frames.
  await canvas.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  const first = await canvas.screenshot({ animations: "disabled" });
  await page.waitForTimeout(300);
  assert.deepEqual(await canvas.screenshot({ animations: "disabled" }), first);
  assert.deepEqual(failures, []);
  await page.close();

  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...options) {
      return type.includes("webgl") ? null : getContext.call(this, type, ...options);
    };
  });
  await fallback.goto(site + "coming-soon/");
  assert.equal(await fallback.locator(".coming-soon-cup.is-ready").count(), 0);
  assert.ok(await fallback.locator("main h1").isVisible());
  assert.ok(await fallback.locator('a[href^="mailto:"]').isVisible());
  await fallback.close();

  for (const slug of ["missing/", "panel/", "api/"]) {
    const response = await fetch(site + slug);
    assert.equal(response.status, 404);
    assert.match(await response.text(), /noindex/);
  }
}

async function main() {
  let prefix = "/";
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const path = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
    let file = path.endsWith("/") || path === "" ? path + "index.html" : path;
    let status = 200;
    let body;
    try {
      if (!pathname.startsWith(prefix) || path.split("/").includes("..")) throw new Error("Missing path.");
      body = await readFile(join(artifact, file));
    } catch {
      status = 404;
      file = "404.html";
      body = await readFile(join(artifact, file));
    }
    response.writeHead(status, { "Content-Type": types.get(extname(file)) ?? "application/octet-stream" });
    response.end(body);
  });
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));

  try {
    const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    try {
      for (prefix of ["/", "/glina3-web/"]) {
        const site = `http://127.0.0.1:${server.address().port}${prefix}`;
        execFileSync("composer", ["build"], { env: { ...process.env, SITE_URL: site }, stdio: "inherit" });
        await checkSite(browser, site);
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
