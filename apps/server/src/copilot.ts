import {
  CopilotClient,
  type CopilotSession,
  type SessionConfig,
  type SessionEvent,
  approveAll,
} from "@github/copilot-sdk";
import { agents } from "./agents.js";
import { getConfig, getProviderSdkConfig } from "./config.js";
import { createHooks } from "./hooks.js";
import type { WsOutgoing } from "./types.js";

let client: CopilotClient | null = null;

export async function initCopilot(): Promise<CopilotClient> {
  if (client) return client;

  const opts: Record<string, unknown> = {};

  if (process.env.GITHUB_TOKEN) {
    Object.assign(opts, {
      githubToken: process.env.GITHUB_TOKEN,
      useLoggedInUser: false,
    });
  }

  client = new CopilotClient(opts);
  await client.start();

  const status = await client.ping();
  console.log("[copilot] connected — ping:", status.message);

  return client;
}

export function getClient(): CopilotClient {
  if (!client)
    throw new Error("CopilotClient not initialized. Call initCopilot() first.");
  return client;
}

export async function stopCopilot(): Promise<void> {
  if (client) {
    await client.stop();
    client = null;
  }
}

export async function buildSessionConfig(
  projectDir: string,
  model: string,
  broadcast: (msg: WsOutgoing) => void,
  providerName?: string,
): Promise<SessionConfig> {
  const config = await getConfig();
  const provider = getProviderSdkConfig(config, providerName);

  return {
    model,
    streaming: true,
    ...(provider ? { provider } : {}),
    onPermissionRequest: approveAll,
    workingDirectory: projectDir,
    infiniteSessions: {
      enabled: true,
      backgroundCompactionThreshold: 0.8,
      bufferExhaustionThreshold: 0.95,
    },
    systemMessage: {
      mode: "append",
      content: `You are a full-stack software engineer working inside a mobile IDE called DevFlow.

RULES:
- Always generate complete, functional code — never pseudocode or placeholders.
- Create the full file structure needed for the project.
- Include package.json, config files, and everything required to run the project.
- Use the file editing tools to create and modify files.
- After each change, briefly explain what you did.
- When asked to create a project, create ALL necessary files.
- Respond in the same language the user writes in.
- Keep responses concise — the user is on a mobile device.`,
    },
    customAgents: agents,
    hooks: createHooks(broadcast),
  } as SessionConfig;
}

export function wireSessionEvents(
  session: CopilotSession,
  broadcast: (msg: WsOutgoing) => void,
): void {
  session.on((event: SessionEvent) => {
    switch (event.type) {
      case "assistant.message_delta":
        broadcast({
          type: "message_delta",
          content: (event.data as { deltaContent?: string }).deltaContent ?? "",
        });
        break;

      case "assistant.message":
        broadcast({
          type: "message_complete",
          content: (event.data as { content?: string }).content ?? "",
        });
        break;

      case "tool.execution_start":
        broadcast({
          type: "tool_start",
          toolName: (event.data as { toolName?: string }).toolName ?? "unknown",
        });
        break;

      case "tool.execution_complete":
        broadcast({
          type: "tool_complete",
          toolName: (event.data as { toolName?: string }).toolName ?? "unknown",
          success: (event.data as { success?: boolean }).success ?? true,
        });
        break;

      case "session.idle":
        broadcast({ type: "session_idle" });
        break;

      case "session.error":
        broadcast({
          type: "error",
          message:
            (event.data as { message?: string }).message ?? "Session error",
        });
        break;
    }
  });
}
