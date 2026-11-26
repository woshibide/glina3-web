const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFile, readdir } = require("node:fs/promises");
const { createServer } = require("node:http");
const { extname, join } = require("node:path");
const { chromium } = require("playwright");

const types = new Map([
  [".html", "text/html"], [".js", "text/javascript"], [".css", "text/css"],
  [".png", "image/png"], [".svg", "image/svg+xml"], [".woff2", "font/woff2"],
]);
const artifact = join(__dirname, "../pages-dist");

// Hold the artwork so the notice and counter can be checked during loading.
async function checkDrawing(browser, url) {
  const drawings = (await readdir(join(artifact, "dist/assets"))).filter(name => /^(?:[1-4]-|cup-template-).*\.png$/.test(name));
  assert.equal(drawings.length, 1);
  assert.match(drawings[0], /^2-/);
  const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 900, height: 640 } });
  const png = /\/assets\/2-[^/]+\.png$/;
  const requested = page.waitForRequest(png);
  let resume;
  const gate = new Promise((resolve) => { resume = resolve; });
  await page.route(png, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await requested;
    const counter = page.getByRole("progressbar");
    assert.equal(await counter.getAttribute("aria-valuenow"), "0");
    assert.equal(await counter.evaluate((node) => getComputedStyle(node).backgroundColor), "rgba(0, 0, 0, 0)");
    for (const viewport of [
      { width: 390, height: 844 }, { width: 320, height: 480 },
      { width: 568, height: 320 }, { width: 900, height: 640 },
    ]) {
      await page.setViewportSize(viewport);
      await page.locator('a[href^="mailto:"]').click({ trial: true });
      const number = await counter.locator("span").boundingBox();
      const percent = await counter.locator("small").boundingBox();
      const card = await page.locator(".coming-soon .tile").boundingBox();
      assert.ok(Math.abs(number.y + number.height / 2 - viewport.height / 2) < 2);
      assert.ok(Math.abs((number.x + percent.x + percent.width) / 2 - viewport.width / 2) < 2);
      assert.ok(card.x + card.width <= number.x || card.y + card.height <= number.y,
        `Notice covers progress at ${viewport.width}x${viewport.height}`);
    }
    await counter.evaluate((node) => {
      window.cupProgress = [0];
      new MutationObserver(() => window.cupProgress.push(Number(node.getAttribute("aria-valuenow"))))
        .observe(node, { attributes: true, attributeFilter: ["aria-valuenow"] });
    });
    resume();
    const canvas = page.locator(".coming-soon-cup.is-ready");
    await canvas.waitFor({ timeout: 60_000 });
    await counter.waitFor({ state: "hidden" });
    const values = await page.evaluate(() => window.cupProgress);
    assert.ok(values.some((n) => n > 0 && n < 100));
    assert.deepEqual(values, [...values].sort((a, b) => a - b));
    assert.equal(values.at(-1), 100);
  } finally {
    resume();
    await page.close();
  }
}

async function checkFallbacks(browser, url) {
  for (const failure of ["javascript", "webgl", "worker", "artwork"]) {
    const page = await browser.newPage({
      javaScriptEnabled: failure !== "javascript", viewport: { width: 390, height: 844 },
    });
    let settled;
    if (failure === "webgl") {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...options) {
          return type.includes("webgl") ? null : original.call(this, type, ...options);
        };
      });
      settled = page.waitForEvent("console", (message) => message.type() === "error");
    }
    if (failure === "worker") {
      await page.addInitScript(() => {
        window.Worker = class {
          constructor() { throw new Error("Worker unavailable in test"); }
        };
      });
      settled = page.waitForEvent("console", (message) => message.text().includes("Worker unavailable in test"));
    }
    if (failure === "artwork") {
      const file = /\.png$/;
      await page.route(file, (route) => route.abort());
      settled = page.waitForRequest(file);
    }
    await page.goto(url);
    await settled;
    if (failure === "artwork") {
      await page.locator(".coming-soon-cup.is-ready").waitFor({ timeout: 60_000 });
    } else {
      assert.equal(await page.locator(".coming-soon-cup.is-ready").count(), 0);
    }
    await page.locator(".cup-loader").waitFor({ state: "hidden" });
    await page.locator('a[href^="mailto:"]').click({ trial: true });
    await page.close();
  }
}

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

  await checkDrawing(browser, site + "coming-soon/");
  await checkFallbacks(browser, site + "coming-soon/");

  for (const slug of ["missing/", "panel/", "api/"]) {
    const response = await fetch(site + slug);
    assert.equal(response.status, 404);
    assert.match(await response.text(), /noindex/);
  }
}

async function main() {
  if (process.argv[2]) {
    const url = new URL(process.argv[2]);
    const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    try {
      const page = await browser.newPage();
      const drawing = page.waitForResponse((res) => /\/artwork\/2\.png$/.test(new URL(res.url()).pathname)
        && res.request().resourceType() === "fetch");
      await page.goto(url.href);
      const response = await drawing;
      assert.ok(response.ok());
      assert.notEqual(new URL(response.url()).origin, url.origin);
      await page.locator(".coming-soon-cup.is-ready").waitFor({ timeout: 60_000 });
      assert.equal(await page.locator(".cup-loader").getAttribute("aria-valuenow"), "100");
      await page.locator('a[href^="mailto:"]').click({ trial: true });
    } finally {
      await browser.close();
    }
    return;
  }
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
