"use client";

import { Plus } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { AGENT_ROLES, type AgentNode } from "../lib/agents";
import AgentCard from "./AgentCard";

interface AgentCanvasProps {
  agents: AgentNode[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  onDeleteAgent: (id: string) => void;
  onChatAgent: (id: string) => void;
  onAddAgent: () => void;
}

/* Draw SVG lines between connected agents */
function ConnectionLines({ agents }: { agents: AgentNode[] }) {
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const lines: { from: AgentNode; to: AgentNode; key: string }[] = [];

  for (const agent of agents) {
    for (const targetId of agent.connections) {
      const target = agentMap.get(targetId);
      if (target) {
        lines.push({ from: agent, to: target, key: `${agent.id}-${targetId}` });
      }
    }
  }

  if (lines.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {lines.map(({ from, to, key }) => {
        // Card is 160px wide, ~120px tall. Offset centers
        const fromX = from.position.x + 80;
        const fromY = from.position.y + 130; // bottom of card
        const toX = to.position.x + 80;
        const toY = to.position.y; // top of card

        const midY = (fromY + toY) / 2;
        const fromColor = AGENT_ROLES[from.role].color;

        return (
          <path
            key={key}
            d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
            fill="none"
            stroke={fromColor}
            strokeWidth={2}
            strokeOpacity={0.4}
            strokeDasharray="6 4"
          />
        );
      })}
    </svg>
  );
}

export default function AgentCanvas({
  agents,
  selectedAgentId,
  onSelectAgent,
  onDeleteAgent,
  onChatAgent,
  onAddAgent,
}: AgentCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [dragOffsets, setDragOffsets] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const handlePointerDown = useCallback(
    (agentId: string, e: React.PointerEvent) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;
      const pos = dragOffsets[agentId] ?? { x: 0, y: 0 };
      setDragging({
        id: agentId,
        startX: e.clientX,
        startY: e.clientY,
        origX: agent.position.x + pos.x,
        origY: agent.position.y + pos.y,
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [agents, dragOffsets],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      const agent = agents.find((a) => a.id === dragging.id);
      if (!agent) return;
      setDragOffsets((prev) => ({
        ...prev,
        [dragging.id]: {
          x: dragging.origX - agent.position.x + dx,
          y: dragging.origY - agent.position.y + dy,
        },
      }));
    },
    [dragging, agents],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const getPosition = (agent: AgentNode) => {
    const off = dragOffsets[agent.id] ?? { x: 0, y: 0 };
    return {
      x: agent.position.x + off.x,
      y: agent.position.y + off.y,
    };
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-auto"
      style={{ background: "var(--bg-primary)" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Grid dots background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Connection lines */}
      <ConnectionLines
        agents={agents.map((a) => ({
          ...a,
          position: getPosition(a),
        }))}
      />

      {/* Agent cards */}
      {agents.map((agent) => {
        const pos = getPosition(agent);
        return (
          <div
            key={agent.id}
            className="absolute touch-none"
            style={{
              left: pos.x,
              top: pos.y,
              zIndex: dragging?.id === agent.id ? 20 : 10,
              transition: dragging?.id === agent.id ? "none" : "transform 0.1s",
            }}
            onPointerDown={(e) => handlePointerDown(agent.id, e)}
          >
            <AgentCard
              agent={agent}
              isSelected={selectedAgentId === agent.id}
              onSelect={() => onSelectAgent(agent.id)}
              onDelete={() => onDeleteAgent(agent.id)}
              onChat={() => onChatAgent(agent.id)}
            />
          </div>
        );
      })}

      {/* Floating add button */}
      <button
        onClick={onAddAgent}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
        style={{
          background: "var(--gradient-btn)",
          boxShadow: "0 4px 20px rgba(147, 51, 234, 0.4)",
        }}
      >
        <Plus size={22} color="#fff" />
      </button>

      {/* Empty state */}
      {agents.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl">🤖</span>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No agents yet
          </p>
          <button
            onClick={onAddAgent}
            className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5"
            style={{ background: "var(--gradient-btn)", color: "#fff" }}
          >
            <Plus size={12} />
            Add your first agent
          </button>
        </div>
      )}
    </div>
  );
}
