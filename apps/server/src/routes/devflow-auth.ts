import { Router } from "express";
import { isAuthEnabled, login } from "../middleware/auth.js";

export function devflowAuthRoutes(): Router {
  const router = Router();

  // POST /api/devflow/login
  router.post("/login", (req, res) => {
    if (!isAuthEnabled()) {
      res.json({ token: "none", authEnabled: false });
      return;
    }

    const { user, password } = req.body as {
      user?: string;
      password?: string;
    };

    if (!user || !password) {
      res.status(400).json({ error: "user and password required" });
      return;
    }

    const result = login(user, password);
    if (!result) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    res.json({ token: result.token, authEnabled: true });
  });

  // GET /api/devflow/auth-status
  router.get("/auth-status", (_req, res) => {
    res.json({ authEnabled: isAuthEnabled() });
  });

  return router;
}
