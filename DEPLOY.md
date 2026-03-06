# Instrucciones de Push — copilot-sdk

## Remotes

| Remote   | URL                                              | Uso               |
|----------|--------------------------------------------------|--------------------|
| origin   | github.com/respatre/copilot-sdk.git              | Tu repo (push)     |
| upstream | github.com/github/copilot-sdk.git                | Repo original (pull)|

## Push rápido (tus cambios)

```bash
cd ~/Desktop/COPILOTSDK
git add -A
git commit -m "descripción del cambio"
git push origin main
```

## Sincronizar con upstream (repo oficial de GitHub)

```bash
git fetch upstream
git merge upstream/main
git push origin main
```

## Estructura del proyecto

```
.
├── apps/               ← Tu código custom
│   ├── server/         ← Backend Node.js (Express + Copilot SDK)
│   ├── web/            ← Frontend Next.js
│   ├── Dockerfile
│   └── docker-compose.yml
├── python/             ← SDK oficial (Python)
├── nodejs/             ← SDK oficial (Node.js)
├── go/                 ← SDK oficial (Go)
├── dotnet/             ← SDK oficial (.NET)
└── docs/               ← Documentación oficial
```
