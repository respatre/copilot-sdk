"use client";

import { LogOut, Plus, Settings, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NewProjectModal from "../components/NewProjectModal";
import ProjectCard from "../components/ProjectCard";
import { SkeletonProjectCard } from "../components/Skeleton";
import {
  type AppSettings,
  checkDevflowAuth,
  clearToken,
  createProject,
  deleteProject,
  devflowLogin,
  fetchModels,
  fetchProjects,
  fetchSettings,
  type ModelInfo,
  type ProjectMeta,
} from "../lib/api";

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth state
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [userInput, setUserInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Check auth on mount
  useEffect(() => {
    checkDevflowAuth().then((s) => {
      if (!s.authEnabled || s.loggedIn) {
        setLoggedIn(true);
      } else {
        setLoggedIn(false);
      }
    });
  }, []);

  // Load data after authenticated
  useEffect(() => {
    if (!loggedIn) return;
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
  }, [loggedIn]);

  const handleLogin = async () => {
    if (!userInput.trim() || !passInput.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      await devflowLogin(userInput.trim(), passInput.trim());
      setLoggedIn(true);
    } catch (err) {
      setAuthError(String(err).replace("Error: ", ""));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setLoggedIn(false);
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
      alert("Error al crear proyecto: " + String(err));
    }
  };

  const handleProjectCreated = (project: ProjectMeta) => {
    setShowNew(false);
    router.push(`/workspace?id=${project.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este proyecto?")) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ─── Login Screen ─── */}
      {loggedIn === false ? (
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
                Inicia sesión para empezar a construir
              </p>
            </div>

            {/* Login form (glassmorphic) */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <div>
                <label
                  className="text-xs block mb-1.5 font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Usuario
                </label>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full input-orbe px-4 py-3 text-sm outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label
                  className="text-xs block mb-1.5 font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Contraseña
                </label>
                <input
                  type="password"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full input-orbe px-4 py-3 text-sm outline-none"
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
                disabled={!userInput.trim() || !passInput.trim() || authLoading}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 gradient-btn disabled:opacity-40 disabled:pointer-events-none"
              >
                <Zap size={16} />
                {authLoading ? "Conectando..." : "Iniciar sesión"}
              </button>
            </div>
          </div>
        </div>
      ) : loggedIn ? (
        <>
          {/* ─── Header ─── */}
          <header className="glass-header sticky top-0 z-40 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Zap size={22} style={{ color: "var(--purple-400)" }} />
                <h1 className="text-xl font-bold gradient-text">DevFlow</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/settings")}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Ajustes"
                >
                  <Settings size={14} />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Construye software con lenguaje natural
            </p>
          </header>

          {/* ─── Project list ─── */}
          <main className="flex-1 px-4 pb-24 space-y-3 mt-2">
            {loading ? (
              <div className="space-y-3 mt-2">
                <SkeletonProjectCard />
                <SkeletonProjectCard />
                <SkeletonProjectCard />
              </div>
            ) : projects.length === 0 && !showNew ? (
              <div className="text-center mt-16 space-y-4">
                <p style={{ color: "var(--text-muted)" }}>
                  Aún no hay proyectos
                </p>
                <button
                  onClick={() => setShowNew(true)}
                  className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white gradient-btn"
                >
                  Crea tu primer proyecto
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
              aria-label="Crear nuevo proyecto"
            >
              <Plus size={24} className="text-white" />
            </button>
          )}
        </>
      ) : (
        /* Loading state */
        <div className="flex-1 flex items-center justify-center">
          <Zap
            size={32}
            className="animate-pulse"
            style={{ color: "var(--purple-400)" }}
          />
        </div>
      )}
    </div>
  );
}
