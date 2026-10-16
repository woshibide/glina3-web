// Local development: Kirby on http://127.0.0.1:8000 (PHP built-in server) plus the Vite dev server for assets.
// Open the Kirby URL; Vite injects hot-reloading assets into it. Ctrl+C stops both.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { createServer } from "vite";

const HOST = "127.0.0.1";
const KIRBY_PORT = 8000;
const VITE_PORT = 5173;

function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = createNetServer()
      .once("error", () => resolve(false))
      .once("listening", () => probe.close(() => resolve(true)))
      .listen(port, HOST);
  });
}

// Check both ports before Vite starts: a second instance must exit without touching the
// running instance's .dev flag file (vite-plugin-kirby deletes it on exit).
for (const port of [KIRBY_PORT, VITE_PORT]) {
  if (!(await portIsFree(port))) {
    console.error(`Port ${port} is already in use. Is another \`npm run dev\` running?`);
    process.exit(1);
  }
}

// Registered before vite-plugin-kirby's own handlers, which call process.exit(signalName) and crash on Node 26.
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    stopping = true;
    process.exit(0);
  });
}
// Kirby serves production assets once this flag file is gone, so remove it synchronously on any exit.
process.on("exit", () => rmSync(".dev", { force: true }));

try {
  const vite = await createServer({ configFile: "vite.config.js" });
  await vite.listen();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const php = spawn("php", ["-S", `${HOST}:${KIRBY_PORT}`, "kirby/router.php"], { stdio: ["ignore", "ignore", "pipe"] });
php.stderr.on("data", (chunk) => {
  // The PHP server logs every request to stderr; only surface warnings and errors.
  for (const line of chunk.toString().split("\n")) {
    if (/PHP (Warning|Fatal|Parse|Notice|Deprecated)|Failed to listen/.test(line)) console.error(line);
  }
});
php.on("exit", (code) => {
  if (stopping) return;
  console.error(`PHP server exited (code ${code}).`);
  process.exit(1);
});
process.on("exit", () => php.kill());

console.log(`\n  Site:  http://${HOST}:${KIRBY_PORT}\n  Panel: http://${HOST}:${KIRBY_PORT}/panel\n`);
