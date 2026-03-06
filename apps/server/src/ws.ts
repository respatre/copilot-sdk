import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { getActiveSession, resumeProject } from "./sessions.js";
import type { WsIncoming, WsOutgoing } from "./types.js";

const clients = new Set<WebSocket>();

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

  wss.on("connection", (ws) => {
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
  const sendToClient = (msg: WsOutgoing) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  try {
    // Resume or get existing session
    let session = getActiveSession(projectId);
    if (!session) {
      const entry = await resumeProject(projectId, sendToClient);
      session = entry.session;
    }

    await session.send({ prompt });
  } catch (err) {
    sendToClient({
      type: "error",
      message: `Failed to send message: ${String(err)}`,
    });
  }
}
