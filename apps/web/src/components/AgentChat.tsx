"use client";

import { ArrowLeft, Loader2, Send, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_ROLES, type AgentMessage, type AgentNode } from "../lib/agents";
import { buildWebSocketUrl } from "../lib/ws";
import MessageBubble from "./MessageBubble";

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
  const [thinking, setThinking] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamBuf = useRef("");
  const msgCounter = useRef(0);

  // Connect WS
  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (disposed) return;

      const wsUrl = buildWebSocketUrl("/ws");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (e) => {
        const evt = JSON.parse(e.data);

        // Filter: only process events for this project
        if (evt.projectId && evt.projectId !== projectId) return;

        switch (evt.type) {
          case "message_delta":
            setThinking(false);
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
            setThinking(false);
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
            setThinking(false);
            setToolStatus(evt.toolName ?? "working");
            break;
          case "tool_complete":
            setToolStatus(null);
            break;
          case "session_idle":
            setToolStatus(null);
            setStreaming(false);
            setThinking(false);
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
            setThinking(false);
            break;
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    }

    // Defer initial connect so React strict-mode cleanup cancels before the
    // WebSocket is actually created (avoids "closed before established" warning)
    const initTimer = setTimeout(connect, 0);

    return () => {
      disposed = true;
      clearTimeout(initTimer);
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [projectId, agent.id]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
      return;

    msgCounter.current++;
    streamBuf.current = "";
    setInput("");
    setStreaming(true);
    setThinking(true);

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
    const agentPrompt = `[Agent: ${agent.name} | Role: ${agent.role}]\n\n${agent.prompt}\n\n---\n${text}`;
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
        <div className="flex items-center gap-2">
          {toolStatus && (
            <div
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 size={10} className="animate-spin" />
              <span className="max-w-[80px] truncate">{toolStatus}</span>
            </div>
          )}
          {connected ? (
            <Wifi size={12} style={{ color: "#22c55e" }} />
          ) : (
            <WifiOff size={12} style={{ color: "var(--red-500)" }} />
          )}
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
      >
        {messages.length === 0 && !thinking && (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="text-3xl">{meta.icon}</span>
            <p className="text-xs text-center max-w-[220px]">
              Inicia una conversación con{" "}
              <strong style={{ color: meta.color }}>{agent.name}</strong>
            </p>
            <p
              className="text-[10px] text-center max-w-[200px] mt-1"
              style={{ color: "var(--text-muted)", opacity: 0.6 }}
            >
              {meta.label} — escribe un mensaje para comenzar
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {/* Thinking indicator — shows before first delta arrives */}
        {thinking && (
          <div className="flex justify-start animate-msg-in">
            <div className="px-4 py-3 rounded-2xl bubble-received flex items-center gap-2">
              <div className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: meta.color,
                    animation: "typing-bounce 1.2s ease infinite",
                  }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: meta.color,
                    animation: "typing-bounce 1.2s ease infinite 0.2s",
                  }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: meta.color,
                    animation: "typing-bounce 1.2s ease infinite 0.4s",
                  }}
                />
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {toolStatus ? `Ejecutando ${toolStatus}...` : "Pensando..."}
              </span>
            </div>
          </div>
        )}
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
            disabled={!connected}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming || !connected}
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
