import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

// Auth credentials from environment
const DEVFLOW_USER = process.env.DEVFLOW_USER || "admin";
const DEVFLOW_PASS = process.env.DEVFLOW_PASS || "";
const JWT_SECRET =
  process.env.DEVFLOW_JWT_SECRET || crypto.randomBytes(32).toString("hex");
const TOKEN_EXPIRY = "7d";

export function login(
  user: string,
  pass: string,
): { token: string } | null {
  if (!DEVFLOW_PASS) return null; // Auth disabled if no password set
  if (user !== DEVFLOW_USER || pass !== DEVFLOW_PASS) return null;

  const token = jwt.sign({ sub: user }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
  return { token };
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }
}

export function isAuthEnabled(): boolean {
  return !!DEVFLOW_PASS;
}

/** Express middleware — skips if auth is disabled (no DEVFLOW_PASS set) */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isAuthEnabled()) return next();

  // Allow login and health routes through
  if (req.path === "/api/devflow/login" || req.path === "/api/health") {
    return next();
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const payload = verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  next();
}

/** Verify a WebSocket connection token (from query string) */
export function verifyWsToken(url: string): boolean {
  if (!isAuthEnabled()) return true;
  try {
    const parsed = new URL(url, "http://localhost");
    const token = parsed.searchParams.get("token");
    if (!token) return false;
    return !!verifyToken(token);
  } catch {
    return false;
  }
}
