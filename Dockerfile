FROM oven/bun:1-alpine AS base
WORKDIR /app

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Runtime deps (includes drizzle-kit for prestart migrations)
COPY --from=deps /app/node_modules ./node_modules

# Built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Config & source needed for migrations
COPY package.json ./
COPY drizzle.config.ts ./
COPY src/db ./src/db

EXPOSE 3000

# prestart runs drizzle-kit push --force before next start
CMD ["bun", "start"]
