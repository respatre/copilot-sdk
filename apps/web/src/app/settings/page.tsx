"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Github,
  LinkIcon,
  Loader2,
  LogOut,
  Plus,
  Server,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addProvider,
  fetchAuthStatus,
  fetchSettings,
  logout,
  removeProvider,
  saveSettings,
  submitToken,
  testProvider,
  type AppSettings,
  type AuthStatus,
  type ProviderConfig,
} from "../../lib/api";

type TestStatus = "idle" | "testing" | "ok" | "error";

interface ProviderState {
  testStatus: TestStatus;
  testMessage: string;
  expanded: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [providerStates, setProviderStates] = useState<
    Record<string, ProviderState>
  >({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  // GitHub Copilot token state
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenExpanded, setTokenExpanded] = useState(false);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s);
        const states: Record<string, ProviderState> = {};
        for (const name of Object.keys(s.providers)) {
          states[name] = {
            testStatus: "idle",
            testMessage: "",
            expanded: false,
          };
        }
        setProviderStates(states);
      })
      .catch(() => setError("No se pudo cargar la configuración"));

    fetchAuthStatus()
      .then(setAuthStatus)
      .catch(() => setAuthStatus({ isAuthenticated: false }));
  }, []);

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setTokenLoading(true);
    setError("");
    try {
      const status = await submitToken(tokenInput.trim());
      setAuthStatus(status);
      if (status.isAuthenticated) setTokenInput("");
    } catch {
      setError("No se pudo conectar con ese token");
    } finally {
      setTokenLoading(false);
    }
  };

  const handleDisconnectToken = async () => {
    setTokenLoading(true);
    try {
      await logout();
      setAuthStatus({ isAuthenticated: false });
    } catch {
      setError("Error al desconectar");
    } finally {
      setTokenLoading(false);
    }
  };

  const handleTest = async (name: string) => {
    setProviderStates((prev) => ({
      ...prev,
      [name]: { ...prev[name], testStatus: "testing", testMessage: "" },
    }));
    try {
      const result = await testProvider(name);
      setProviderStates((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          testStatus: result.ok ? "ok" : "error",
          testMessage: result.ok
            ? result.message || "Conectado"
            : result.error || "Falló",
        },
      }));
    } catch {
      setProviderStates((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          testStatus: "error",
          testMessage: "Error de conexión",
        },
      }));
    }
  };

  const handleSetDefault = async (name: string) => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveSettings({ defaultProvider: name });
      setSettings({ ...settings, defaultProvider: name });
    } catch {
      setError("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (name: string) => {
    if (!settings || name === "copilot") return;
    try {
      await removeProvider(name);
      const next = { ...settings };
      delete next.providers[name];
      if (next.defaultProvider === name) next.defaultProvider = "copilot";
      setSettings(next);
      setProviderStates((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    } catch {
      setError("No se pudo eliminar el proveedor");
    }
  };

  const toggleExpand = (name: string) => {
    setProviderStates((prev) => ({
      ...prev,
      [name]: { ...prev[name], expanded: !prev[name]?.expanded },
    }));
  };

  const handleUpdateProvider = async (
    name: string,
    field: keyof ProviderConfig,
    value: string,
  ) => {
    if (!settings) return;
    const updated = {
      ...settings,
      providers: {
        ...settings.providers,
        [name]: { ...settings.providers[name], [field]: value },
      },
    };
    setSettings(updated);
  };

  const handleSaveProvider = async (name: string) => {
    if (!settings) return;
    setSaving(true);
    try {
      await saveSettings({ providers: { [name]: settings.providers[name] } });
    } catch {
      setError("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <Loader2
          className="animate-spin"
          size={24}
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="glass-header sticky top-0 z-40 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--text-muted)" }}
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Ajustes
          </h1>
        </div>
      </header>

      <main className="px-4 pb-24 space-y-6 mt-4">
        {error && (
          <div
            className="text-xs px-3 py-2 rounded-xl"
            style={{ color: "var(--red-500)", background: "var(--bg-card)" }}
          >
            {error}
          </div>
        )}

        {/* Section: GitHub Copilot Token */}
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            GitHub Copilot
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: authStatus?.isAuthenticated
                ? "1px solid #22c55e"
                : "1px solid var(--border-subtle)",
            }}
          >
            {/* Card header */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => setTokenExpanded(!tokenExpanded)}
            >
              <Github
                size={18}
                style={{
                  color: authStatus?.isAuthenticated
                    ? "#22c55e"
                    : "var(--text-muted)",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {authStatus?.isAuthenticated
                      ? `Conectado como ${authStatus.login || "user"}`
                      : "No conectado"}
                  </span>
                  {authStatus?.isAuthenticated && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "#22c55e", color: "#fff" }}
                    >
                      ACTIVO
                    </span>
                  )}
                </div>
                <span
                  className="text-xs block truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {authStatus?.isAuthenticated
                    ? `${authStatus.authType || "token"} · ${authStatus.host || "github.com"}`
                    : "Configura tu token GitHub (PAT) para usar Copilot SDK"}
                </span>
              </div>
              {authStatus?.isAuthenticated ? (
                <Wifi size={16} style={{ color: "#22c55e" }} />
              ) : (
                <WifiOff size={16} style={{ color: "var(--red-500)" }} />
              )}
              {tokenExpanded ? (
                <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
              ) : (
                <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
              )}
            </div>

            {/* Expanded */}
            {tokenExpanded && (
              <div
                className="px-4 pb-4 space-y-3 border-t"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="pt-3">
                  <label
                    className="text-xs block mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    GitHub Personal Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveToken()}
                      className="w-full input-orbe px-3 py-2 pr-9 text-xs font-mono outline-none"
                      style={{ color: "var(--text-primary)" }}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Genera uno en{" "}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      style={{ color: "var(--purple-400)" }}
                    >
                      github.com/settings/tokens
                    </a>{" "}
                    con scope <code className="text-[10px]">copilot</code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveToken}
                    disabled={!tokenInput.trim() || tokenLoading}
                    className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 gradient-btn text-white disabled:opacity-40"
                  >
                    {tokenLoading ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <LinkIcon size={14} />
                    )}
                    Conectar
                  </button>

                  {authStatus?.isAuthenticated && (
                    <button
                      onClick={handleDisconnectToken}
                      disabled={tokenLoading}
                      className="py-2 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      style={{
                        background: "var(--bg-input)",
                        color: "var(--red-500)",
                      }}
                    >
                      <LogOut size={14} />
                      Desconectar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section: AI Providers */}
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            Proveedores de IA
          </h2>
          <div className="space-y-3">
            {Object.entries(settings.providers).map(([name, prov]) => {
              const state = providerStates[name] || {
                testStatus: "idle",
                testMessage: "",
                expanded: false,
              };
              const isDefault = settings.defaultProvider === name;

              return (
                <div
                  key={name}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "var(--bg-card)",
                    border: isDefault
                      ? "1px solid var(--purple-400)"
                      : "1px solid var(--border-subtle)",
                  }}
                >
                  {/* Card header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => toggleExpand(name)}
                  >
                    <Server
                      size={18}
                      style={{
                        color: isDefault
                          ? "var(--purple-400)"
                          : "var(--text-muted)",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium text-sm truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {prov.label}
                        </span>
                        {isDefault && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              background: "var(--purple-400)",
                              color: "#fff",
                            }}
                          >
                            PREDETERMINADO
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs font-mono truncate block"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {name === "copilot"
                          ? "GitHub Copilot SDK"
                          : prov.baseUrl || "Sin URL"}
                      </span>
                    </div>

                    {/* Test status indicator */}
                    {state.testStatus === "ok" && (
                      <Wifi size={16} style={{ color: "#22c55e" }} />
                    )}
                    {state.testStatus === "error" && (
                      <WifiOff size={16} style={{ color: "var(--red-500)" }} />
                    )}

                    {state.expanded ? (
                      <ChevronUp
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                    ) : (
                      <ChevronDown
                        size={16}
                        style={{ color: "var(--text-muted)" }}
                      />
                    )}
                  </div>

                  {/* Expanded details */}
                  {state.expanded && (
                    <div
                      className="px-4 pb-4 space-y-3 border-t"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      {/* URL field (not for copilot) */}
                      {name !== "copilot" && (
                        <div className="pt-3">
                          <label
                            className="text-xs block mb-1"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Base URL
                          </label>
                          <input
                            value={prov.baseUrl || ""}
                            onChange={(e) =>
                              handleUpdateProvider(
                                name,
                                "baseUrl",
                                e.target.value,
                              )
                            }
                            onBlur={() => handleSaveProvider(name)}
                            className="w-full input-orbe px-3 py-2 text-xs font-mono outline-none"
                            style={{ color: "var(--text-primary)" }}
                            placeholder="http://localhost:11434/v1"
                          />
                        </div>
                      )}

                      {/* API Key (optional) */}
                      {name !== "copilot" && (
                        <ApiKeyInput
                          value={prov.apiKey || ""}
                          onChange={(val) =>
                            handleUpdateProvider(name, "apiKey", val)
                          }
                          onBlur={() => handleSaveProvider(name)}
                        />
                      )}

                      {/* Test message */}
                      {state.testMessage && (
                        <p
                          className="text-xs"
                          style={{
                            color:
                              state.testStatus === "ok"
                                ? "#22c55e"
                                : "var(--red-500)",
                          }}
                        >
                          {state.testMessage}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleTest(name)}
                          disabled={state.testStatus === "testing"}
                          className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          style={{
                            background: "var(--bg-input)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {state.testStatus === "testing" ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Wifi size={14} />
                          )}
                          Probar
                        </button>

                        {!isDefault && (
                          <button
                            onClick={() => handleSetDefault(name)}
                            disabled={saving}
                            className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 gradient-btn text-white"
                          >
                            <Check size={14} />
                            Predeterminado
                          </button>
                        )}

                        {name !== "copilot" && (
                          <button
                            onClick={() => handleRemove(name)}
                            className="p-2 rounded-xl transition-colors"
                            style={{
                              background: "var(--bg-input)",
                              color: "var(--red-500)",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Add provider */}
        {showAdd ? (
          <AddProviderForm
            onAdd={async (name, config) => {
              await addProvider(name, config);
              setSettings({
                ...settings,
                providers: { ...settings.providers, [name]: config },
              });
              setProviderStates((prev) => ({
                ...prev,
                [name]: {
                  testStatus: "idle",
                  testMessage: "",
                  expanded: true,
                },
              }));
              setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
            existingNames={Object.keys(settings.providers)}
          />
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <Plus size={16} />
            Agregar Proveedor
          </button>
        )}
      </main>
    </div>
  );
}

// ─── Add Provider Form ───

function AddProviderForm({
  onAdd,
  onCancel,
  existingNames,
}: {
  onAdd: (name: string, config: ProviderConfig) => Promise<void>;
  onCancel: () => void;
  existingNames: string[];
}) {
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provType, setProvType] = useState<"openai" | "azure" | "anthropic">(
    "openai",
  );
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const handleAdd = async () => {
    if (!label.trim() || !baseUrl.trim()) return;
    if (existingNames.includes(slug)) {
      setError("Ya existe un proveedor con ese nombre");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await onAdd(slug, {
        type: provType,
        label: label.trim(),
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim() || undefined,
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Add Provider
        </h3>
        <button onClick={onCancel} style={{ color: "var(--text-muted)" }}>
          <X size={16} />
        </button>
      </div>

      <div>
        <label
          className="text-xs block mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Nombre
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full input-orbe px-3 py-2 text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
          placeholder="Mi Proveedor"
        />
      </div>

      <div>
        <label
          className="text-xs block mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Tipo
        </label>
        <select
          value={provType}
          onChange={(e) =>
            setProvType(e.target.value as "openai" | "azure" | "anthropic")
          }
          className="w-full input-orbe px-3 py-2 text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        >
          <option value="openai">Compatible con OpenAI</option>
          <option value="azure">Azure</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </div>

      <div>
        <label
          className="text-xs block mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Base URL
        </label>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full input-orbe px-3 py-2 text-xs font-mono outline-none"
          style={{ color: "var(--text-primary)" }}
          placeholder="http://localhost:11434/v1"
        />
      </div>

      <div>
        <label
          className="text-xs block mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          API Key <span style={{ color: "var(--text-muted)" }}>(opcional)</span>
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full input-orbe px-3 py-2 text-xs font-mono outline-none"
          style={{ color: "var(--text-primary)" }}
          placeholder="sk-xxxx"
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--red-500)" }}>
          {error}
        </p>
      )}

      <button
        onClick={handleAdd}
        disabled={!label.trim() || !baseUrl.trim() || adding}
        className="w-full py-2.5 rounded-2xl text-sm font-semibold text-white gradient-btn disabled:opacity-40"
      >
        {adding ? "Agregando..." : "Agregar Proveedor"}
      </button>
    </div>
  );
}

// ─── API Key Input with show/hide toggle ───

function ApiKeyInput({
  value,
  onChange,
  onBlur,
}: {
  value: string;
  onChange: (val: string) => void;
  onBlur: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label
        className="text-xs block mb-1"
        style={{ color: "var(--text-secondary)" }}
      >
        API Key <span style={{ color: "var(--text-muted)" }}>(opcional)</span>
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="w-full input-orbe px-3 py-2 pr-9 text-xs font-mono outline-none"
          style={{ color: "var(--text-primary)" }}
          placeholder="sk-xxxx o dejar vacío"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
          style={{ color: "var(--text-muted)" }}
          aria-label={show ? "Ocultar API key" : "Mostrar API key"}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}
