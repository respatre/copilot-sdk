"use client";

import { Loader2, Wrench } from "lucide-react";
import type { ToolActivity } from "../hooks/useChat";

interface Props {
  tool: ToolActivity;
}

export default function ToolIndicator({ tool }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 text-xs"
      style={{
        background: "rgba(26, 26, 36, 0.8)",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {tool.status === "running" ? (
        <Loader2
          size={12}
          className="animate-spin"
          style={{ color: "var(--purple-400)" }}
        />
      ) : (
        <Wrench size={12} style={{ color: "#34d399" }} />
      )}
      <span>
        {tool.status === "running" ? "Ejecutando" : "Listo"}:{" "}
        <span className="font-mono" style={{ color: "var(--text-primary)" }}>
          {tool.toolName}
        </span>
      </span>
    </div>
  );
}
