import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { reconnectCopilot } from "./copilot.js";
import { verifyWsToken } from "./middleware/auth.js";
import {
  getActiveSession,
  resumeProject,
  setProjectBroadcast,
} from "./sessions.js";
import type { WsIncoming, WsOutgoing } from "./types.js";

const clients = new Set<WebSocket>();
const projectClients = new Map<string, Set<WebSocket>>();

/** Subscribe a WebSocket client to receive events for a specific project */
function subscribeToProject(ws: WebSocket, projectId: string): void {
  if (!projectClients.has(projectId)) {
    projectClients.set(projectId, new Set());
  }
  projectClients.get(projectId)!.add(ws);
}

/** Remove a WebSocket client from all project subscriptions */
function unsubscribeAll(ws: WebSocket): void {
  for (const [, subs] of projectClients) {
    subs.delete(ws);
  }
}

/** Send a message only to clients subscribed to a specific project */
function broadcastToProject(projectId: string, msg: WsOutgoing): void {
  const subs = projectClients.get(projectId);
  if (!subs) return;
  const payload = JSON.stringify({ ...msg, projectId });
  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

/** Global broadcast — used for file watcher events */
export function broadcast(msg: WsOutgoing): void {
  const payload = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    // Verify auth token on WebSocket upgrade
    if (!verifyWsToken(req.url || "")) {
      ws.close(4001, "Unauthorized");
      return;
    }

    clients.add(ws);
    console.log("[ws] client connected —", clients.size, "total");

    ws.on("message", async (raw) => {
      let msg: WsIncoming;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        return;
      }

      if (msg.type === "chat" && msg.projectId && msg.prompt) {
        await handleChat(ws, msg.projectId, msg.prompt);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      unsubscribeAll(ws);
      console.log("[ws] client disconnected —", clients.size, "total");
    });
  });

  console.log("[ws] WebSocket server ready on /ws");
}

async function handleChat(
  ws: WebSocket,
  projectId: string,
  prompt: string,
): Promise<void> {
  // Subscribe this client to the project's events
  subscribeToProject(ws, projectId);

  // Route session events to subscribed clients only (not global broadcast)
  setProjectBroadcast(projectId, (msg) => broadcastToProject(projectId, msg));

  const sendToClient = (msg: WsOutgoing) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ ...msg, projectId }));
    }
  };

  try {
    // Resume or get existing session
    let session = getActiveSession(projectId);
    if (!session) {
      const entry = await resumeProject(projectId, (msg) =>
        broadcastToProject(projectId, msg),
      );
      session = entry.session;
    }

    await session.send({ prompt });
  } catch (err) {
    const errMsg = String(err);
    // If the CLI connection died, reconnect and retry once
    if (errMsg.includes("disposed") || errMsg.includes("not connected")) {
      console.warn("[ws] connection disposed — reconnecting copilot...");
      try {
        await reconnectCopilot();
        const entry = await resumeProject(projectId, (msg) =>
          broadcastToProject(projectId, msg),
        );
        await entry.session.send({ prompt });
        return; // retry succeeded
      } catch (retryErr) {
        sendToClient({
          type: "error",
          message: `Failed after reconnect: ${String(retryErr)}`,
        });
        return;
      }
    }
    sendToClient({
      type: "error",
      message: `Failed to send message: ${errMsg}`,
    });
  }
}
