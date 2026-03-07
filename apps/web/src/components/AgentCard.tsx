"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { AGENT_ROLES, type AgentNode } from "../lib/agents";

interface AgentCardProps {
  agent: AgentNode;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onChat: () => void;
}

export default function AgentCard({
  agent,
  isSelected,
  onSelect,
  onDelete,
  onChat,
}: AgentCardProps) {
  const meta = AGENT_ROLES[agent.role];

  return (
    <div
      onClick={onSelect}
      className="relative group cursor-pointer select-none"
      style={{ width: 160 }}
    >
      {/* Card */}
      <div
        className="rounded-xl p-3 transition-all duration-200"
        style={{
          background: "var(--bg-card)",
          border: isSelected
            ? `2px solid ${meta.color}`
            : "2px solid var(--border-subtle)",
          boxShadow: isSelected
            ? `0 0 20px ${meta.color}33, 0 4px 12px rgba(0,0,0,0.3)`
            : "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header: emoji + name */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{meta.icon}</span>
          <span
            className="text-xs font-semibold truncate flex-1"
            style={{ color: "var(--text-primary)" }}
          >
            {agent.name}
          </span>
        </div>

        {/* Role badge */}
        <div
          className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mb-2"
          style={{
            background: `${meta.color}22`,
            color: meta.color,
          }}
        >
          {meta.label}
        </div>

        {/* Prompt preview */}
        <p
          className="text-[10px] leading-tight line-clamp-2 mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          {agent.prompt}
        </p>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChat();
            }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors"
            style={{
              background: `${meta.color}22`,
              color: meta.color,
            }}
          >
            <MessageSquare size={10} />
            Chat
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            style={{
              color: "var(--red-500)",
              background: "rgba(239, 68, 68, 0.1)",
            }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Connection dot (bottom) */}
      <div
        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2"
        style={{
          background: "var(--bg-primary)",
          borderColor: meta.color,
        }}
      />

      {/* Connection dot (top) */}
      <div
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2"
        style={{
          background: "var(--bg-primary)",
          borderColor: meta.color,
        }}
      />
    </div>
  );
}
