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
    label: "Planificador",
    icon: "📋",
    color: "#a855f7",
    defaultPrompt:
      "Eres un arquitecto de sistemas. Analiza los requisitos y crea planes de implementación detallados con pasos numerados, lista de archivos y decisiones de stack tecnológico. NO crees archivos — solo planifica.",
  },
  coder: {
    label: "Programador",
    icon: "💻",
    color: "#3b82f6",
    defaultPrompt:
      "Eres un desarrollador full-stack experto. Escribe código completo y de calidad producción. Crea todos los archivos necesarios con estructura apropiada, manejo de errores y tipos.",
  },
  reviewer: {
    label: "Revisor",
    icon: "🔍",
    color: "#ef4444",
    defaultPrompt:
      "Eres un revisor de código senior. Revisa el código en busca de bugs, vulnerabilidades de seguridad y mejoras. Clasifica por severidad: crítico / advertencia / info. NO modifiques archivos.",
  },
  designer: {
    label: "Diseñador",
    icon: "🎨",
    color: "#f59e0b",
    defaultPrompt:
      "Eres un diseñador UI/UX. Diseña interfaces, crea CSS, elige paletas de colores y asegura diseño responsivo. Enfócate en accesibilidad y estética moderna.",
  },
  devops: {
    label: "DevOps",
    icon: "⚙️",
    color: "#10b981",
    defaultPrompt:
      "Eres un ingeniero DevOps. Crea Dockerfiles, pipelines CI/CD, configuraciones de despliegue y scripts de infraestructura. Enfócate en confiabilidad y automatización.",
  },
  tester: {
    label: "Tester",
    icon: "🧪",
    color: "#06b6d4",
    defaultPrompt:
      "Eres un ingeniero QA. Escribe pruebas completas (unitarias, integración, e2e). Identifica casos extremos y asegura cobertura de código. Usa el framework de testing apropiado.",
  },
  custom: {
    label: "Personalizado",
    icon: "🤖",
    color: "#8b5cf6",
    defaultPrompt: "Eres un asistente de IA útil.",
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
