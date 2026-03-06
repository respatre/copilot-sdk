---
description: Instrucciones de desarrollo de DevFlow — app custom sobre Copilot SDK
applyTo: 'apps/**'
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
│       ├── copilot.ts     → Inicialización de CopilotClient
│       ├── agents.ts      → Definición de agentes
│       ├── hooks.ts       → Hooks del SDK (eventos de sesión)
│       ├── sessions.ts    → Gestión de sesiones Copilot
│       ├── watcher.ts     → File watcher (chokidar)
│       ├── ws.ts          → WebSocket server (broadcast)
│       ├── types.ts       → Tipos compartidos
│       └── routes/
│           ├── auth.ts    → Autenticación GitHub
│           ├── models.ts  → Listado de modelos
│           └── projects.ts → CRUD de proyectos
├── web/             ← Frontend Next.js (export estático)
│   └── src/
│       ├── app/           → Pages (App Router)
│       ├── components/    → UI components
│       ├── hooks/         → useChat, useFiles
│       └── lib/api.ts     → Cliente HTTP al server
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
- **Tunnel ID**: f5bacb82-8934-44f0-a6d6-2e8732dfbf47
- **Destino**: localhost:3001 (máquina local octopus)
- **Comando para iniciar tunnel**:
  ```bash
  cloudflared tunnel --no-autoupdate run --token eyJhIjoiZGEyNjI0MjVjM2RhMDhhODEwYzY3Zjk3YmI4NzYzZGIiLCJ0IjoiZjViYWNiODItODkzNC00NGYwLWE2ZDYtMmU4NzMyZGZiZjQ3IiwicyI6Ink3TDhialJ1bHhzOFZnSzM4T2Z4YWd2dUFrMno4VHRwcHBYQUYzTGhyQlk9In0=
  ```

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| GITHUB_TOKEN | Sí | Token de GitHub con acceso a Copilot |
| PORT | No | Puerto del server (default: 3001) |
| CLI_URL | No | URL de un Copilot CLI externo |

## Flujo de datos

```
Browser → Next.js (estático) → HTTP/WS → Express → @github/copilot-sdk → Copilot CLI → LLM
```

## Git remotes

| Remote   | URL | Uso |
|----------|-----|-----|
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
