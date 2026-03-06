---
description: Instrucciones de desarrollo de DevFlow — app custom sobre Copilot SDK
applyTo: "apps/**"
---

# DevFlow — Aplicación de desarrollo con Copilot SDK

## Qué es

DevFlow es una app web que usa el GitHub Copilot SDK para crear agentes de IA.
Vive en `apps/` dentro de un fork del repo oficial `github/copilot-sdk`.

## Idioma

Responder siempre en **español latino**.

## Arquitectura

```
apps/
├── server/          ← Backend Express + Copilot SDK + WebSocket
│   └── src/
│       ├── index.ts       → Punto de entrada (Express en puerto 3001)
│       ├── copilot.ts     → Inicialización de CopilotClient + BYOK provider
│       ├── config.ts      → Config persistente (providers, defaults)
│       ├── agents.ts      → Definición de agentes (planner, coder, reviewer)
│       ├── hooks.ts       → Hooks del SDK (eventos de sesión)
│       ├── sessions.ts    → Gestión de sesiones y proyectos
│       ├── watcher.ts     → File watcher (chokidar)
│       ├── ws.ts          → WebSocket server (broadcast)
│       ├── types.ts       → Tipos compartidos (ProviderConfig, AppConfig, etc.)
│       └── routes/
│           ├── auth.ts      → Autenticación GitHub token
│           ├── models.ts    → Listado de modelos (multi-provider)
│           ├── projects.ts  → CRUD de proyectos
│           ├── settings.ts  → Config de providers (CRUD, test, models)
│           ├── github.ts    → OAuth + importar repos
│           └── upload.ts    → Upload ZIP/archivos
├── web/             ← Frontend Next.js (dev con HMR, export estático para prod)
│   └── src/
│       ├── app/
│       │   ├── page.tsx       → Home (login + galería proyectos)
│       │   ├── workspace/     → IDE (chat, files, code)
│       │   └── settings/      → Config de AI providers
│       ├── components/    → UI components (NewProjectModal, ProjectCard, etc.)
│       ├── hooks/         → useChat, useFiles
│       └── lib/api.ts     → Cliente HTTP al server
├── .cloudflared-config.yml → Tunnel Cloudflare (dev.codigo13.com → :3000)
├── Dockerfile         → Multi-stage build (web + server)
├── docker-compose.yml → Servicio en puerto 3001
└── .env.example       → Variables de entorno
```

## Stack técnico

- **Server**: Express + `@github/copilot-sdk` + WebSocket (`ws`) + chokidar
- **Web**: Next.js (output: export, estático) + Tailwind + Prism.js
- **Runtime**: Node.js 20
- **Build**: TypeScript (tsc para server, next build para web)

## Desarrollo local

```bash
# Terminal 1 — Server (con hot reload)
cd apps/server
cp ../.env.example .env   # Poner GITHUB_TOKEN
npm install
npm run dev               # tsx watch → puerto 3001

# Terminal 2 — Frontend
cd apps/web
npm install
npm run dev               # next dev → puerto 3000
```

## Docker (producción)

```bash
cd apps
docker compose up -d --build   # Puerto 3001
```

## Acceso remoto

El servidor de desarrollo está expuesto vía Cloudflare Tunnel:

- **URL pública**: https://dev.codigo13.com
- **Tunnel ID**: 37091b5a-ef8c-46c3-b226-93c33cfacc81
- **Config**: `apps/.cloudflared-config.yml`
- **Destino**: localhost:3000 (Next.js dev con HMR)
- **Proxy API**: Next.js rewrite `/api/*` → `http://localhost:3001/api/*`
- **Comando para iniciar tunnel**:
  ```bash
  cd apps && cloudflared tunnel --config .cloudflared-config.yml run &
  ```

## REGLA OBLIGATORIA: Despliegue automático

**Después de CUALQUIER cambio en `apps/`**, SIEMPRE debo seguir estos pasos antes de reportar al usuario:

1. **Backend** (si cambió `server/`): matar proceso en 3001 y reiniciar con `cd apps/server && npx tsx watch src/index.ts &`
2. **Frontend**: verificar que Next.js dev (3000) esté corriendo. Si no: `cd apps/web && npm run dev &`
3. **Tunnel**: verificar que Cloudflare tunnel esté activo. Si no: `cd apps && cloudflared tunnel --config .cloudflared-config.yml run &`
4. **Verificar**: `curl -s -o /dev/null -w "%{http_code}" https://dev.codigo13.com/` debe dar `200`
5. **Si falla**: diagnosticar y arreglar antes de responder al usuario.

El usuario NUNCA debe hacer nada manualmente. Yo soy 100% autónomo. Él solo supervisa y toma decisiones.

## Variables de entorno

| Variable     | Requerida | Descripción                          |
| ------------ | --------- | ------------------------------------ |
| GITHUB_TOKEN | Sí        | Token de GitHub con acceso a Copilot |
| PORT         | No        | Puerto del server (default: 3001)    |
| CLI_URL      | No        | URL de un Copilot CLI externo        |

## Flujo de datos

```
Browser → Next.js (estático) → HTTP/WS → Express → @github/copilot-sdk → Copilot CLI → LLM
```

## Git remotes

| Remote   | URL                             | Uso                 |
| -------- | ------------------------------- | ------------------- |
| origin   | github.com/respatre/copilot-sdk | Push (nuestro fork) |
| upstream | github.com/github/copilot-sdk   | Pull (repo oficial) |

## Push rápido

```bash
git add -A && git commit -m "descripción" && git push origin main
```

## Sincronizar con upstream

```bash
git fetch upstream && git merge upstream/main && git push origin main
```

## Convenciones

- Todo el código de apps/ es nuestro. El resto (python/, nodejs/, go/, dotnet/, docs/) es del SDK oficial.
- No modificar código del SDK oficial salvo que sea necesario para integración.
- El frontend se exporta como estático (no SSR) — el server Express lo sirve.
- WebSocket se usa para comunicación en tiempo real (chat, eventos de sesión).
