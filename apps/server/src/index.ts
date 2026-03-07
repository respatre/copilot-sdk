import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initCopilot, stopCopilot } from "./copilot.js";
import { requireAuth } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { devflowAuthRoutes } from "./routes/devflow-auth.js";
import { githubRoutes } from "./routes/github.js";
import { modelRoutes } from "./routes/models.js";
import { projectRoutes } from "./routes/projects.js";
import { settingsRoutes } from "./routes/settings.js";
import { uploadRoutes } from "./routes/upload.js";
import { startWatcher } from "./watcher.js";
import { broadcast, setupWebSocket } from "./ws.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3001", 10);

async function main(): Promise<void> {
  console.log("[devflow] starting server...");

  // Initialize Copilot SDK
  await initCopilot();
  console.log("[devflow] Copilot SDK initialized");

  const app = express();
  app.use(cors());
  app.use(express.json());

  // DevFlow auth (login route — public)
  app.use("/api/devflow", devflowAuthRoutes());

  // Health check (public — used by deploy pipeline)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  // Serve static frontend (public — auth is handled client-side)
  const staticDir = path.join(__dirname, "../../web/out");
  app.use(express.static(staticDir));

  // Auth middleware — protects all API routes below
  app.use("/api", requireAuth);

  // API routes
  app.use("/api/auth", authRoutes());
  app.use("/api/github", githubRoutes(broadcast));
  app.use("/api/upload", uploadRoutes(broadcast));
  app.use("/api/projects", projectRoutes(broadcast));
  app.use("/api/models", modelRoutes());
  app.use("/api/settings", settingsRoutes());

  // SPA fallback — serves index.html for all non-API routes
  app.get("{*path}", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"), (err) => {
      if (err) res.status(404).json({ error: "Not found" });
    });
  });

  const server = createServer(app);

  // WebSocket
  setupWebSocket(server);

  // File watcher
  startWatcher(broadcast);

  server.listen(PORT, () => {
    console.log(`[devflow] server listening on http://localhost:${PORT}`);
    console.log(`[devflow] WebSocket on ws://localhost:${PORT}/ws`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[devflow] shutting down...");
    await stopCopilot();
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[devflow] fatal error:", err);
  process.exit(1);
});
