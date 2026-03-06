import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "./types.js";

const CONFIG_PATH = path.resolve(
  process.env.PROJECTS_DIR || "./projects",
  "../config.json",
);

const DEFAULT_CONFIG: AppConfig = {
  defaultProvider: "copilot",
  providers: {
    copilot: {
      type: "openai",
      label: "GitHub Copilot",
    },
    ollama: {
      type: "openai",
      label: "Ollama (Local)",
      baseUrl: "http://localhost:11434/v1",
    },
  },
};

let cached: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (cached) return cached;
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    cached = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    cached = structuredClone(DEFAULT_CONFIG);
  }
  return cached!;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  cached = config;
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getProviderSdkConfig(
  config: AppConfig,
  providerName?: string,
): Record<string, unknown> | undefined {
  const name = providerName || config.defaultProvider;
  if (name === "copilot" || !name) return undefined;

  const prov = config.providers[name];
  if (!prov) return undefined;

  const sdk: Record<string, unknown> = { type: prov.type };
  if (prov.baseUrl) sdk.baseUrl = prov.baseUrl;
  if (prov.apiKey) sdk.apiKey = prov.apiKey;
  if (prov.wireApi) sdk.wireApi = prov.wireApi;
  return sdk;
}
