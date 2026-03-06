// ── Provider config ──

export interface ProviderConfig {
  type: "openai" | "azure" | "anthropic";
  label: string;
  baseUrl?: string;
  apiKey?: string;
  wireApi?: "completions" | "responses";
}

export interface AppConfig {
  defaultProvider: string;
  providers: Record<string, ProviderConfig>;
}

// ── Project ──

export interface ProjectMeta {
  id: string;
  name: string;
  slug: string;
  sessionId: string;
  model: string;
  provider?: string;
  createdAt: string;
  directory: string;
  source?: { type: string; [key: string]: unknown };
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

// ── WebSocket ──

export interface WsIncoming {
  type: "chat";
  projectId: string;
  prompt: string;
}

export interface WsOutgoing {
  type:
    | "message_delta"
    | "message_complete"
    | "tool_start"
    | "tool_complete"
    | "agent_active"
    | "file_created"
    | "file_updated"
    | "file_deleted"
    | "error"
    | "session_idle";
  [key: string]: unknown;
}
