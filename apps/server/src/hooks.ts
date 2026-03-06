import type { SessionConfig } from "@github/copilot-sdk";
import type { WsOutgoing } from "./types.js";

export function createHooks(
  broadcast: (msg: WsOutgoing) => void,
): NonNullable<SessionConfig["hooks"]> {
  return {
    onPreToolUse: async (input) => {
      broadcast({
        type: "tool_start",
        toolName: (input as { toolName: string }).toolName,
        args: (input as { toolArgs: unknown }).toolArgs,
      });
      return { permissionDecision: "allow" as const };
    },

    onPostToolUse: async (input) => {
      broadcast({
        type: "tool_complete",
        toolName: (input as { toolName: string }).toolName,
        success: true,
      });
    },

    onErrorOccurred: async (input) => {
      const err = input as {
        error: string;
        errorContext: string;
        recoverable: boolean;
      };
      broadcast({
        type: "error",
        message: String(err.error),
        context: err.errorContext,
      });
      return err.recoverable
        ? { errorHandling: "retry" as const, retryCount: 1 }
        : { errorHandling: "abort" as const };
    },
  };
}
