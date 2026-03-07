# ─── Stage 1: Build frontend ────────────────────────
FROM node:22-alpine AS web-build
WORKDIR /app/web
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

# ─── Stage 2: Build SDK + server ────────────────────
FROM node:22-alpine AS server-build
WORKDIR /build

# Build SDK first (server depends on it via file:../../nodejs)
COPY nodejs/ ./nodejs/
WORKDIR /build/nodejs
RUN npm ci
RUN npm run build

# Now build server (file:../../nodejs will resolve to /build/nodejs with dist/)
WORKDIR /build
COPY apps/server/ ./apps/server/
WORKDIR /build/apps/server
RUN npm ci
RUN npx tsc

# ─── Stage 3: Runtime ───────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Copy built server
COPY --from=server-build /build/apps/server/dist ./server/dist
COPY --from=server-build /build/apps/server/node_modules ./server/node_modules
COPY --from=server-build /build/apps/server/package.json ./server/

# Copy built SDK (file: dep creates symlink that breaks across stages)
COPY --from=server-build /build/nodejs/dist ./nodejs/dist
COPY --from=server-build /build/nodejs/package.json ./nodejs/
COPY --from=server-build /build/nodejs/node_modules ./nodejs/node_modules
# Fix the symlink: replace it with actual SDK files
RUN rm -rf /app/server/node_modules/@github/copilot-sdk && \
    ln -s /app/nodejs /app/server/node_modules/@github/copilot-sdk

# Copy static frontend
COPY --from=web-build /app/web/out ./web/out

# Create projects directory
RUN mkdir -p /app/projects

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "dist/index.js"]
