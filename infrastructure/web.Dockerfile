# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build

ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false
WORKDIR /build

COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
RUN if [ -f apps/web/package-lock.json ]; then npm ci --prefix apps/web; else npm install --prefix apps/web; fi

COPY apps/web ./apps/web
COPY packages ./packages
RUN npm run build --prefix apps/web

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime

COPY infrastructure/web.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /build/apps/web/dist /usr/share/nginx/html

USER 101:101
EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD ["wget", "--quiet", "--tries=1", "--spider", "http://127.0.0.1:4173/healthz"]

CMD ["nginx", "-g", "daemon off;"]

