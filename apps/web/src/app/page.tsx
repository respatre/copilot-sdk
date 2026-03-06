"use client";

import { Github, LogOut, Plus, Settings, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NewProjectModal from "../components/NewProjectModal";
import ProjectCard from "../components/ProjectCard";
import {
  type AppSettings,
  type AuthStatus,
  createProject,
  deleteProject,
  fetchAuthStatus,
  fetchModels,
  fetchProjects,
  fetchSettings,
  logout,
  type ModelInfo,
  type ProjectMeta,
  submitToken,
} from "../lib/api";

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth state
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Check auth on mount
  useEffect(() => {
    fetchAuthStatus()
      .then((s) => setAuth(s))
      .catch(() => setAuth({ isAuthenticated: false }));
  }, []);

  // Load data after authenticated
  useEffect(() => {
    if (!auth?.isAuthenticated) return;
    Promise.all([
      fetchProjects()
        .then(setProjects)
        .catch(() => {}),
      fetchModels()
        .then(setModels)
        .catch(() => {}),
      fetchSettings()
        .then(setSettings)
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [auth?.isAuthenticated]);

  const handleLogin = async () => {
    if (!tokenInput.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const status = await submitToken(tokenInput.trim());
      if (status.isAuthenticated) {
        setAuth(status);
        setTokenInput("");
      } else {
        setAuthError(status.statusMessage || "Authentication failed");
      }
    } catch {
      setAuthError("Could not connect to server");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuth({ isAuthenticated: false });
    setProjects([]);
    setModels([]);
  };

  const handleCreateBlank = async (
    name: string,
    model: string,
    provider?: string,
  ) => {
    try {
      const project = await createProject(name, model, provider);
      router.push(`/workspace?id=${project.id}`);
    } catch (err) {
      alert("Failed to create project: " + String(err));
    }
  };

  const handleProjectCreated = (project: ProjectMeta) => {
    setShowNew(false);
    router.push(`/workspace?id=${project.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ─── Login Screen ─── */}
      {auth && !auth.isAuthenticated ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
          {/* Floating orbs */}
          <div className="orb orb-purple" />
          <div className="orb orb-blue" />
          <div className="orb orb-red" />

          <div className="w-full max-w-sm space-y-8 relative z-10">
            {/* Logo + title */}
            <div className="text-center space-y-3">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    background: "var(--gradient-main)",
                    animation: "spin-slow 6s linear infinite",
                  }}
                />
                <Zap
                  size={28}
                  className="relative"
                  style={{ color: "var(--purple-400)" }}
                />
              </div>
              <h1 className="text-3xl font-bold gradient-text">DevFlow</h1>
              <p style={{ color: "var(--text-secondary)" }} className="text-sm">
                Sign in with your GitHub account to start building
              </p>
            </div>

            {/* Login form (glassmorphic) */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <div>
                <label
                  className="text-xs block mb-1.5 font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="github_pat_xxxxxxxxxxxx"
                  className="w-full input-orbe px-4 py-3 text-sm outline-none font-mono"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>

              {authError && (
                <p className="text-xs" style={{ color: "var(--red-500)" }}>
                  {authError}
                </p>
              )}

              <button
                onClick={handleLogin}
                disabled={!tokenInput.trim() || authLoading}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 gradient-btn disabled:opacity-40 disabled:pointer-events-none"
              >
                <Github size={16} />
                {authLoading ? "Connecting..." : "Sign in with Token"}
              </button>
            </div>

            <p
              className="text-[11px] text-center leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Create a token at GitHub → Settings → Developer settings →
              Personal access tokens. Needs{" "}
              <strong style={{ color: "var(--text-secondary)" }}>
                copilot
              </strong>{" "}
              scope.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── Header ─── */}
          <header className="glass-header sticky top-0 z-40 px-4 pt-12 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Zap size={22} style={{ color: "var(--purple-400)" }} />
                <h1 className="text-xl font-bold gradient-text">DevFlow</h1>
              </div>
              {auth?.login && (
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {auth.login}
                  </span>
                  <button
                    onClick={() => router.push("/settings")}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    title="Settings"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    title="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Build software with natural language
            </p>
          </header>

          {/* ─── Project list ─── */}
          <main className="flex-1 px-4 pb-24 space-y-3 mt-2">
            {loading ? (
              <div
                className="text-sm text-center mt-12"
                style={{ color: "var(--text-muted)" }}
              >
                Loading projects...
              </div>
            ) : projects.length === 0 && !showNew ? (
              <div className="text-center mt-16 space-y-4">
                <p style={{ color: "var(--text-muted)" }}>No projects yet</p>
                <button
                  onClick={() => setShowNew(true)}
                  className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white gradient-btn"
                >
                  Create your first project
                </button>
              </div>
            ) : (
              projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={(id) => router.push(`/workspace?id=${id}`)}
                  onDelete={handleDelete}
                />
              ))
            )}
          </main>

          {/* ─── New project modal ─── */}
          {showNew && (
            <NewProjectModal
              models={models}
              defaultModel={models[0]?.id || "gpt-4.1"}
              settings={settings}
              onCreated={handleProjectCreated}
              onCancel={() => setShowNew(false)}
              onCreateBlank={handleCreateBlank}
            />
          )}

          {/* ─── FAB ─── */}
          {!showNew && (
            <button
              onClick={() => setShowNew(true)}
              className="fixed bottom-6 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform z-40 gradient-btn"
              style={{ boxShadow: "0 8px 30px rgba(168, 85, 247, 0.35)" }}
            >
              <Plus size={24} className="text-white" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
