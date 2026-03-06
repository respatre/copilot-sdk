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
    <nav className="fixed bottom-0 left-0 right-0 flex z-50 safe-bottom glass-header">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 transition-colors relative"
            style={{
              color: isActive ? "var(--purple-400)" : "var(--text-muted)",
            }}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{tab.label}</span>
            {tab.id === "files" && hasNewFiles && (
              <span
                className="absolute top-2 right-[calc(50%-16px)] w-2 h-2 rounded-full"
                style={{ background: "var(--purple-500)" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
