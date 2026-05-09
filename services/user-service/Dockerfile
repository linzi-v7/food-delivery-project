# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Builder — install all deps, compile TypeScript
# Drizzle is pure JS — no openssl/python3/make/g++ needed
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Package files first → layer cache hit when only source changes
COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

# Copy source and build config
COPY tsconfig.json tsconfig.prod.json ./
COPY src/ ./src/

RUN npx tsc -p tsconfig.prod.json

# =============================================================================
# Stage 2: Production Dependencies — minimal node_modules
# =============================================================================
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev --no-audit --no-fund

# =============================================================================
# Stage 3: Runtime — minimal production image
# =============================================================================
FROM node:22-alpine AS runtime

# dumb-init ensures proper SIGTERM forwarding
RUN apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# --chown avoids a separate RUN chown layer
COPY --chown=appuser:appgroup --from=prod-deps /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=builder /app/dist ./dist
COPY --chown=appuser:appgroup --from=builder /app/src/db/schema.ts ./src/db/schema.ts
COPY --chown=appuser:appgroup drizzle.config.ts ./
COPY --chown=appuser:appgroup package.json ./

USER appuser

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# dumb-init as PID 1, retry loop for drizzle-kit push then start
CMD ["dumb-init", "sh", "-c", "for i in $(seq 1 30); do npx drizzle-kit push && break; echo 'Waiting for database...'; sleep 2; done && node dist/index.js"]
