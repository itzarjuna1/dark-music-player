// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { componentTagger } from "file:///home/project/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/home/project";
function botWorkerPlugin() {
  let child = null;
  const script = path.resolve(__vite_injected_original_dirname, "bot_worker.py");
  const shouldSkip = () => process.env.DISABLE_BOT_WORKER === "1" || process.env.LOVABLE_SANDBOX === "1" || !fs.existsSync(script) || !fs.existsSync(path.resolve(__vite_injected_original_dirname, ".env"));
  const start = () => {
    if (child || shouldSkip()) return;
    const py = process.env.PYTHON_BIN || "python3";
    console.log(`
[bot-worker] starting ${py} ${script}`);
    child = spawn(py, [script], {
      stdio: "inherit",
      env: process.env,
      cwd: __vite_injected_original_dirname
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
      console.log("[bot-worker] stopping\u2026");
      child.kill("SIGTERM");
    }
  };
  process.on("exit", stop);
  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stop();
    process.exit(0);
  });
  return {
    name: "uppermoon-bot-worker",
    apply: () => true,
    configureServer() {
      start();
    },
    configurePreviewServer() {
      start();
    },
    closeBundle() {
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    botWorkerPlugin()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIHR5cGUgUGx1Z2luT3B0aW9uIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgc3Bhd24sIHR5cGUgQ2hpbGRQcm9jZXNzIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xuXG4vKipcbiAqIEF1dG8tc3RhcnRzIGJvdF93b3JrZXIucHkgYWxvbmdzaWRlIHRoZSBWaXRlIGRldi9wcmV2aWV3IHNlcnZlci5cbiAqIEFzIHNvb24gYXMgYG5wbSBydW4gZGV2YCAob3IgYG5wbSBydW4gcHJldmlld2ApIHJ1bnMsIGV2ZXJ5IGNsb25lZCBib3RcbiAqIGNvbmZpZ3VyZWQgaW4gdGhlIERldmVsb3BlciBQb3J0YWwgaXMgc3Bhd25lZCBieSB0aGUgc3VwZXJ2aXNvci5cbiAqXG4gKiBTa2lwcGVkIG9uIExvdmFibGUncyBob3N0ZWQgc2FuZGJveCAobm8gcHl0aG9uL3B5cm9ncmFtIGF2YWlsYWJsZSB0aGVyZSlcbiAqIGFuZCB3aGVuIGBESVNBQkxFX0JPVF9XT1JLRVI9MWAgaXMgc2V0LlxuICovXG5mdW5jdGlvbiBib3RXb3JrZXJQbHVnaW4oKTogUGx1Z2luT3B0aW9uIHtcbiAgbGV0IGNoaWxkOiBDaGlsZFByb2Nlc3MgfCBudWxsID0gbnVsbDtcbiAgY29uc3Qgc2NyaXB0ID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJib3Rfd29ya2VyLnB5XCIpO1xuXG4gIGNvbnN0IHNob3VsZFNraXAgPSAoKSA9PlxuICAgIHByb2Nlc3MuZW52LkRJU0FCTEVfQk9UX1dPUktFUiA9PT0gXCIxXCIgfHxcbiAgICBwcm9jZXNzLmVudi5MT1ZBQkxFX1NBTkRCT1ggPT09IFwiMVwiIHx8XG4gICAgIWZzLmV4aXN0c1N5bmMoc2NyaXB0KSB8fFxuICAgICFmcy5leGlzdHNTeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLmVudlwiKSk7XG5cbiAgY29uc3Qgc3RhcnQgPSAoKSA9PiB7XG4gICAgaWYgKGNoaWxkIHx8IHNob3VsZFNraXAoKSkgcmV0dXJuO1xuICAgIGNvbnN0IHB5ID0gcHJvY2Vzcy5lbnYuUFlUSE9OX0JJTiB8fCBcInB5dGhvbjNcIjtcbiAgICBjb25zb2xlLmxvZyhgXFxuW2JvdC13b3JrZXJdIHN0YXJ0aW5nICR7cHl9ICR7c2NyaXB0fWApO1xuICAgIGNoaWxkID0gc3Bhd24ocHksIFtzY3JpcHRdLCB7XG4gICAgICBzdGRpbzogXCJpbmhlcml0XCIsXG4gICAgICBlbnY6IHByb2Nlc3MuZW52LFxuICAgICAgY3dkOiBfX2Rpcm5hbWUsXG4gICAgfSk7XG4gICAgY2hpbGQub24oXCJleGl0XCIsIChjb2RlKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZyhgW2JvdC13b3JrZXJdIGV4aXRlZCAoY29kZT0ke2NvZGV9KWApO1xuICAgICAgY2hpbGQgPSBudWxsO1xuICAgIH0pO1xuICAgIGNoaWxkLm9uKFwiZXJyb3JcIiwgKGUpID0+IHtcbiAgICAgIGNvbnNvbGUud2FybihgW2JvdC13b3JrZXJdIGZhaWxlZCB0byBzcGF3bjogJHtlLm1lc3NhZ2V9YCk7XG4gICAgICBjaGlsZCA9IG51bGw7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3Qgc3RvcCA9ICgpID0+IHtcbiAgICBpZiAoY2hpbGQgJiYgIWNoaWxkLmtpbGxlZCkge1xuICAgICAgY29uc29sZS5sb2coXCJbYm90LXdvcmtlcl0gc3RvcHBpbmdcdTIwMjZcIik7XG4gICAgICBjaGlsZC5raWxsKFwiU0lHVEVSTVwiKTtcbiAgICB9XG4gIH07XG5cbiAgcHJvY2Vzcy5vbihcImV4aXRcIiwgc3RvcCk7XG4gIHByb2Nlc3Mub24oXCJTSUdJTlRcIiwgKCkgPT4geyBzdG9wKCk7IHByb2Nlc3MuZXhpdCgwKTsgfSk7XG4gIHByb2Nlc3Mub24oXCJTSUdURVJNXCIsICgpID0+IHsgc3RvcCgpOyBwcm9jZXNzLmV4aXQoMCk7IH0pO1xuXG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJ1cHBlcm1vb24tYm90LXdvcmtlclwiLFxuICAgIGFwcGx5OiAoKSA9PiB0cnVlLFxuICAgIGNvbmZpZ3VyZVNlcnZlcigpIHsgc3RhcnQoKTsgfSxcbiAgICBjb25maWd1cmVQcmV2aWV3U2VydmVyKCkgeyBzdGFydCgpOyB9LFxuICAgIGNsb3NlQnVuZGxlKCkgeyAvKiBrZWVwIHJ1bm5pbmcgYWNyb3NzIEhNUiAqLyB9LFxuICB9O1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCI6OlwiLFxuICAgIHBvcnQ6IDgwODAsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcbiAgICBib3RXb3JrZXJQbHVnaW4oKSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rp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
