FROM node:22-bookworm-slim AS production-dependencies

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
# sqlite3's remote prebuild may target a newer glibc than this Debian runtime.
# Force node-gyp to compile the native addon against this builder's Bookworm
# toolchain; this stage and the runtime stage use the exact same base image.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/* \
  && npm_config_build_from_source=true npm_config_python=/usr/bin/python3 npm ci --omit=dev --workspace=@floora/api --include-workspace-root=false

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV API_PORT=3001
ENV DATABASE_PATH=/app/.data/floora.sqlite3
WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node apps/api/package.json ./apps/api/package.json
COPY --chown=node:node apps/api/src ./apps/api/src
RUN mkdir -p /app/.data && chown node:node /app/.data

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "apps/api/src/server.js"]
