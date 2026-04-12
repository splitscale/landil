# Landil

Real estate marketplace — Next.js 16 · Better Auth · Drizzle ORM · Supabase · Redis · UploadThing

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 App Router (Turbopack) |
| Auth | Better Auth |
| ORM | Drizzle ORM + drizzle-kit |
| Database | Supabase (PostgreSQL) |
| Cache / Pub-Sub | Redis (ioredis) |
| File uploads | UploadThing |
| UI | Tailwind CSS v4 · shadcn/ui · Radix UI |
| Forms | React Hook Form + Zod |
| Email | Nodemailer (SMTP) |
| E2E tests | Playwright |

---

## Local Development

### Option A — Native (needs external Supabase + Redis)

```bash
cp env.example .env        # fill in all values
bun install
bun db:migrate             # push schema to DB
bun dev                    # http://localhost:3000
```

### Option B — Docker Compose (fully local, no external services)

Spins up Postgres, Redis, and Mailpit (local SMTP) alongside the app.

```bash
cp .env.local.example .env.local   # add UPLOADTHING_TOKEN, Google OAuth creds
docker compose up --build
```

Services:

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |
| Mailpit (SMTP UI) | http://localhost:8025 |

Migrations run automatically on container start via the `prestart` script.

---

## Environment Variables

Copy `env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase pooled connection (runtime, `postgres-js`) |
| `DIRECT_URL` | Supabase direct connection (migrations only, `drizzle-kit`) |
| `BETTER_AUTH_SECRET` | Session signing secret — any random string |
| `NEXT_PUBLIC_BASE_URL` | Base URL e.g. `http://localhost:3000` |
| `UPLOADTHING_TOKEN` | From [uploadthing.com/dashboard](https://uploadthing.com/dashboard) |
| `GOOGLE_CLIENT_ID` | Google OAuth — authorized redirect: `{BASE_URL}/api/auth/callback/google` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `REDIS_URL` | Redis connection e.g. `redis://localhost:6379` |
| `SMTP_HOST` | SMTP host (use `mailpit` hostname when using Docker Compose) |
| `SMTP_PORT` | SMTP port (Mailpit: `1025`) |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials (leave blank for Mailpit) |
| `SMTP_FROM` | From address e.g. `Landil <no-reply@landil.app>` |

---

## Commands

```bash
bun dev              # dev server (Turbopack)
bun build            # production build
bun start            # production server (runs migrations first via prestart)
bun run lint         # ESLint
bun db:migrate       # push schema changes to DB (drizzle-kit push)
bun db:generate      # generate migration files
bun db:studio        # Drizzle Studio UI
bun e2e              # Playwright tests (needs app running)
bun e2e:ui           # Playwright interactive UI
```

---

## Database Migrations

Schema lives in `src/db/schema/`. To add or change tables:

1. Edit or add a schema file under `src/db/schema/`
2. Export it from `src/db/schema/index.ts`
3. Run `bun db:migrate`

`drizzle.config.ts` uses `DIRECT_URL` (not `DATABASE_URL`) — the direct connection is required for migrations; the pooled connection does not support DDL.

---

## Adding Routes

Middleware (`src/proxy.ts`) redirects unauthenticated users to `/signin` by default.

- **Public routes** (no auth required): add to `publicRoutes` or `publicPrefixes` in `src/routes.ts`
- **Auth-only routes** (redirect authenticated users away): add to `authRoutes`
- **Webhook / server callback routes**: exempt from middleware explicitly in `src/proxy.ts` (see common issues below)

---

## CI / CD

GitHub Actions workflow at `.github/workflows/ci.yml`:

- **`build` job** — runs on every push and PR: lint → type check → build with dummy env vars
- **`e2e` job** — runs on push to `main`/`staging` only: spins up postgres + redis service containers, runs migrations, starts the app, then runs Playwright

To enable full e2e coverage add these GitHub Secrets to the repo:
`UPLOADTHING_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

## Common Issues

### `onUploadComplete` never runs / DB writes silently skipped after upload

UploadThing's servers POST back to `/api/uploadthing` after a file is uploaded — with no session cookie. The auth middleware in `src/proxy.ts` was catching this and redirecting to `/signin` before the route handler ran.

**Fix:** `/api/uploadthing` is already exempted in `proxy.ts`. Any new webhook or server-to-server callback (Stripe, Resend, etc.) must be exempted the same way — these endpoints will never carry a session cookie.

---

### `bun install --frozen-lockfile` fails in CI with "lockfile had changes"

The lockfile was generated with a different bun version than CI pulled. CI is pinned to match the local lockfile version. If you upgrade bun locally, regenerate the lockfile (`bun install`) and update the pinned version in `.github/workflows/ci.yml`.

---

### `next lint` fails with "Invalid project directory: .../lint"

Running `bun lint` (without `run`) in some environments passes the script name as a positional argument to Next.js. Use `bun run lint` explicitly in scripts and CI.

---

### Playwright tests fail in CI with display errors

`headless: false` requires a display server. The config uses `headless: !!process.env.CI` — headed locally, headless in Actions. Ensure `CI=true` is set in any CI-like environment.

---

### `drizzle-kit push` prompts interactively and hangs in CI / Docker

`drizzle-kit push` asks for confirmation when it detects destructive changes. The `prestart` script uses `--force` to skip prompts in non-interactive environments. Do not use `--force` manually in production without reviewing the diff first (`bun db:generate` → review → `bun db:migrate`).

---

### `DIRECT_URL` vs `DATABASE_URL` — migrations fail on pooled connection

`DATABASE_URL` goes through Supabase's pgbouncer (connection pooler) which does not support the prepared statements and transaction modes that DDL requires. Always use `DIRECT_URL` for `drizzle-kit`. In Docker Compose both point to the same local Postgres since there is no pooler.
