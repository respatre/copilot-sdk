import { Router } from "express";
import {
  createProject,
  deleteProject,
  getFileContent,
  getProjectFiles,
  listProjects,
} from "../sessions.js";
import type { WsOutgoing } from "../types.js";

export function projectRoutes(broadcast: (msg: WsOutgoing) => void): Router {
  const router = Router();

  // List projects
  router.get("/", async (_req, res) => {
    try {
      const projects = await listProjects();
      res.json(projects);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Create project
  router.post("/", async (req, res) => {
    const { name, model, provider } = req.body as {
      name?: string;
      model?: string;
      provider?: string;
    };
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    try {
      const meta = await createProject(
        name,
        model || "gpt-4.1",
        broadcast,
        provider,
      );
      res.status(201).json(meta);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Delete project
  router.delete("/:id", async (req, res) => {
    try {
      await deleteProject(req.params.id);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // List files
  router.get("/:id/files", async (req, res) => {
    try {
      const files = await getProjectFiles(req.params.id);
      res.json(files);
    } catch (err) {
      res.status(404).json({ error: String(err) });
    }
  });

  // Read file content
  router.get("/:id/files/{*path}", async (req, res) => {
    try {
      const params = req.params as unknown as { id: string; path: string[] };
      const filePath = Array.isArray(params.path)
        ? params.path.join("/")
        : String(params.path);
      const content = await getFileContent(params.id, filePath);
      res.type("text/plain").send(content);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("path traversal")) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      res.status(404).json({ error: msg });
    }
  });

  return router;
}
