/* ─── Agent types for the workspace canvas ─── */

export type AgentRole =
  | "planner"
  | "coder"
  | "reviewer"
  | "designer"
  | "devops"
  | "tester"
  | "custom";

export interface AgentRoleMeta {
  label: string;
  icon: string; // emoji
  color: string; // CSS color for the card accent
  defaultPrompt: string;
}

export const AGENT_ROLES: Record<AgentRole, AgentRoleMeta> = {
  planner: {
    label: "Planner",
    icon: "📋",
    color: "#a855f7",
    defaultPrompt:
      "You are a systems architect. Analyze requirements and create detailed implementation plans with numbered steps, file lists, and tech stack decisions. Do NOT create files — only plan.",
  },
  coder: {
    label: "Coder",
    icon: "💻",
    color: "#3b82f6",
    defaultPrompt:
      "You are an expert full-stack developer. Write complete, production-quality code. Create all necessary files with proper structure, error handling, and types.",
  },
  reviewer: {
    label: "Reviewer",
    icon: "🔍",
    color: "#ef4444",
    defaultPrompt:
      "You are a senior code reviewer. Review code for bugs, security vulnerabilities, and improvements. Rate severity: critical / warning / info. Do NOT modify files.",
  },
  designer: {
    label: "Designer",
    icon: "🎨",
    color: "#f59e0b",
    defaultPrompt:
      "You are a UI/UX designer. Design interfaces, create CSS, choose color palettes, and ensure responsive design. Focus on accessibility and modern aesthetics.",
  },
  devops: {
    label: "DevOps",
    icon: "⚙️",
    color: "#10b981",
    defaultPrompt:
      "You are a DevOps engineer. Create Dockerfiles, CI/CD pipelines, deployment configs, and infrastructure scripts. Focus on reliability and automation.",
  },
  tester: {
    label: "Tester",
    icon: "🧪",
    color: "#06b6d4",
    defaultPrompt:
      "You are a QA engineer. Write comprehensive tests (unit, integration, e2e). Identify edge cases and ensure code coverage. Use the appropriate testing framework.",
  },
  custom: {
    label: "Custom",
    icon: "🤖",
    color: "#8b5cf6",
    defaultPrompt: "You are a helpful AI assistant.",
  },
};

export interface AgentNode {
  id: string;
  role: AgentRole;
  name: string;
  prompt: string;
  position: { x: number; y: number };
  connections: string[]; // IDs of agents this one connects TO
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  streaming?: boolean;
}
