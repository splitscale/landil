# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # start dev server (Turbopack)
bun build        # production build (Turbopack)
bun lint         # ESLint via next lint

bun db:generate  # generate Drizzle migration files
bun db:migrate   # push schema to DB (drizzle-kit push)
bun db:studio    # open Drizzle Studio
```

There are no tests in this project.

## Environment

Copy `env.example` to `.env`. Required variables:

- `DATABASE_URL` — Supabase pooled connection (used at runtime via `postgres-js`)
- `DIRECT_URL` — Supabase direct connection (used only by `drizzle-kit` for migrations)
- `BETTER_AUTH_SECRET` — secret for Better Auth session signing
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

- **Server components/API routes:** `getServerSession()` from `@/lib/auth/get-session` — returns null when unauthenticated.
- **Client components:** `useSession()` or `signIn/signOut` from `@/lib/auth/client`.
- **Middleware** (`proxy.ts`, imported by `middleware.ts`): uses `getSessionCookie()` for lightweight cookie checks without a DB call. Route classification is in `src/routes.ts`.
- Better Auth manages its own DB tables under `src/db/schema/auth/`. The user table has two custom fields: `role` (string, default `"user"`) and `gender` (boolean).

### Adding a new route

Protected routes are the default — redirect to `/login` for unauthenticated users is handled by middleware. Add routes to `publicRoutes` or `authRoutes` in `src/routes.ts` only when they must be publicly accessible or auth-only (signin/signup).

### DB schema changes

Add new schema files under `src/db/schema/`, export them from `src/db/schema/index.ts`, then run `bun db:migrate`. The `drizzle.config.ts` uses `DIRECT_URL` (not `DATABASE_URL`) for migrations.

### Form pattern

Multi-step forms use React Hook Form + Zod. Schema and option constants live in a co-located `validate.ts`. Server actions aren't used — forms POST to API routes under `src/app/api/`.

### Listings (in progress — branch `file-uploads`)

`/api/listings` POST currently logs the payload; file upload and DB insert are TODO. The form collects photos (up to 20) and documents with public/private visibility, but files aren't yet sent to the API — only counts are.
