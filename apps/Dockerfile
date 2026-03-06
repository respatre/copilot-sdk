# ─── Stage 1: Build frontend ────────────────────────
FROM node:20-alpine AS web-build
WORKDIR /app/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

# ─── Stage 2: Build server ──────────────────────────
FROM node:20-alpine AS server-build
WORKDIR /app
# Copy SDK source needed for the file: reference
COPY nodejs/ ./nodejs/
WORKDIR /app/server
COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci
COPY apps/server/ ./
RUN npx tsc

# ─── Stage 3: Runtime ───────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy built server
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/

# Copy static frontend
COPY --from=web-build /app/web/out ./web/out

# Create projects directory
RUN mkdir -p /app/projects

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "dist/index.js"]
