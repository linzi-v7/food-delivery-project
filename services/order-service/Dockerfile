# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Builder — compile TypeScript + generate Prisma client
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for Prisma engine compilation
RUN apk add --no-cache openssl python3 make g++

# Package files first → layer cache hit when only source changes
COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --no-audit --no-fund

# Copy source and build config
COPY tsconfig.json tsconfig.prod.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY prisma.config.ts ./

# Prisma config requires DATABASE_URL to exist even for generate (no real DB needed)
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/db

# Generate Prisma client first (needed for TypeScript compilation)
# Then build with production tsconfig (no declarations, no source maps)
RUN npm run prisma:generate && \
    npx tsc -p tsconfig.prod.json

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

# Runtime dependencies only
RUN apk add --no-cache openssl dumb-init

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# --chown avoids a separate RUN chown layer
COPY --chown=appuser:appgroup --from=prod-deps /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=builder /app/dist ./dist
COPY --chown=appuser:appgroup --from=builder /app/prisma ./prisma
COPY --chown=appuser:appgroup --from=builder /app/prisma.config.ts ./
COPY --chown=appuser:appgroup package.json ./

USER appuser

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# dumb-init ensures proper SIGTERM forwarding
# Local prisma binary avoids npx overhead
CMD ["dumb-init", "sh", "-c", "for i in $(seq 1 30); do ./node_modules/.bin/prisma db push --accept-data-loss && break; echo 'Waiting for database...'; sleep 2; done && node dist/index.js"]
