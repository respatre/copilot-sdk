---
description: Instrucciones de infraestructura — servidores, claves, despliegue, Cloudflare
applyTo: "**"
---

# Infraestructura — Centro de Control

## Idioma

Responder siempre en **español latino**.

## Preferencias del usuario

- **Autonomía total**: Implementar, reiniciar servidores y dejar todo funcionando sin pedir confirmación innecesaria.
- **Siempre verificar**: Después de cada cambio, verificar que la app responde (curl, docker logs, etc.).
- **Confirmar antes de acciones destructivas**: Borrar archivos, bases de datos, etc.

## Ubicación de claves SSH

Las claves SSH están en el workspace CLAVES: `/home/trefactory/CLAVES/keys/`

```
keys/
├── produccion/
│   ├── contabo-key          → Contabo VPS (principal)
│   └── produccion-key       → Oracle (inactiva)
├── vast-ai-key              → GPU Vast.ai
├── pinata/pinata-key        → Oracle Pinata (inactiva)
├── ssd-octo/                → Oracle SSD (inactiva)
├── kines/kines-key          → Oracle Kines (inactiva)
├── orange/orange-key        → Oracle Orange (inactiva)
└── psicologalucero/         → Oracle Psico (inactiva)
```

---

## Servidores activos

### 1. CONTABO VPS — Servidor principal

| Campo           | Valor                                      |
|-----------------|--------------------------------------------|
| IP              | 212.28.191.156                             |
| Usuario SSH     | root                                       |
| Contraseña      | `<ver CLAVES/ACCESOS.txt>`                 |
| Clave SSH       | `/home/trefactory/CLAVES/keys/produccion/contabo-key` |
| OS              | Ubuntu 24.04.4 LTS                         |
| vCPUs           | 4                                          |
| RAM             | 8 GB                                       |
| Disco           | 145 GB SSD                                 |
| Docker          | 29.3.0                                     |
| Docker Compose  | 5.1.0                                      |

**Comando SSH:**
```bash
ssh -i /home/trefactory/CLAVES/keys/produccion/contabo-key root@212.28.191.156
```

**Apps desplegadas:**
- **PinataPoster** → /opt/pinataposter/ → localhost:3010 → https://pinataposter.com
- **DevFlow IDE** → /opt/devflow/apps/ → localhost:3001 → https://dev.codigo13.com

**Cloudflare Tunnel:** `<ver CLAVES/ACCESOS.txt>` (systemd, remotely managed)

### 2. Máquina local — octopus

| Campo     | Valor          |
|-----------|----------------|
| Usuario   | trefactory     |
| Contraseña| `<ver CLAVES/ACCESOS.txt>` |

**Repos locales (código fuente):**
- `/home/trefactory/kines/` — kinesfisio
- `/home/trefactory/Proyectos/orangeaccesorios/` — orange
- `/home/trefactory/psicologalucero/` — psicóloga lucero
- `/home/trefactory/Desktop/COPILOTSDK/apps/` — DevFlow

### 3. GPU Vast.ai — Temporal (alquiler por hora)

| Campo     | Valor                               |
|-----------|-------------------------------------|
| Clave SSH | `/home/trefactory/CLAVES/keys/vast-ai-key` |
| GPU       | NVIDIA RTX 5090 — 32 GB VRAM       |
| CPU       | AMD EPYC 9754 (~61 vCPUs)          |
| RAM       | 98 GB                               |
| Ollama    | 0.17.5 (qwen2.5-coder:32b, deepseek-r1:32b) |
| Estado    | ⏸ APAGADA (IP/puerto cambian cada vez) |

**Scripts de GPU:** `/home/trefactory/CLAVES/gpu/`
- `bootstrap-gpu.sh` — Setup inicial de una VM nueva
- `conectar-gpu.sh` — Conectar SSH a la GPU activa

---

## DevFlow — Despliegue

### Credenciales de la app
- **Usuario:** admin
- **Contraseña:** `<ver CLAVES/ACCESOS.txt>`
- **JWT Secret:** `<ver .env en servidor>`
- **GitHub Token (Copilot):** `<ver CLAVES/ACCESOS.txt>` (cuenta: octostar-lab)

### Flujo de despliegue
1. Editar código en `/home/trefactory/Desktop/COPILOTSDK/apps/`
2. Sincronizar archivos modificados al servidor:
   ```bash
   rsync -avz -e "ssh -i /home/trefactory/CLAVES/keys/produccion/contabo-key" \
     <archivos> root@212.28.191.156:/opt/devflow/apps/
   ```
3. Rebuild en el servidor:
   ```bash
   ssh -i /home/trefactory/CLAVES/keys/produccion/contabo-key root@212.28.191.156 \
     'cd /opt/devflow/apps && docker compose build --no-cache && docker compose up -d'
   ```
4. Verificar:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://dev.codigo13.com/
   ssh -i /home/trefactory/CLAVES/keys/produccion/contabo-key root@212.28.191.156 \
     'docker logs $(docker ps -q --filter ancestor=apps-devflow | head -1) --tail 20'
   ```

### Estructura Docker
- **Dockerfile:** 3 stages (web build → SDK+server build → runtime), Node 22
- **Puerto:** 3001 (Express sirve frontend estático + API + WebSocket)
- **docker-compose.yml:** env vars desde `.env`
- **Env vars en servidor:** `/opt/devflow/apps/.env`

### URL pública
- https://dev.codigo13.com/ — via Cloudflare Tunnel → localhost:3001

---

## Cloudflare

| Dominio                | Zone ID                              | API Token                                      |
|------------------------|--------------------------------------|-------------------------------------------------|
| codigo13.com           | `<ver CLAVES/ACCESOS.txt>`           | `<ver CLAVES/ACCESOS.txt>`                      |
| orangeaccesorios.com   | `<ver CLAVES/ACCESOS.txt>`           | `<ver CLAVES/ACCESOS.txt>`                      |
| consultoriolucero.com  | `<ver CLAVES/ACCESOS.txt>`           | `<ver CLAVES/ACCESOS.txt>`                      |
| pinataposter.com       | `<ver CLAVES/ACCESOS.txt>`           | (mismo tunnel)                                  |

**Account ID:** `<ver CLAVES/ACCESOS.txt>`
**Zero Trust Token:** `<ver CLAVES/ACCESOS.txt>`

### Subdominios activos
| Subdominio              | Estado    | Destino              |
|-------------------------|-----------|----------------------|
| dev.codigo13.com        | ✅ online | Tunnel → Contabo :3001 |
| pinataposter.com        | ✅ online | Tunnel → Contabo :3010 |
| www.pinataposter.com    | ✅ online | Tunnel → Contabo :3010 |

### Subdominios caídos (Oracle perdido, pendiente migración)
- kines.codigo13.com, encuestas.codigo13.com, gitea.codigo13.com
- orangeaccesorios.com, www/admin.orangeaccesorios.com
- consultoriolucero.com, www.consultoriolucero.com
- n8n.codigo13.com, ceo.codigo13.com

---

## API Keys

| Servicio         | Key / Token                                                        |
|------------------|--------------------------------------------------------------------|
| OpenRouter       | `<ver CLAVES/ACCESOS.txt>`                                         |
| GitHub (Copilot) | `<ver CLAVES/ACCESOS.txt>`                                         |
| Telegram Bot     | `<ver CLAVES/ACCESOS.txt>`                                         |
| Gitea            | `<ver CLAVES/ACCESOS.txt>` (inactivo)                              |

---

## Oracle Cloud — PERDIDO

Cuenta `octo@mipsmx.com` suspendida desde 2026-03-06. No autentica.

**Lo que se perdió:**
- DBs PostgreSQL (kines, orange, psico, n8n)
- Workflows n8n (6 workflows)
- Gitea + repos remotos
- Archivos de usuarios, backups

**Lo que NO se perdió (local):**
- Código fuente de los 3 proyectos (repos git completos)
- Claves SSH y configuración

---

## Monitor de infraestructura

Los archivos de estado viven en: `/home/trefactory/CLAVES/monitor/`

**Regla**: Cada vez que se instale, configure, elimine o modifique algo en la infraestructura, actualizar los archivos de `monitor/` correspondientes.

| Archivo              | Contenido                          |
|----------------------|------------------------------------|
| INFRAESTRUCTURA.txt  | Resumen general de todo            |
| PRODUCTION.txt       | Contabo VPS                        |
| OCTOPUS.txt          | Máquina local                      |
| GPU.txt              | GPU Vast.ai                        |
| DOMINIOS.txt         | DNS y Cloudflare Tunnels           |
| API-KEYS.txt         | API keys y tokens                  |
| DIAGRAMA.txt         | Diagrama visual ASCII              |
| ORACLE.txt           | Oracle Cloud (histórico/perdido)   |
