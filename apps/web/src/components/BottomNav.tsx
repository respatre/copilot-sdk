"use client";

import { Code, FolderTree, MessageSquare } from "lucide-react";

export type TabId = "chat" | "files" | "code";

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
  hasNewFiles?: boolean;
}

const tabs: { id: TabId; label: string; icon: typeof MessageSquare }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "files", label: "Files", icon: FolderTree },
  { id: "code", label: "Code", icon: Code },
];

export default function BottomNav({ active, onChange, hasNewFiles }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex z-50 safe-bottom glass-header"
      role="tablist"
      aria-label="Workspace navigation"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 transition-all relative active:scale-95"
            style={{
              color: isActive ? "var(--purple-400)" : "var(--text-muted)",
            }}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{tab.label}</span>
            {/* Active indicator bar */}
            {isActive && (
              <span
                className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ background: "var(--purple-400)" }}
              />
            )}
            {tab.id === "files" && hasNewFiles && (
              <span
                className="absolute top-2 right-[calc(50%-16px)] w-2 h-2 rounded-full"
                style={{
                  background: "var(--purple-500)",
                  animation: "typing-bounce 1.2s ease infinite",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
