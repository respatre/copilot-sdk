export interface ProjectMeta {
  id: string;
  name: string;
  slug: string;
  sessionId: string;
  model: string;
  createdAt: string;
  directory: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

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
