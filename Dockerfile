FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY casino-admin-backup-safe-2026-07-31.zip /tmp/casino-admin-backup-safe-2026-07-31.zip
RUN unzip -q /tmp/casino-admin-backup-safe-2026-07-31.zip -d /tmp/archive && \
    cp -a /tmp/archive/source/. /build/ && \
    rm -rf /tmp/archive /tmp/casino-admin-backup-safe-2026-07-31.zip
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
RUN pnpm install --frozen-lockfile
RUN BASE_PATH=/ PORT=3000 pnpm --filter @workspace/casino-dashboard run build && \
    pnpm --filter @workspace/api-server run build

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends nginx gettext-base && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /build/artifacts/api-server/dist ./api/dist
COPY --from=build /build/artifacts/casino-dashboard/dist/public ./public
COPY railway-nginx.conf.template /etc/nginx/templates/default.conf.template
COPY railway-entrypoint.sh /usr/local/bin/railway-entrypoint
RUN chmod +x /usr/local/bin/railway-entrypoint
ENV NODE_ENV=production
CMD ["/usr/local/bin/railway-entrypoint"]
