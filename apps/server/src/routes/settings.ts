import { Router } from "express";
import { getConfig, saveConfig } from "../config.js";
import { getClient } from "../copilot.js";
import type { AppConfig, ProviderConfig } from "../types.js";

export function settingsRoutes(): Router {
  const router = Router();

  // GET /api/settings — current config
  router.get("/", async (_req, res) => {
    try {
      const config = await getConfig();
      // Strip API keys from response
      const safe = structuredClone(config);
      for (const p of Object.values(safe.providers)) {
        if (p.apiKey) p.apiKey = "••••••";
      }
      res.json(safe);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // PUT /api/settings — update full config
  router.put("/", async (req, res) => {
    try {
      const body = req.body as Partial<AppConfig>;
      const current = await getConfig();

      if (body.defaultProvider) {
        current.defaultProvider = body.defaultProvider;
      }

      if (body.providers) {
        // Merge — preserve existing apiKey if masked
        for (const [name, prov] of Object.entries(body.providers)) {
          if (prov.apiKey === "••••••" && current.providers[name]?.apiKey) {
            prov.apiKey = current.providers[name].apiKey;
          }
          current.providers[name] = prov;
        }
      }

      await saveConfig(current);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/settings/providers/:name — add/update a single provider
  router.post("/providers/:name", async (req, res) => {
    try {
      const name = req.params.name;
      const prov = req.body as ProviderConfig;
      if (!prov.type || !prov.label) {
        res.status(400).json({ error: "type and label are required" });
        return;
      }
      const config = await getConfig();
      config.providers[name] = prov;
      await saveConfig(config);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // DELETE /api/settings/providers/:name — remove a provider
  router.delete("/providers/:name", async (req, res) => {
    try {
      const name = req.params.name;
      if (name === "copilot") {
        res
          .status(400)
          .json({ error: "Cannot remove the default copilot provider" });
        return;
      }
      const config = await getConfig();
      delete config.providers[name];
      if (config.defaultProvider === name) {
        config.defaultProvider = "copilot";
      }
      await saveConfig(config);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/settings/providers/:name/test — test connectivity
  router.post("/providers/:name/test", async (req, res) => {
    try {
      const config = await getConfig();
      const prov = config.providers[req.params.name];

      if (!prov) {
        res.json({ ok: false, error: "Provider not found" });
        return;
      }

      // For copilot, ping via the SDK
      if (req.params.name === "copilot") {
        try {
          const status = await getClient().ping();
          res.json({ ok: true, message: status.message });
        } catch (err) {
          res.json({ ok: false, error: String(err) });
        }
        return;
      }

      // For BYOK providers, hit the models endpoint
      if (!prov.baseUrl) {
        res.json({ ok: false, error: "No baseUrl configured" });
        return;
      }

      // Ollama and OpenAI-compatible: GET /v1/models or /api/tags
      const baseUrl = prov.baseUrl.replace(/\/v1\/?$/, "");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      try {
        const r = await fetch(`${baseUrl}/api/tags`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (r.ok) {
          res.json({ ok: true, message: "Connected" });
        } else {
          // Try OpenAI-style /v1/models
          const r2 = await fetch(`${prov.baseUrl}/models`, {
            signal: AbortSignal.timeout(5000),
            headers: prov.apiKey
              ? { Authorization: `Bearer ${prov.apiKey}` }
              : {},
          });
          res.json({
            ok: r2.ok,
            error: r2.ok ? undefined : `HTTP ${r2.status}`,
          });
        }
      } catch (err) {
        clearTimeout(timeout);
        res.json({
          ok: false,
          error: "Connection failed — is the service running?",
        });
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // GET /api/settings/providers/:name/models — list available models
  router.get("/providers/:name/models", async (req, res) => {
    try {
      const config = await getConfig();
      const prov = config.providers[req.params.name];

      if (!prov) {
        res.status(404).json({ error: "Provider not found" });
        return;
      }

      // Copilot: use SDK
      if (req.params.name === "copilot") {
        try {
          const models = await getClient().listModels();
          res.json(models);
        } catch (err) {
          res.status(500).json({ error: String(err) });
        }
        return;
      }

      if (!prov.baseUrl) {
        res.json([]);
        return;
      }

      // Try Ollama /api/tags first
      const baseUrl = prov.baseUrl.replace(/\/v1\/?$/, "");
      try {
        const r = await fetch(`${baseUrl}/api/tags`);
        if (r.ok) {
          const data = (await r.json()) as {
            models?: { name: string; size?: number }[];
          };
          const models = (data.models || []).map((m) => ({
            id: m.name,
            name: m.name,
          }));
          res.json(models);
          return;
        }
      } catch {
        // fall through to OpenAI endpoint
      }

      // OpenAI-compatible /v1/models
      try {
        const headers: Record<string, string> = {};
        if (prov.apiKey) headers.Authorization = `Bearer ${prov.apiKey}`;
        const r = await fetch(`${prov.baseUrl}/models`, { headers });
        if (r.ok) {
          const data = (await r.json()) as {
            data?: { id: string }[];
          };
          const models = (data.data || []).map((m) => ({
            id: m.id,
            name: m.id,
          }));
          res.json(models);
          return;
        }
      } catch {
        // no models available
      }

      res.json([]);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
