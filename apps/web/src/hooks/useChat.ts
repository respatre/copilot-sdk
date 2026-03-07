"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredToken } from "../lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ToolActivity {
  toolName: string;
  status: "running" | "done";
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

interface WsEvent {
  type: string;
  content?: string;
  toolName?: string;
  success?: boolean;
  message?: string;
  path?: string;
}

export function useChat(projectId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [tool, setTool] = useState<ToolActivity | null>(null);
  const [fileEvents, setFileEvents] = useState<WsEvent[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const streamingRef = useRef("");
  const msgIdRef = useRef(0);
  const reconnectCountRef = useRef(0);

  useEffect(() => {
    if (!projectId) return;

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (disposed) return;

      const isReconnect = reconnectCountRef.current > 0;
      setConnectionStatus(isReconnect ? "reconnecting" : "connecting");

      const token = getStoredToken();
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = proto + "//" + window.location.host + "/ws" + tokenParam;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus("connected");
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (e) => {
        const evt: WsEvent = JSON.parse(e.data);

        switch (evt.type) {
          case "message_delta":
            streamingRef.current += evt.content ?? "";
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (
                last?.role === "assistant" &&
                last.id === `stream-${msgIdRef.current}`
              ) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: streamingRef.current },
                ];
              }
              return [
                ...prev,
                {
                  id: `stream-${msgIdRef.current}`,
                  role: "assistant",
                  content: streamingRef.current,
                  timestamp: Date.now(),
                },
              ];
            });
            break;

          case "message_complete":
            setStreaming(false);
            streamingRef.current = "";
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: evt.content ?? last.content },
                ];
              }
              return prev;
            });
            break;

          case "tool_start":
            setTool({ toolName: evt.toolName ?? "tool", status: "running" });
            break;

          case "tool_complete":
            setTool({ toolName: evt.toolName ?? "tool", status: "done" });
            setTimeout(() => setTool(null), 1000);
            break;

          case "session_idle":
            setStreaming(false);
            setTool(null);
            break;

          case "file_created":
          case "file_updated":
          case "file_deleted":
            setFileEvents((prev) => [...prev, evt]);
            break;

          case "error":
            setMessages((prev) => [
              ...prev,
              {
                id: `err-${Date.now()}`,
                role: "assistant",
                content: `**Error:** ${evt.message}`,
                timestamp: Date.now(),
              },
            ]);
            setStreaming(false);
            break;
        }
      };

      ws.onclose = () => {
        setConnectionStatus("disconnected");
        reconnectCountRef.current++;
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [projectId]);

  const sendMessage = useCallback(
    (prompt: string) => {
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN ||
        !projectId
      )
        return;

      msgIdRef.current++;
      streamingRef.current = "";

      setMessages((prev) => [
        ...prev,
        {
          id: `user-${msgIdRef.current}`,
          role: "user",
          content: prompt,
          timestamp: Date.now(),
        },
      ]);

      setStreaming(true);
      wsRef.current.send(JSON.stringify({ type: "chat", projectId, prompt }));
    },
    [projectId],
  );

  const clearFileEvents = useCallback(() => setFileEvents([]), []);

  return {
    messages,
    streaming,
    tool,
    fileEvents,
    connectionStatus,
    sendMessage,
    clearFileEvents,
  };
}
