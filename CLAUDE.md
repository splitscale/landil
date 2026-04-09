Here is the compressed version:

---

# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repo.

## Commands

```bash
bun dev          # start dev server (Turbopack)
bun build        # production build (Turbopack)
bun lint         # ESLint via next lint

bun db:generate  # generate Drizzle migration files
bun db:migrate   # push schema to DB (drizzle-kit push)
bun db:studio    # open Drizzle Studio
```

No tests.

## Environment

Copy `env.example` to `.env`. Required vars:

- `DATABASE_URL` — Supabase pooled conn (runtime via `postgres-js`)
- `DIRECT_URL` — Supabase direct conn (`drizzle-kit` migrations only)
- `BETTER_AUTH_SECRET` — Better Auth session signing secret
- `NEXT_PUBLIC_BASE_URL` — base URL (e.g. `http://localhost:3000`)

## Architecture

**Stack:** Next.js 16 App Router · Better Auth · Drizzle ORM · Supabase (PostgreSQL) · Tailwind CSS v4 · shadcn/ui · React Hook Form + Zod · Sonner toasts

### Directory layout

```
src/
  app/
    (routes)/
      (auth)/     # signin, signup pages — public
      (home)/     # authenticated shell with navbar layout
        listings/new/  # multi-step listing creation form
    api/
      auth/[...all]/   # Better Auth catch-all handler
      listings/        # listings REST endpoint
  db/
    index.ts           # drizzle client (postgres-js)
    schema/
      auth/            # user, session, account, verification tables (Better Auth managed)
      index.ts         # re-exports all schemas
  lib/
    auth/
      server.ts        # `auth` — Better Auth instance (server-side)
      client.ts        # `signIn/signUp/signOut/useSession` (client-side)
      get-session.ts   # `getServerSession()` — React-cached server helper
  providers/index.tsx  # global providers: NextTopLoader + Sonner Toaster
  routes.ts            # route classification: publicRoutes, authRoutes, DEFAULT_LOGIN_REDIRECT
  proxy.ts             # Next.js middleware logic (auth-aware redirects)
```

### Auth pattern

- **Server components/API routes:** `getServerSession()` from `@/lib/auth/get-session` — null if unauthenticated.
- **Client components:** `useSession()` or `signIn/signOut` from `@/lib/auth/client`.
- **Middleware** (`proxy.ts`, imported by `middleware.ts`): uses `getSessionCookie()` for lightweight cookie check, no DB call. Route classification in `src/routes.ts`.
- Better Auth manages DB tables under `src/db/schema/auth/`. User table custom fields: `role` (string, default `"user"`), `gender` (boolean).

### Adding a new route

Protected routes default — middleware redirects unauthenticated to `/login`. Add to `publicRoutes` or `authRoutes` in `src/routes.ts` only if must be public or auth-only (signin/signup).

### DB schema changes

Add schema files under `src/db/schema/`, export from `src/db/schema/index.ts`, run `bun db:migrate`. `drizzle.config.ts` uses `DIRECT_URL` (not `DATABASE_URL`) for migrations.

### Form pattern

Multi-step forms: React Hook Form + Zod. Schema/constants in co-located `validate.ts`. No server actions — forms POST to API routes under `src/app/api/`.

### Listings (in progress — branch `file-uploads`)

`/api/listings` POST logs payload; file upload + DB insert TODO. Form collects photos (up to 20) + docs with public/private visibility, but only counts sent to API (not files).