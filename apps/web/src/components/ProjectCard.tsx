"use client";

import { Clock, Server, Trash2 } from "lucide-react";
import type { ProjectMeta } from "../lib/api";

interface Props {
  project: ProjectMeta;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ProjectCard({ project, onOpen, onDelete }: Props) {
  const date = new Date(project.createdAt);
  const timeAgo = formatTimeAgo(date);
  const providerLabel = project.provider || "copilot";

  return (
    <div
      onClick={() => onOpen(project.id)}
      className="rounded-2xl p-4 cursor-pointer transition-all duration-200"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className="font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {project.name}
          </h3>
          <div
            className="flex items-center gap-1.5 mt-1.5 text-xs flex-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            <Clock size={12} />
            <span>{timeAgo}</span>
            <span style={{ color: "var(--border-subtle)" }}>·</span>
            <span className="font-mono" style={{ color: "var(--purple-400)" }}>
              {project.model}
            </span>
            {providerLabel !== "copilot" && (
              <>
                <span style={{ color: "var(--border-subtle)" }}>·</span>
                <span
                  className="flex items-center gap-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Server size={10} />
                  {providerLabel}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project.id);
          }}
          className="p-2 rounded-lg transition-colors shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
