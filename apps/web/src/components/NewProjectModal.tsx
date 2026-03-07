"use client";

import {
  FolderUp,
  GitBranch,
  Github,
  Globe,
  Loader2,
  Lock,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  cloneGitHubRepo,
  disconnectGitHub,
  fetchGitHubRepos,
  fetchGitHubStatus,
  fetchProviderModels,
  startGitHubOAuth,
  uploadFiles,
  uploadZip,
  type AppSettings,
  type GitHubConnectionStatus,
  type GitHubRepo,
  type ModelInfo,
  type ProjectMeta,
} from "../lib/api";

type SourceTab = "new" | "github" | "upload";

interface Props {
  models: ModelInfo[];
  defaultModel: string;
  settings: AppSettings | null;
  onCreated: (project: ProjectMeta) => void;
  onCancel: () => void;
  onCreateBlank: (
    name: string,
    model: string,
    provider?: string,
  ) => Promise<void>;
}

export default function NewProjectModal({
  models,
  defaultModel,
  settings,
  onCreated,
  onCancel,
  onCreateBlank,
}: Props) {
  const [tab, setTab] = useState<SourceTab>("new");

  // Close on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 safe-bottom glass max-h-[85vh] flex flex-col"
        style={{ background: "var(--bg-secondary)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            id="new-project-title"
            className="font-semibold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            Nuevo Proyecto
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--text-muted)" }}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Source tabs */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "var(--bg-input)" }}
        >
          {[
            { id: "new" as SourceTab, label: "Nuevo", icon: GitBranch },
            { id: "github" as SourceTab, label: "GitHub", icon: Github },
            { id: "upload" as SourceTab, label: "Subir", icon: Upload },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? "var(--bg-card)" : "transparent",
                color:
                  tab === t.id ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === "new" && (
            <BlankProjectTab
              models={models}
              defaultModel={defaultModel}
              settings={settings}
              onCreate={onCreateBlank}
            />
          )}
          {tab === "github" && (
            <GitHubTab
              models={models}
              defaultModel={defaultModel}
              onCreated={onCreated}
            />
          )}
          {tab === "upload" && <UploadTab onCreated={onCreated} />}
        </div>
      </div>
    </div>
  );
}

// ─── Blank Project Tab ───

function BlankProjectTab({
  models: initialModels,
  defaultModel,
  settings,
  onCreate,
}: {
  models: ModelInfo[];
  defaultModel: string;
  settings: AppSettings | null;
  onCreate: (name: string, model: string, provider?: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [model, setModel] = useState(defaultModel);
  const [provider, setProvider] = useState(
    settings?.defaultProvider || "copilot",
  );
  const [models, setModels] = useState<ModelInfo[]>(initialModels);
  const [loadingModels, setLoadingModels] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reload models when provider changes
  useEffect(() => {
    if (provider === "copilot") {
      setModels(initialModels);
      setModel(initialModels[0]?.id || defaultModel);
      return;
    }
    setLoadingModels(true);
    fetchProviderModels(provider)
      .then((m) => {
        setModels(m);
        setModel(m[0]?.id || "");
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [provider, initialModels, defaultModel]);

  const handleCreate = async () => {
    if (!name.trim() || !model) return;
    setCreating(true);
    try {
      await onCreate(
        name.trim(),
        model,
        provider === "copilot" ? undefined : provider,
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          className="text-xs block mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Nombre del proyecto
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Mi App Genial"
          autoFocus
          className="w-full input-orbe px-4 py-2.5 text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {/* Provider selector */}
      {settings && Object.keys(settings.providers).length > 1 && (
        <div>
          <label
            className="text-xs block mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Proveedor IA
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full input-orbe px-4 py-2.5 text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
          >
            {Object.entries(settings.providers).map(([key, prov]) => (
              <option key={key} value={key}>
                {prov.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Model selector */}
      {loadingModels ? (
        <div
          className="flex items-center gap-2 py-2"
          style={{ color: "var(--text-muted)" }}
        >
          <Loader2 className="animate-spin" size={14} />
          <span className="text-xs">Cargando modelos...</span>
        </div>
      ) : models.length > 0 ? (
        <div>
          <label
            className="text-xs block mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Modelo
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full input-orbe px-4 py-2.5 text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <button
        onClick={handleCreate}
        disabled={!name.trim() || creating}
        className="w-full py-2.5 rounded-2xl text-sm font-semibold text-white gradient-btn disabled:opacity-40"
      >
        {creating ? "Creando..." : "Crear Proyecto"}
      </button>
    </div>
  );
}

// ─── GitHub Tab ───

function GitHubTab({
  models,
  defaultModel,
  onCreated,
}: {
  models: ModelInfo[];
  defaultModel: string;
  onCreated: (project: ProjectMeta) => void;
}) {
  const [ghStatus, setGhStatus] = useState<GitHubConnectionStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  // Check connection status
  useEffect(() => {
    fetchGitHubStatus()
      .then(setGhStatus)
      .catch(() => setGhStatus({ connected: false }));
  }, []);

  // Load repos when connected
  useEffect(() => {
    if (!ghStatus?.connected) return;
    setLoading(true);
    fetchGitHubRepos()
      .then(setRepos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ghStatus?.connected]);

  // Listen for OAuth callback
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "github-oauth-success") {
        fetchGitHubStatus().then(setGhStatus);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleConnect = async () => {
    try {
      const { url } = await startGitHubOAuth();
      window.open(url, "github-oauth", "width=600,height=700");
    } catch {
      setError("Failed to start OAuth flow");
    }
  };

  const handleDisconnect = async () => {
    await disconnectGitHub();
    setGhStatus({ connected: false });
    setRepos([]);
  };

  const handleClone = useCallback(
    async (repo: GitHubRepo) => {
      setCloning(repo.full_name);
      setError("");
      try {
        const project = await cloneGitHubRepo(
          repo.full_name,
          repo.default_branch,
        );
        onCreated(project);
      } catch (err) {
        setError(String(err));
      } finally {
        setCloning(null);
      }
    },
    [onCreated],
  );

  // Not connected — show connect button
  if (!ghStatus?.connected) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <Github size={40} style={{ color: "var(--text-muted)" }} />
        <p
          className="text-sm text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          Conecta tu cuenta de GitHub para importar repositorios
        </p>
        <button
          onClick={handleConnect}
          className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white flex items-center gap-2 gradient-btn"
        >
          <Github size={16} />
          Conectar GitHub
        </button>
        {error && (
          <p className="text-xs" style={{ color: "var(--red-500)" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // Connected — show repos
  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (r.description || "")
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      {/* Connected header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={ghStatus.user?.avatar_url}
            alt=""
            className="w-6 h-6 rounded-full"
          />
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {ghStatus.user?.login}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs px-2 py-1 rounded"
          style={{ color: "var(--text-muted)" }}
        >
          Desconectar
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar repositorios..."
          className="w-full input-orbe pl-9 pr-4 py-2 text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {/* Repo list */}
      {loading ? (
        <div
          className="text-center py-6 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Cargando repos...
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
          {filtered.map((repo) => (
            <button
              key={repo.id}
              onClick={() => handleClone(repo)}
              disabled={cloning !== null}
              className="w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {repo.private ? (
                    <Lock size={12} style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <Globe size={12} style={{ color: "var(--text-muted)" }} />
                  )}
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {repo.name}
                  </span>
                  {repo.language && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {repo.language}
                    </span>
                  )}
                </div>
                {repo.description && (
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {repo.description}
                  </p>
                )}
              </div>
              {cloning === repo.full_name ? (
                <Loader2
                  size={16}
                  className="animate-spin shrink-0"
                  style={{ color: "var(--purple-400)" }}
                />
              ) : (
                <GitBranch
                  size={14}
                  className="shrink-0"
                  style={{ color: "var(--text-muted)" }}
                />
              )}
            </button>
          ))}
          {filtered.length === 0 && !loading && (
            <p
              className="text-center py-4 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No se encontraron repos
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: "var(--red-500)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Upload Tab ───

function UploadTab({
  onCreated,
}: {
  onCreated: (project: ProjectMeta) => void;
}) {
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleZip = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const project = await uploadZip(file, name || undefined);
      onCreated(project);
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleFolder = async (files: FileList) => {
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const fileArray = Array.from(files);
      const paths = fileArray.map(
        (f) =>
          (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
          f.name,
      );
      const project = await uploadFiles(
        fileArray,
        name || "uploaded-project",
        paths,
      );
      onCreated(project);
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length === 1 && files[0].name.endsWith(".zip")) {
      handleZip(files[0]);
    } else if (files.length > 0) {
      handleFolder(files);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          className="text-xs block mb-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Nombre del proyecto (opcional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mi Proyecto"
          className="w-full input-orbe px-4 py-2.5 text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {/* Drag & drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className="rounded-xl p-8 flex flex-col items-center gap-3 transition-all"
        style={{
          border: `2px dashed ${dragActive ? "var(--purple-500)" : "var(--border-subtle)"}`,
          background: dragActive
            ? "rgba(168, 85, 247, 0.05)"
            : "var(--bg-card)",
        }}
      >
        {uploading ? (
          <>
            <Loader2
              size={28}
              className="animate-spin"
              style={{ color: "var(--purple-400)" }}
            />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Subiendo...
            </p>
          </>
        ) : (
          <>
            <FolderUp size={28} style={{ color: "var(--text-muted)" }} />
            <p
              className="text-sm text-center"
              style={{ color: "var(--text-secondary)" }}
            >
              Arrastra un archivo <strong>.zip</strong> o carpeta aquí
            </p>
            <div className="flex gap-2">
              {/* ZIP upload */}
              <label
                className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-secondary)",
                }}
              >
                <Upload size={12} />
                Subir .zip
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleZip(f);
                  }}
                />
              </label>
              {/* Folder upload */}
              <label
                className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-secondary)",
                }}
              >
                <FolderUp size={12} />
                Subir carpeta
                <input
                  type="file"
                  className="hidden"
                  {...({
                    webkitdirectory: "",
                    directory: "",
                  } as React.InputHTMLAttributes<HTMLInputElement>)}
                  multiple
                  onChange={(e) => {
                    if (e.target.files) handleFolder(e.target.files);
                  }}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--red-500)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
