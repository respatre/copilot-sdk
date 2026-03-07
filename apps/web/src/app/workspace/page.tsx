"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import AddAgentModal from "../../components/AddAgentModal";
import AgentCanvas from "../../components/AgentCanvas";
import AgentChat from "../../components/AgentChat";
import type { AgentNode } from "../../lib/agents";
import { fetchProjects, type ProjectMeta } from "../../lib/api";

/* ─── Persist agents per project in localStorage ─── */
function loadAgents(projectId: string): AgentNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`devflow_agents_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveAgents(projectId: string, agents: AgentNode[]) {
  localStorage.setItem(`devflow_agents_${projectId}`, JSON.stringify(agents));
}

let idCounter = 0;
function nextId() {
  return `agent-${Date.now()}-${++idCounter}`;
}

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("id") ?? "";

  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatAgentId, setChatAgentId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load project meta
  useEffect(() => {
    if (!projectId) return;
    fetchProjects().then((projects) => {
      const found = projects.find((p) => p.id === projectId);
      if (found) setProject(found);
    });
  }, [projectId]);

  // Hydration-safe local state load: keep first render stable between SSR and client
  useEffect(() => {
    let cancelled = false;
    const nextAgents = projectId ? loadAgents(projectId) : [];
    queueMicrotask(() => {
      if (!cancelled) setAgents(nextAgents);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Persist agents on change
  useEffect(() => {
    if (!projectId || agents.length === 0) return;
    saveAgents(projectId, agents);
  }, [agents, projectId]);

  const handleAddAgent = useCallback(
    (data: Omit<AgentNode, "id" | "position" | "connections">) => {
      const count = agents.length;
      // Position new agents in a grid layout
      const col = count % 2;
      const row = Math.floor(count / 2);
      const newAgent: AgentNode = {
        ...data,
        id: nextId(),
        position: { x: 40 + col * 200, y: 60 + row * 200 },
        connections: agents.length > 0 ? [agents[agents.length - 1].id] : [],
      };
      setAgents((prev) => [...prev, newAgent]);
    },
    [agents],
  );

  const handleDeleteAgent = useCallback(
    (id: string) => {
      setAgents((prev) => {
        const filtered = prev.filter((a) => a.id !== id);
        // Remove connections pointing to deleted agent
        return filtered.map((a) => ({
          ...a,
          connections: a.connections.filter((c) => c !== id),
        }));
      });
      if (selectedAgentId === id) setSelectedAgentId(null);
      if (chatAgentId === id) setChatAgentId(null);
    },
    [selectedAgentId, chatAgentId],
  );

  const chatAgent = agents.find((a) => a.id === chatAgentId) ?? null;

  if (!projectId) {
    return (
      <div
        className="h-dvh flex items-center justify-center"
        style={{ color: "var(--text-muted)", background: "var(--bg-primary)" }}
      >
        Ningún proyecto seleccionado
      </div>
    );
  }

  return (
    <div
      className="h-dvh flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <header className="glass-header flex items-center gap-2 px-3 py-2 shrink-0 sticky top-0 z-30">
        <button
          onClick={() => router.push("/")}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label="Volver a proyectos"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {project?.name ?? "Cargando..."}
          </h1>
          <p
            className="text-[10px] font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            {project?.model ?? ""}
          </p>
        </div>
        <div
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{
            background: "rgba(168,85,247,0.15)",
            color: "var(--purple-400)",
          }}
        >
          {agents.length} agente{agents.length !== 1 ? "s" : ""}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <AgentCanvas
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          onDeleteAgent={handleDeleteAgent}
          onChatAgent={(id) => setChatAgentId(id)}
          onAddAgent={() => setShowAddModal(true)}
        />
      </main>

      {/* Add agent modal */}
      <AddAgentModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddAgent}
      />

      {/* Agent chat overlay */}
      {chatAgent && (
        <AgentChat
          agent={chatAgent}
          projectId={projectId}
          onBack={() => setChatAgentId(null)}
        />
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh flex items-center justify-center text-zinc-500">
          Cargando...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
