# syntax=docker/dockerfile:1.7

FROM node:24.13.0-bookworm-slim AS dependencies
WORKDIR /workspace/apps/web
COPY packages/database/package.json packages/database/package-lock.json ../../packages/database/
RUN --mount=type=cache,target=/root/.npm npm ci --prefix ../../packages/database --no-audit --no-fund
COPY packages/database/ ../../packages/database/
COPY apps/web/package.json apps/web/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:24.13.0-bookworm-slim AS builder
WORKDIR /workspace/apps/web
ENV NEXT_TELEMETRY_DISABLED=1 \
    APP_ENV=production \
    CATALOG_DATA_SOURCE=postgres \
    DATABASE_URL=postgresql://build-only:build-only@127.0.0.1:5432/build-only
COPY --from=dependencies /workspace/apps/web/node_modules ./node_modules
COPY --from=dependencies /workspace/packages/database/node_modules ../../packages/database/node_modules
COPY packages/database/ ../../packages/database/
COPY apps/web/ ./
# Webpack avoids Turbopack's build-time worker port and is predictable on locked-down hosts.
RUN npm run build -- --webpack

FROM node:24.13.0-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /var/lib/aad/import-staging \
    && chown nextjs:nodejs /var/lib/aad/import-staging

COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /workspace/apps/web/.next/static ./apps/web/.next/static

USER nextjs
WORKDIR /app/apps/web
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
