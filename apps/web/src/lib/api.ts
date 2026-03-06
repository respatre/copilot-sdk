const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ProjectMeta {
  id: string;
  name: string;
  slug: string;
  sessionId: string;
  model: string;
  createdAt: string;
  directory: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface ModelInfo {
  id: string;
  name: string;
}

export async function fetchProjects(): Promise<ProjectMeta[]> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function createProject(
  name: string,
  model: string,
): Promise<ProjectMeta> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, model }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" });
}

export async function fetchFiles(projectId: string): Promise<FileNode[]> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/files`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchFileContent(
  projectId: string,
  filePath: string,
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/api/projects/${projectId}/files/${filePath}`,
  );
  if (!res.ok) throw new Error("Failed to fetch file");
  return res.text();
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API_BASE}/api/models`);
  if (!res.ok) return [];
  return res.json();
}

export function getWsUrl(): string {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/ws`;
}

// Auth

export interface AuthStatus {
  isAuthenticated: boolean;
  authType?: string;
  login?: string;
  host?: string;
  statusMessage?: string;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/api/auth/status`);
  return res.json();
}

export async function submitToken(token: string): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Failed to authenticate");
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
}
