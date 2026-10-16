import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import kirby from "vite-plugin-kirby";

// Kirby serves the pages (PHP on :8000); Vite serves the assets (:5173 in dev, /dist in production).
// vite-plugin-kirby writes site/config/vite.config.php and the .dev flag file that Kirby reads.
export default defineConfig(({ mode }) => ({
  root: "src",
  base: mode === "development" ? "/" : "/dist/",
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "assets",
    rolldownOptions: {
      input: ["src/main.js", "src/styles/main.css"].map((file) => fileURLToPath(new URL(file, import.meta.url))),
    },
  },
  plugins: [
    vue(),
    kirby({
      watch: ["../site/(templates|snippets|controllers|models|blueprints|config)/**/*.(php|yml)", "../content/**/*"],
    }),
  ],
}));
