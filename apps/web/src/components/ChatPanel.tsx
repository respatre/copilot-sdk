"use client";

import { Loader2, SendHorizonal, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ToolActivity } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";
import ToolIndicator from "./ToolIndicator";

interface Props {
  messages: ChatMessage[];
  streaming: boolean;
  tool: ToolActivity | null;
  onSend: (prompt: string) => void;
}

export default function ChatPanel({
  messages,
  streaming,
  tool,
  onSend,
}: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, tool]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    onSend(text);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full opacity-25"
                style={{
                  background: "var(--gradient-main)",
                  animation: "spin-slow 6s linear infinite",
                }}
              />
              <Zap
                size={20}
                style={{ color: "var(--purple-400)" }}
                className="relative"
              />
            </div>
            <p className="text-lg font-semibold gradient-text">DevFlow</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Describe what you want to build
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {streaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div
            className="flex items-center gap-2 text-sm px-2"
            style={{ color: "var(--text-muted)" }}
          >
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--purple-500)",
                  animation: "typing-bounce 1.2s ease infinite",
                }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--blue-500)",
                  animation: "typing-bounce 1.2s ease infinite 0.2s",
                }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--purple-500)",
                  animation: "typing-bounce 1.2s ease infinite 0.4s",
                }}
              />
            </div>
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Tool indicator */}
      {tool && <ToolIndicator tool={tool} />}

      {/* Input */}
      <div
        className="px-3 py-2 safe-bottom"
        style={{
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 input-orbe flex items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              rows={1}
              aria-label="Message input"
              className="flex-1 bg-transparent px-4 py-2.5 text-sm resize-none outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            aria-label={streaming ? "Sending..." : "Send message"}
            className="p-2.5 rounded-2xl text-white disabled:opacity-30 disabled:pointer-events-none shrink-0 gradient-btn"
          >
            {streaming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <SendHorizonal size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
