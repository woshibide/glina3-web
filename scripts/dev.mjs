import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";

const HOST = "127.0.0.1";

function portFromEnvironment(name, fallback) {
  const value = process.env[name] ?? String(fallback);
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a port between 1 and 65535.`);
  }
  return port;
}

function checkPort(port) {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once("error", reject);
    probe.listen(port, HOST, () => probe.close(resolve));
  });
}

function startPhp(port) {
  const php = spawn("php", ["-S", `${HOST}:${port}`, "scripts/dev-router.php"], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  process.on("exit", () => php.kill());
  return new Promise((resolve, reject) => {
    php.once("error", reject);
    let listening = false;
    php.stderr.on("data", (chunk) => {
      for (const line of chunk.toString().split("\n")) {
        if (/Development Server .* started/.test(line)) {
          listening = true;
          resolve();
        } else if (/PHP (Warning|Fatal|Parse|Notice|Deprecated)|Failed to listen/.test(line)) {
          console.error(line);
        }
      }
    });
    php.once("exit", (code, signal) => {
      const error = new Error(`PHP server exited (${signal ?? code}).`);
      if (!listening) {
        reject(error);
      } else {
        console.error(error.message);
        process.exit(1);
      }
    });
  });
}

try {
  const phpPort = portFromEnvironment("GLINA_PHP_PORT", 8000);
  const vitePort = portFromEnvironment("GLINA_VITE_PORT", 5173);
  if (phpPort === vitePort) throw new Error("Choose different PHP and Vite ports.");

  const phpVersion = spawnSync("php", ["-r", "echo PHP_VERSION;"], { encoding: "utf8" });
  if (phpVersion.status !== 0 || !/^8\.[2-5]\./.test(phpVersion.stdout)) {
    throw new Error(`Select PHP 8.2–8.5 on PATH (PHP 8.5 recommended). Found: ${phpVersion.stdout || "no working php binary"}.`);
  }
  if (!existsSync("vendor/autoload.php") || !existsSync("kirby/router.php")) {
    throw new Error("Kirby dependencies are missing. Run composer install.");
  }
  if (!existsSync("tool/package.json")) {
    throw new Error("Cup tool is missing. Run git submodule update --init --recursive.");
  }
  if (!existsSync("node_modules/vite/package.json") || !existsSync("node_modules/glina-cup-tool/package.json")) {
    throw new Error("Frontend dependencies are missing. Run npm ci.");
  }
  if (existsSync(".dev")) {
    throw new Error("A Vite dev flag already exists. Stop the running dev server or remove the stale .dev file.");
  }

  for (const port of [phpPort, vitePort]) {
    try {
      await checkPort(port);
    } catch (error) {
      throw new Error(`Cannot bind ${HOST}:${port} (${error.code}).`);
    }
  }

  // Register before the Vite plugin installs its own signal handlers.
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => process.exit(0));
  }
  const { createServer } = await import("vite");
  await startPhp(phpPort);
  process.on("exit", () => rmSync(".dev", { force: true }));
  const vite = await createServer({ server: { port: vitePort } });
  await vite.listen();

  console.log(`\n  Site:  http://${HOST}:${phpPort}\n  Panel: http://${HOST}:${phpPort}/panel\n`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
