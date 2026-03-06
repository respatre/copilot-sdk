import { Router } from "express";
import { getClient, initCopilot, stopCopilot } from "../copilot.js";
import { clearAllSessions } from "../sessions.js";

export function authRoutes(): Router {
  const router = Router();

  // Get auth status
  router.get("/status", async (_req, res) => {
    try {
      const client = getClient();
      const status = await client.getAuthStatus();
      res.json(status);
    } catch (err) {
      res.json({ isAuthenticated: false, statusMessage: String(err) });
    }
  });

  // Set token and restart client
  router.post("/token", async (req, res) => {
    const { token } = req.body as { token?: string };
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "token is required" });
      return;
    }

    try {
      // Stop current client and clear stale sessions
      await stopCopilot();
      clearAllSessions();

      // Set env and reinitialize
      process.env.GITHUB_TOKEN = token;
      await initCopilot();

      const client = getClient();
      const status = await client.getAuthStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: String(err), isAuthenticated: false });
    }
  });

  // Logout: clear token and restart with default auth
  router.post("/logout", async (_req, res) => {
    try {
      await stopCopilot();
      clearAllSessions();
      delete process.env.GITHUB_TOKEN;
      await initCopilot();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
