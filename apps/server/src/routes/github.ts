import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { WsOutgoing } from "../types.js";

const PROJECTS_DIR = path.resolve(process.env.PROJECTS_DIR || "./projects");

// OAuth state store (short-lived, in-memory)
const pendingStates = new Map<string, { createdAt: number }>();

// Persist GitHub tokens per-server (single user for now)
let storedGitHubToken: string | null = null;
let storedGitHubUser: GitHubUser | null = null;

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  html_url: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  description: string | null;
  language: string | null;
  default_branch: string;
  updated_at: string;
}

function getClientId(): string {
  const id = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!id) throw new Error("GITHUB_OAUTH_CLIENT_ID not set");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!secret) throw new Error("GITHUB_OAUTH_CLIENT_SECRET not set");
  return secret;
}

export function githubRoutes(broadcast: (msg: WsOutgoing) => void): Router {
  const router = Router();

  // ── OAuth: start flow ──
  router.get("/oauth/start", (_req, res) => {
    try {
      const state = crypto.randomBytes(20).toString("hex");
      pendingStates.set(state, { createdAt: Date.now() });

      // Clean old states (> 10 min)
      for (const [key, val] of pendingStates) {
        if (Date.now() - val.createdAt > 600_000) pendingStates.delete(key);
      }

      const clientId = getClientId();
      const redirectUri = `${process.env.GITHUB_OAUTH_REDIRECT_URI || ""}`;
      const scope = "repo";

      const url = new URL("https://github.com/login/oauth/authorize");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", scope);
      url.searchParams.set("state", state);

      res.json({ url: url.toString() });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── OAuth: callback ──
  router.get("/oauth/callback", async (req, res) => {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state) {
      res.status(400).json({ error: "Missing code or state" });
      return;
    }

    if (!pendingStates.has(state)) {
      res.status(403).json({ error: "Invalid or expired state" });
      return;
    }
    pendingStates.delete(state);

    try {
      // Exchange code for token
      const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: getClientId(),
            client_secret: getClientSecret(),
            code,
            redirect_uri: process.env.GITHUB_OAUTH_REDIRECT_URI || "",
          }),
        },
      );

      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
      };

      if (!tokenData.access_token) {
        res.status(401).json({ error: tokenData.error || "OAuth failed" });
        return;
      }

      storedGitHubToken = tokenData.access_token;

      // Fetch user info
      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${storedGitHubToken}` },
      });
      storedGitHubUser = (await userRes.json()) as GitHubUser;

      // Return an HTML page that sends a message to the opener and closes
      res.type("html").send(`<!DOCTYPE html>
<html><head><title>DevFlow — Connected</title></head>
<body style="background:#0a0a0f;color:#f0f0f5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center">
  <h2>✅ GitHub Connected</h2>
  <p>You can close this window.</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: "github-oauth-success" }, "*");
  }
  setTimeout(() => window.close(), 1500);
</script>
</body></html>`);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── GitHub connection status ──
  router.get("/status", (_req, res) => {
    if (storedGitHubToken && storedGitHubUser) {
      res.json({
        connected: true,
        user: {
          login: storedGitHubUser.login,
          avatar_url: storedGitHubUser.avatar_url,
          name: storedGitHubUser.name,
          html_url: storedGitHubUser.html_url,
        },
      });
    } else {
      res.json({ connected: false });
    }
  });

  // ── Disconnect GitHub ──
  router.post("/disconnect", (_req, res) => {
    storedGitHubToken = null;
    storedGitHubUser = null;
    res.json({ ok: true });
  });

  // ── List user repos ──
  router.get("/repos", async (req, res) => {
    if (!storedGitHubToken) {
      res.status(401).json({ error: "Not connected to GitHub" });
      return;
    }

    const page = parseInt(String(req.query.page || "1"), 10);
    const perPage = parseInt(String(req.query.per_page || "30"), 10);
    const sort = String(req.query.sort || "updated");

    try {
      const ghRes = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=${sort}&affiliation=owner,collaborator`,
        { headers: { Authorization: `Bearer ${storedGitHubToken}` } },
      );

      if (!ghRes.ok) {
        const err = await ghRes.text();
        res.status(ghRes.status).json({ error: err });
        return;
      }

      const repos = (await ghRes.json()) as GitHubRepo[];
      res.json(
        repos.map((r) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          html_url: r.html_url,
          clone_url: r.clone_url,
          description: r.description,
          language: r.language,
          default_branch: r.default_branch,
          updated_at: r.updated_at,
        })),
      );
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ── Clone a repo into a project ──
  router.post("/clone", async (req, res) => {
    if (!storedGitHubToken) {
      res.status(401).json({ error: "Not connected to GitHub" });
      return;
    }

    const { repoFullName, branch } = req.body as {
      repoFullName?: string;
      branch?: string;
    };

    if (
      !repoFullName ||
      !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repoFullName)
    ) {
      res.status(400).json({ error: "Invalid repo name" });
      return;
    }

    const slug = repoFullName.replace("/", "-").toLowerCase();
    const projectDir = path.join(PROJECTS_DIR, slug);

    try {
      // Check if already cloned
      try {
        await fs.access(projectDir);
        res.status(409).json({ error: "Project already exists", slug });
        return;
      } catch {
        // doesn't exist, good
      }

      await fs.mkdir(projectDir, { recursive: true });

      broadcast({ type: "tool_start", toolName: "git-clone" });

      // Clone using authenticated URL
      const cloneUrl = `https://x-access-token:${storedGitHubToken}@github.com/${repoFullName}.git`;
      const branchArg = branch ? `--branch ${branch}` : "";

      const { execSync } = await import("node:child_process");
      execSync(`git clone --depth 1 ${branchArg} ${cloneUrl} .`, {
        cwd: projectDir,
        stdio: "pipe",
        timeout: 120_000,
      });

      // Remove .git to avoid leaking token in config
      await fs.rm(path.join(projectDir, ".git"), {
        recursive: true,
        force: true,
      });

      broadcast({
        type: "tool_complete",
        toolName: "git-clone",
        success: true,
      });

      // Create DevFlow meta
      const { v4: uuidv4 } = await import("uuid");
      const meta = {
        id: uuidv4(),
        name: repoFullName.split("/")[1],
        slug,
        sessionId: "",
        model: "gpt-4.1",
        createdAt: new Date().toISOString(),
        directory: projectDir,
        source: {
          type: "github",
          repo: repoFullName,
          branch: branch || "default",
        },
      };

      await fs.writeFile(
        path.join(projectDir, ".devflow.json"),
        JSON.stringify(meta, null, 2),
      );

      res.status(201).json(meta);
    } catch (err) {
      // Cleanup on failure
      await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
      broadcast({
        type: "error",
        message: `Clone failed: ${String(err)}`,
      });
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
