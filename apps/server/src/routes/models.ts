import { Router } from "express";
import { getClient } from "../copilot.js";

export function modelRoutes(): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    try {
      const models = await getClient().listModels();
      res.json(models);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
