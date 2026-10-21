# syntax=docker/dockerfile:1

# ---- Build: Frontend bauen und den Server samt Abhängigkeiten in eine Datei bündeln ----
FROM node:24-alpine AS build
WORKDIR /app

# Erst nur die Manifeste – so bleibt "npm ci" im Cache, solange sich keine Abhängigkeit ändert.
COPY package.json package-lock.json ./
COPY packages/protocol/package.json packages/protocol/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- Laufzeit: nur Node, das Server-Bundle und die statischen Dateien – kein node_modules ----
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=41400 \
    STATIC_DIR=/app/public
WORKDIR /app

COPY --from=build /app/apps/server/dist/ ./
COPY --from=build /app/apps/web/dist/ ./public/

USER node
EXPOSE 41400
# Prüft nur, ob der Server antwortet – bei HTTPS ohne Zertifikatsprüfung, denn ein Zertifikat für
# die eigene Domain passt nie zu 127.0.0.1.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD NODE_TLS_REJECT_UNAUTHORIZED=0 node -e "const scheme = process.env.TLS_CERT_FILE ? 'https' : 'http'; fetch(scheme + '://127.0.0.1:' + process.env.PORT + '/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--enable-source-maps", "main.js"]
