"use client";

import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_ROLES, type AgentMessage, type AgentNode } from "../lib/agents";
import { getStoredToken } from "../lib/api";

interface AgentChatProps {
  agent: AgentNode;
  projectId: string;
  onBack: () => void;
}

export default function AgentChat({
  agent,
  projectId,
  onBack,
}: AgentChatProps) {
  const meta = AGENT_ROLES[agent.role];
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamBuf = useRef("");
  const msgCounter = useRef(0);

  // Connect WS
  useEffect(() => {
    const token = getStoredToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/ws${tokenParam}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const evt = JSON.parse(e.data);
      switch (evt.type) {
        case "message_delta":
          streamBuf.current += evt.content ?? "";
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant" && last.streaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: streamBuf.current },
              ];
            }
            return [
              ...prev,
              {
                id: `a-${msgCounter.current}`,
                role: "assistant",
                content: streamBuf.current,
                timestamp: Date.now(),
                streaming: true,
              },
            ];
          });
          break;
        case "message_complete":
          setStreaming(false);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  content: evt.content ?? last.content,
                  streaming: false,
                },
              ];
            }
            return prev;
          });
          streamBuf.current = "";
          break;
        case "tool_start":
          setToolStatus(evt.toolName ?? "working");
          break;
        case "tool_complete":
        case "session_idle":
          setToolStatus(null);
          setStreaming(false);
          break;
        case "error":
          setMessages((prev) => [
            ...prev,
            {
              id: `e-${Date.now()}`,
              role: "assistant",
              content: `**Error:** ${evt.message}`,
              timestamp: Date.now(),
            },
          ]);
          setStreaming(false);
          break;
      }
    };

    return () => ws.close();
  }, [projectId, agent.id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
      return;

    msgCounter.current++;
    streamBuf.current = "";
    setInput("");
    setStreaming(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${msgCounter.current}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      },
    ]);

    // Prepend agent context to the prompt so the backend uses the agent's system prompt
    const agentPrompt = `[Agent: ${agent.name} | Role: ${agent.role}]\n\nSystem instructions for this agent:\n${agent.prompt}\n\n---\nUser message:\n${text}`;
    wsRef.current.send(
      JSON.stringify({ type: "chat", projectId, prompt: agentPrompt }),
    );
  }, [input, projectId, agent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
        }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-xl">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <h2
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {agent.name}
          </h2>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ background: `${meta.color}22`, color: meta.color }}
          >
            {meta.label}
          </span>
        </div>
        {toolStatus && (
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            <Loader2 size={10} className="animate-spin" />
            {toolStatus}
          </div>
        )}
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
      >
        {messages.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="text-3xl">{meta.icon}</span>
            <p className="text-xs text-center max-w-[200px]">
              Inicia una conversación con{" "}
              <strong style={{ color: meta.color }}>{agent.name}</strong>
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap"
              style={
                msg.role === "user"
                  ? { background: "var(--gradient-sent)", color: "#fff" }
                  : {
                      background: "var(--bg-card)",
                      color: "var(--text-primary)",
                    }
              }
            >
              {msg.content}
              {msg.streaming && (
                <span
                  className="inline-block w-1.5 h-3 ml-0.5 rounded-sm animate-pulse"
                  style={{ background: meta.color }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        className="px-3 py-2 safe-bottom shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Mensaje a ${agent.name}...`}
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none resize-none max-h-24"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="p-2.5 rounded-xl transition-opacity disabled:opacity-30"
            style={{ background: meta.color }}
          >
            {streaming ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <Send size={16} color="#fff" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
