"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { AGENT_ROLES, type AgentNode, type AgentRole } from "../lib/agents";

interface AddAgentModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (agent: Omit<AgentNode, "id" | "position" | "connections">) => void;
}

const roles = Object.entries(AGENT_ROLES) as [
  AgentRole,
  (typeof AGENT_ROLES)[AgentRole],
][];

export default function AddAgentModal({
  open,
  onClose,
  onAdd,
}: AddAgentModalProps) {
  const [step, setStep] = useState<"pick" | "configure">("pick");
  const [selectedRole, setSelectedRole] = useState<AgentRole>("coder");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");

  if (!open) return null;

  const handlePick = (role: AgentRole) => {
    setSelectedRole(role);
    setName(AGENT_ROLES[role].label);
    setPrompt(AGENT_ROLES[role].defaultPrompt);
    setStep("configure");
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ role: selectedRole, name: name.trim(), prompt: prompt.trim() });
    // Reset
    setStep("pick");
    setName("");
    setPrompt("");
    onClose();
  };

  const handleClose = () => {
    setStep("pick");
    setName("");
    setPrompt("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {step === "pick" ? "Add Agent" : "Configure Agent"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === "pick" ? (
            <div className="grid grid-cols-2 gap-2">
              {roles.map(([role, meta]) => (
                <button
                  key={role}
                  onClick={() => handlePick(role)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span className="text-2xl">{meta.icon}</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Role preview */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "var(--bg-card)" }}
              >
                <span className="text-2xl">
                  {AGENT_ROLES[selectedRole].icon}
                </span>
                <div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: `${AGENT_ROLES[selectedRole].color}22`,
                      color: AGENT_ROLES[selectedRole].color,
                    }}
                  >
                    {AGENT_ROLES[selectedRole].label}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label
                  className="text-[11px] font-medium mb-1 block"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Agent name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  placeholder="e.g. Backend Coder"
                />
              </div>

              {/* System prompt */}
              <div>
                <label
                  className="text-[11px] font-medium mb-1 block"
                  style={{ color: "var(--text-secondary)" }}
                >
                  System prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  placeholder="Describe what this agent should do..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "configure" && (
          <div
            className="px-4 py-3 flex gap-2 shrink-0"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <button
              onClick={() => setStep("pick")}
              className="flex-1 py-2 rounded-lg text-xs font-medium"
              style={{
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
              }}
            >
              Back
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
              style={{ background: "var(--gradient-btn)", color: "#fff" }}
            >
              <Plus size={12} />
              Add Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
