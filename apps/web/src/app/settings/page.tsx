"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
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
  fetchSettings,
  removeProvider,
  saveSettings,
  testProvider,
  type AppSettings,
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
      .catch(() => setError("Failed to load settings"));
  }, []);

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
            ? result.message || "Connected"
            : result.error || "Failed",
        },
      }));
    } catch {
      setProviderStates((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          testStatus: "error",
          testMessage: "Connection failed",
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
      setError("Failed to save");
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
      setError("Failed to remove provider");
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
      setError("Failed to save");
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
      <header className="glass-header sticky top-0 z-40 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--text-muted)" }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Settings
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

        {/* Section: AI Providers */}
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            AI Providers
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
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs font-mono truncate block"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {name === "copilot"
                          ? "GitHub Copilot SDK"
                          : prov.baseUrl || "No URL"}
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
                        <div>
                          <label
                            className="text-xs block mb-1"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            API Key{" "}
                            <span style={{ color: "var(--text-muted)" }}>
                              (optional)
                            </span>
                          </label>
                          <input
                            type="password"
                            value={prov.apiKey || ""}
                            onChange={(e) =>
                              handleUpdateProvider(
                                name,
                                "apiKey",
                                e.target.value,
                              )
                            }
                            onBlur={() => handleSaveProvider(name)}
                            className="w-full input-orbe px-3 py-2 text-xs font-mono outline-none"
                            style={{ color: "var(--text-primary)" }}
                            placeholder="sk-xxxx or leave empty"
                          />
                        </div>
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
                          Test
                        </button>

                        {!isDefault && (
                          <button
                            onClick={() => handleSetDefault(name)}
                            disabled={saving}
                            className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 gradient-btn text-white"
                          >
                            <Check size={14} />
                            Set Default
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
            Add Provider
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
      setError("A provider with this name already exists");
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
          Name
        </label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full input-orbe px-3 py-2 text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
          placeholder="My Provider"
        />
      </div>

      <div>
        <label
          className="text-xs block mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Type
        </label>
        <select
          value={provType}
          onChange={(e) =>
            setProvType(e.target.value as "openai" | "azure" | "anthropic")
          }
          className="w-full input-orbe px-3 py-2 text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        >
          <option value="openai">OpenAI-compatible</option>
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
          API Key <span style={{ color: "var(--text-muted)" }}>(optional)</span>
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
        {adding ? "Adding..." : "Add Provider"}
      </button>
    </div>
  );
}
