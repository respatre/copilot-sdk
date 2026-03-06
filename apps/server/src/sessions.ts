import type { CopilotSession } from "@github/copilot-sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { buildSessionConfig, getClient, wireSessionEvents } from "./copilot.js";
import type { FileNode, ProjectMeta, WsOutgoing } from "./types.js";

const PROJECTS_DIR = path.resolve(process.env.PROJECTS_DIR || "./projects");

// In-memory registry: projectId → session + meta
const registry = new Map<
  string,
  { meta: ProjectMeta; session: CopilotSession }
>();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function createProject(
  name: string,
  model: string,
  broadcast: (msg: WsOutgoing) => void,
): Promise<ProjectMeta> {
  const client = getClient();
  const id = uuidv4();
  const slug = `${slugify(name)}-${id.slice(0, 8)}`;
  const directory = path.join(PROJECTS_DIR, slug);

  await fs.mkdir(directory, { recursive: true });

  const config = buildSessionConfig(directory, model, broadcast);
  const session = await client.createSession(config);

  wireSessionEvents(session, broadcast);

  const meta: ProjectMeta = {
    id,
    name,
    slug,
    sessionId: session.sessionId,
    model,
    createdAt: new Date().toISOString(),
    directory,
  };

  // Persist meta to disk
  await fs.writeFile(
    path.join(directory, ".devflow.json"),
    JSON.stringify(meta, null, 2),
  );

  registry.set(id, { meta, session });
  return meta;
}

export async function resumeProject(
  id: string,
  broadcast: (msg: WsOutgoing) => void,
): Promise<{ meta: ProjectMeta; session: CopilotSession }> {
  const existing = registry.get(id);
  if (existing) return existing;

  // Try to load from disk
  const dirs = await fs.readdir(PROJECTS_DIR).catch(() => []);
  for (const dir of dirs) {
    const metaPath = path.join(PROJECTS_DIR, dir, ".devflow.json");
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      const meta: ProjectMeta = JSON.parse(raw);
      if (meta.id === id) {
        const client = getClient();
        const config = buildSessionConfig(
          meta.directory,
          meta.model,
          broadcast,
        );
        const session = await client.resumeSession(meta.sessionId, config);
        wireSessionEvents(session, broadcast);
        registry.set(id, { meta, session });
        return { meta, session };
      }
    } catch {
      // skip dirs without meta
    }
  }

  throw new Error(`Project ${id} not found`);
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const projects: ProjectMeta[] = [];
  const dirs = await fs.readdir(PROJECTS_DIR).catch(() => []);

  for (const dir of dirs) {
    const metaPath = path.join(PROJECTS_DIR, dir, ".devflow.json");
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      projects.push(JSON.parse(raw));
    } catch {
      // skip
    }
  }

  return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteProject(id: string): Promise<void> {
  const entry = registry.get(id);
  if (entry) {
    await entry.session.disconnect();
    registry.delete(id);
  }

  // Find on disk and delete directory
  const dirs = await fs.readdir(PROJECTS_DIR).catch(() => []);
  for (const dir of dirs) {
    const metaPath = path.join(PROJECTS_DIR, dir, ".devflow.json");
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      const meta: ProjectMeta = JSON.parse(raw);
      if (meta.id === id) {
        await fs.rm(path.join(PROJECTS_DIR, dir), {
          recursive: true,
          force: true,
        });
        return;
      }
    } catch {
      // skip
    }
  }
}

export async function getProjectFiles(id: string): Promise<FileNode[]> {
  const meta = await findMeta(id);
  if (!meta) throw new Error(`Project ${id} not found`);
  return buildFileTree(meta.directory);
}

export async function getFileContent(
  id: string,
  filePath: string,
): Promise<string> {
  const meta = await findMeta(id);
  if (!meta) throw new Error(`Project ${id} not found`);

  // Prevent path traversal
  const resolved = path.resolve(meta.directory, filePath);
  if (!resolved.startsWith(path.resolve(meta.directory))) {
    throw new Error("Access denied: path traversal detected");
  }

  return fs.readFile(resolved, "utf-8");
}

export function getActiveSession(id: string): CopilotSession | undefined {
  return registry.get(id)?.session;
}

export function clearAllSessions(): void {
  registry.clear();
}

// ── Helpers ──

async function findMeta(id: string): Promise<ProjectMeta | null> {
  const cached = registry.get(id);
  if (cached) return cached.meta;

  const dirs = await fs.readdir(PROJECTS_DIR).catch(() => []);
  for (const dir of dirs) {
    try {
      const raw = await fs.readFile(
        path.join(PROJECTS_DIR, dir, ".devflow.json"),
        "utf-8",
      );
      const meta: ProjectMeta = JSON.parse(raw);
      if (meta.id === id) return meta;
    } catch {
      // skip
    }
  }
  return null;
}

async function buildFileTree(
  dir: string,
  relativeTo?: string,
): Promise<FileNode[]> {
  const base = relativeTo ?? dir;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue; // skip hidden files

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: "directory",
        children: await buildFileTree(fullPath, base),
      });
    } else {
      nodes.push({ name: entry.name, path: relPath, type: "file" });
    }
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
