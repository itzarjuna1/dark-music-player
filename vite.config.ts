import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { spawn, type ChildProcess } from "child_process";
import { componentTagger } from "lovable-tagger";

/**
 * Auto-starts bot_worker.py alongside the Vite dev/preview server.
 * As soon as `npm run dev` (or `npm run preview`) runs, every cloned bot
 * configured in the Developer Portal is spawned by the supervisor.
 *
 * Skipped on Lovable's hosted sandbox (no python/pyrogram available there)
 * and when `DISABLE_BOT_WORKER=1` is set.
 */
function botWorkerPlugin(): PluginOption {
  let child: ChildProcess | null = null;
  const script = path.resolve(__dirname, "bot_worker.py");

  const shouldSkip = () =>
    process.env.DISABLE_BOT_WORKER === "1" ||
    process.env.LOVABLE_SANDBOX === "1" ||
    !fs.existsSync(script) ||
    !fs.existsSync(path.resolve(__dirname, ".env"));

  const start = () => {
    if (child || shouldSkip()) return;
    const py = process.env.PYTHON_BIN || "python3";
    console.log(`\n[bot-worker] starting ${py} ${script}`);
    child = spawn(py, [script], {
      stdio: "inherit",
      env: process.env,
      cwd: __dirname,
    });
    child.on("exit", (code) => {
      console.log(`[bot-worker] exited (code=${code})`);
      child = null;
    });
    child.on("error", (e) => {
      console.warn(`[bot-worker] failed to spawn: ${e.message}`);
      child = null;
    });
  };

  const stop = () => {
    if (child && !child.killed) {
      console.log("[bot-worker] stopping…");
      child.kill("SIGTERM");
    }
  };

  process.on("exit", stop);
  process.on("SIGINT", () => { stop(); process.exit(0); });
  process.on("SIGTERM", () => { stop(); process.exit(0); });

  return {
    name: "uppermoon-bot-worker",
    apply: () => true,
    configureServer() { start(); },
    configurePreviewServer() { start(); },
    closeBundle() { /* keep running across HMR */ },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    botWorkerPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
