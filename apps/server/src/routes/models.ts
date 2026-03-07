import { Router } from "express";
import { getConfig } from "../config.js";
import { getClient } from "../copilot.js";

export function modelRoutes(): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const providerName = (req.query.provider as string) || undefined;

    try {
      // If a specific BYOK provider is requested, fetch from its endpoint
      if (providerName && providerName !== "copilot") {
        const config = await getConfig();
        const prov = config.providers[providerName];

        if (!prov?.baseUrl) {
          res.json([]);
          return;
        }

        // Try Ollama /api/tags
        const baseUrl = prov.baseUrl.replace(/\/v1\/?$/, "");
        try {
          const r = await fetch(`${baseUrl}/api/tags`);
          if (r.ok) {
            const data = (await r.json()) as { models?: { name: string }[] };
            res.json(
              (data.models || []).map((m) => ({ id: m.name, name: m.name })),
            );
            return;
          }
        } catch {
          /* fall through */
        }

        // OpenAI-compatible /v1/models
        try {
          const headers: Record<string, string> = {};
          if (prov.apiKey) headers.Authorization = `Bearer ${prov.apiKey}`;
          const r = await fetch(`${prov.baseUrl}/models`, { headers });
          if (r.ok) {
            const data = (await r.json()) as { data?: { id: string }[] };
            res.json((data.data || []).map((m) => ({ id: m.id, name: m.id })));
            return;
          }
        } catch {
          /* no models */
        }

        res.json([]);
        return;
      }

      // Default: Copilot SDK models
      try {
        const models = await getClient().listModels();
        res.json(models);
        return;
      } catch (listErr) {
        console.warn(
          "[models] listModels failed, using fallback:",
          String(listErr).split("\n")[0],
        );
      }

      // Fallback: well-known Copilot models when the API rejects the list call
      res.json([
        { id: "gpt-4.1", name: "GPT-4.1" },
        { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
        { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
        { id: "gpt-4o", name: "GPT-4o" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini" },
        { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
        { id: "claude-sonnet-4-thinking", name: "Claude Sonnet 4 Thinking" },
        { id: "o4-mini", name: "o4-mini" },
        { id: "o3-mini", name: "o3-mini" },
      ]);
    } catch (err) {
      console.error("[models] error:", err);
      res.json([]);
    }
  });

  return router;
}
