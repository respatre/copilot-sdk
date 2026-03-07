const API_BASE = "";

// ── Auth token management ──

const TOKEN_KEY = "devflow_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (token && token !== "none") {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/** Fetch with auth headers. Redirects to login on 401. */
async function authedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = { ...authHeaders(), ...init?.headers };
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.location.href = "/";
  }
  return res;
}

// ── DevFlow login ──

export async function devflowLogin(
  user: string,
  password: string,
): Promise<{ token: string; authEnabled: boolean }> {
  const res = await fetch(`${API_BASE}/api/devflow/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  if (data.token) storeToken(data.token);
  return data;
}

export async function checkDevflowAuth(): Promise<{
  authEnabled: boolean;
  loggedIn: boolean;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/devflow/auth-status`);
    const data = await res.json();
    if (!data.authEnabled) return { authEnabled: false, loggedIn: true };
    // Check if stored token is valid
    const token = getStoredToken();
    if (!token) return { authEnabled: true, loggedIn: false };
    const check = await fetch(`${API_BASE}/api/health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { authEnabled: true, loggedIn: check.ok };
  } catch {
    return { authEnabled: false, loggedIn: false };
  }
}

export interface ProjectMeta {
  id: string;
  name: string;
  slug: string;
  sessionId: string;
  model: string;
  provider?: string;
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
  const res = await authedFetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function createProject(
  name: string,
  model: string,
  provider?: string,
): Promise<ProjectMeta> {
  const res = await authedFetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, model, provider }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  await authedFetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" });
}

export async function fetchFiles(projectId: string): Promise<FileNode[]> {
  const res = await authedFetch(`${API_BASE}/api/projects/${projectId}/files`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchFileContent(
  projectId: string,
  filePath: string,
): Promise<string> {
  const res = await authedFetch(
    `${API_BASE}/api/projects/${projectId}/files/${filePath}`,
  );
  if (!res.ok) throw new Error("Failed to fetch file");
  return res.text();
}

export async function fetchModels(provider?: string): Promise<ModelInfo[]> {
  const qs = provider ? `?provider=${provider}` : "";
  const res = await authedFetch(`${API_BASE}/api/models${qs}`);
  if (!res.ok) return [];
  return res.json();
}

// getWsUrl removed — WS URL is now built at runtime in useChat.ts

// Auth

export interface AuthStatus {
  isAuthenticated: boolean;
  authType?: string;
  login?: string;
  host?: string;
  statusMessage?: string;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await authedFetch(`${API_BASE}/api/auth/status`);
  return res.json();
}

export async function submitToken(token: string): Promise<AuthStatus> {
  const res = await authedFetch(`${API_BASE}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error("Failed to authenticate");
  return res.json();
}

export async function logout(): Promise<void> {
  await authedFetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
}

// ── GitHub OAuth ──

export interface GitHubConnectionStatus {
  connected: boolean;
  user?: {
    login: string;
    avatar_url: string;
    name: string | null;
    html_url: string;
  };
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  updated_at: string;
}

export async function fetchGitHubStatus(): Promise<GitHubConnectionStatus> {
  const res = await authedFetch(`${API_BASE}/api/github/status`);
  return res.json();
}

export async function startGitHubOAuth(): Promise<{ url: string }> {
  const res = await authedFetch(`${API_BASE}/api/github/oauth/start`);
  if (!res.ok) throw new Error("Failed to start OAuth");
  return res.json();
}

export async function disconnectGitHub(): Promise<void> {
  await authedFetch(`${API_BASE}/api/github/disconnect`, { method: "POST" });
}

export async function fetchGitHubRepos(
  page = 1,
  sort = "updated",
): Promise<GitHubRepo[]> {
  const res = await authedFetch(
    `${API_BASE}/api/github/repos?page=${page}&sort=${sort}`,
  );
  if (!res.ok) return [];
  return res.json();
}

export async function cloneGitHubRepo(
  repoFullName: string,
  branch?: string,
): Promise<ProjectMeta> {
  const res = await authedFetch(`${API_BASE}/api/github/clone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoFullName, branch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Clone failed" }));
    throw new Error(err.error || "Clone failed");
  }
  return res.json();
}

// ── Upload ──

export async function uploadZip(
  file: File,
  name?: string,
): Promise<ProjectMeta> {
  const form = new FormData();
  form.append("file", file);
  if (name) form.append("name", name);

  const res = await authedFetch(`${API_BASE}/api/upload/zip`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

export async function uploadFiles(
  files: FileList | File[],
  name: string,
  paths?: string[],
): Promise<ProjectMeta> {
  const form = new FormData();
  form.append("name", name);

  const fileArray = Array.from(files);
  for (let i = 0; i < fileArray.length; i++) {
    form.append("files", fileArray[i]);
    if (paths && paths[i]) {
      form.append(`paths[${i}]`, paths[i]);
    }
  }

  const res = await authedFetch(`${API_BASE}/api/upload/files`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error || "Upload failed");
  }
  return res.json();
}

// ── Settings / Providers ──

export interface ProviderConfig {
  type: "openai" | "azure" | "anthropic";
  label: string;
  baseUrl?: string;
  apiKey?: string;
  wireApi?: "completions" | "responses";
}

export interface AppSettings {
  defaultProvider: string;
  providers: Record<string, ProviderConfig>;
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await authedFetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function saveSettings(
  settings: Partial<AppSettings>,
): Promise<void> {
  const res = await authedFetch(`${API_BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save settings");
}

export async function testProvider(
  name: string,
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const res = await authedFetch(
    `${API_BASE}/api/settings/providers/${encodeURIComponent(name)}/test`,
    { method: "POST" },
  );
  return res.json();
}

export async function addProvider(
  name: string,
  config: ProviderConfig,
): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/api/settings/providers/${encodeURIComponent(name)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    },
  );
  if (!res.ok) throw new Error("Failed to add provider");
}

export async function removeProvider(name: string): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/api/settings/providers/${encodeURIComponent(name)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to remove provider");
}

export async function fetchProviderModels(
  providerName: string,
): Promise<ModelInfo[]> {
  const res = await authedFetch(
    `${API_BASE}/api/settings/providers/${encodeURIComponent(providerName)}/models`,
  );
  if (!res.ok) return [];
  return res.json();
}
