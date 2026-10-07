# Threadline gateway — cloud mode (Photon Spectrum Cloud iMessage + Telegram).
# Build from the REPO ROOT:  docker build -f apps/gateway/Dockerfile -t threadline-gateway .
# Run:  docker run -p 3100:3100 -v threadline-data:/data -e PHOTON_PROJECT_ID=... -e PHOTON_PROJECT_SECRET=... threadline-gateway
FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.4.2 --activate

# Dependency layer. --no-optional keeps @spectrum-ts/imessage-local (macOS-only, native better-sqlite3) out of the image.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY apps/gateway/package.json apps/gateway/
RUN pnpm install --frozen-lockfile --no-optional --filter "@threadline/gateway..."

COPY packages/db packages/db
COPY packages/core packages/core
COPY apps/gateway apps/gateway

ENV NODE_ENV=production \
    NODE_NO_WARNINGS=1 \
    GATEWAY_MODE=cloud \
    GATEWAY_INGEST=stream \
    GATEWAY_PORT=3100 \
    THREADLINE_DB=/data/threadline.db
VOLUME /data
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@threadline/gateway", "start"]
