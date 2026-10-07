# syntax=docker/dockerfile:1.7
# Threadline: one container running web (:3000) + gateway (:3100) + worker (:3200) under scripts/start-all.mjs.
# Build from the repo root:   docker build -f deploy/Dockerfile -t threadline .
# Optional: --build-arg INSTALL_CHROMIUM=1 enables core's headless-browser crawl fallback (+~300 MB).
FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 NODE_NO_WARNINGS=1
RUN npm install -g pnpm@12.4.2
WORKDIR /app

# ---------- build ----------
FROM base AS build
# toolchain only for native optional deps (better-sqlite3 via @spectrum-ts/imessage-local, which is macOS-only at runtime)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/gateway/package.json apps/gateway/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
# next build may touch the DB while collecting page data → point it at a throwaway file
RUN THREADLINE_DB=/tmp/build.db pnpm --filter @threadline/web build && rm -f /tmp/build.db*

# ---------- runtime ----------
FROM base AS runtime
ARG INSTALL_CHROMIUM=0
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates sqlite3 tini curl $( [ "$INSTALL_CHROMIUM" = "1" ] && echo chromium fonts-liberation ) \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
ENV NODE_ENV=production \
    THREADLINE_DB=/data/threadline.db \
    GATEWAY_MODE=cloud \
    GATEWAY_HOST=0.0.0.0 \
    WEB_PORT=3000 GATEWAY_PORT=3100 WORKER_PORT=3200
RUN if [ "$INSTALL_CHROMIUM" = "1" ]; then echo "CHROME_PATH=/usr/bin/chromium" >> /app/.env; fi
VOLUME /data
EXPOSE 3000 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:3000/ >/dev/null && curl -fsS http://localhost:3200/health >/dev/null || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["node", "scripts/start-all.mjs"]
