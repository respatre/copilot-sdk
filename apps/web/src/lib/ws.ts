import { getStoredToken } from "./api";

/**
 * Builds a WebSocket URL that works in both local dev and production.
 * - Local dev: when frontend runs on :3000, route WS directly to backend :3001.
 * - Production: keep same host/port unless NEXT_PUBLIC_WS_URL is explicitly set.
 */
export function buildWebSocketUrl(path = "/ws"): string {
  const token = getStoredToken();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";

  const explicitBase = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicitBase) {
    const base = explicitBase.replace(/\/$/, "");
    return `${base}${path}${tokenParam}`;
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const currentPort = window.location.port;
  const port = currentPort === "3000" ? "3001" : currentPort;
  const hostWithPort = port ? `${host}:${port}` : host;

  return `${proto}//${hostWithPort}${path}${tokenParam}`;
}
