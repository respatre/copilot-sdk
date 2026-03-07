import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

const PROJECTS_DIR = path.resolve(process.env.PROJECTS_DIR || "./projects");

export interface AgentNode {
  id: string;
  role: string;
  name: string;
  prompt: string;
  position: { x: number; y: number };
  connections: string[];
}

function agentsFilePath(projectId: string, projectDir: string): string {
  return path.join(projectDir, ".devflow-agents.json");
}

async function findProjectDir(projectId: string): Promise<string | null> {
  const dirs = await fs.readdir(PROJECTS_DIR).catch(() => []);
  for (const dir of dirs) {
    const metaPath = path.join(PROJECTS_DIR, dir, ".devflow.json");
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      const meta = JSON.parse(raw);
      if (meta.id === projectId) return path.join(PROJECTS_DIR, dir);
    } catch {
      // skip
    }
  }
  return null;
}

export function agentRoutes(): Router {
  const router = Router();

  // GET /api/projects/:id/agents — list agents for a project
  router.get("/:id/agents", async (req, res) => {
    try {
      const dir = await findProjectDir(req.params.id);
      if (!dir) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      const filePath = agentsFilePath(req.params.id, dir);
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        res.json(JSON.parse(raw));
      } catch {
        res.json([]);
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // PUT /api/projects/:id/agents — save all agents (full replace)
  router.put("/:id/agents", async (req, res) => {
    try {
      const dir = await findProjectDir(req.params.id);
      if (!dir) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      const agents: AgentNode[] = req.body;
      if (!Array.isArray(agents)) {
        res.status(400).json({ error: "Body must be an array of agents" });
        return;
      }
      const filePath = agentsFilePath(req.params.id, dir);
      await fs.writeFile(filePath, JSON.stringify(agents, null, 2));
      res.json({ ok: true, count: agents.length });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/projects/:id/agents — add a single agent
  router.post("/:id/agents", async (req, res) => {
    try {
      const dir = await findProjectDir(req.params.id);
      if (!dir) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      const { role, name, prompt, position, connections } = req.body;
      if (!role || !name) {
        res.status(400).json({ error: "role and name are required" });
        return;
      }
      const filePath = agentsFilePath(req.params.id, dir);
      let agents: AgentNode[] = [];
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        agents = JSON.parse(raw);
      } catch {
        // fresh
      }
      const newAgent: AgentNode = {
        id: uuidv4(),
        role,
        name,
        prompt: prompt || "",
        position: position || { x: 40, y: 60 },
        connections: connections || [],
      };
      agents.push(newAgent);
      await fs.writeFile(filePath, JSON.stringify(agents, null, 2));
      res.status(201).json(newAgent);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // DELETE /api/projects/:id/agents/:agentId
  router.delete("/:id/agents/:agentId", async (req, res) => {
    try {
      const dir = await findProjectDir(req.params.id);
      if (!dir) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      const filePath = agentsFilePath(req.params.id, dir);
      let agents: AgentNode[] = [];
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        agents = JSON.parse(raw);
      } catch {
        res.status(404).json({ error: "No agents found" });
        return;
      }
      const filtered = agents
        .filter((a) => a.id !== req.params.agentId)
        .map((a) => ({
          ...a,
          connections: a.connections.filter((c) => c !== req.params.agentId),
        }));
      await fs.writeFile(filePath, JSON.stringify(filtered, null, 2));
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
