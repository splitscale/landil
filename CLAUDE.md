# CLAUDE.md

Landil v2: an MVP. Guests browse published listings. See `README.md` for setup, the API routes and the environment variables.

## Layout

```
server/            Rust API (axum + sqlx): src/main.rs, sign-in in src/auth.rs
  dev/schema.sql   v1 database schema for the local test database
  dev/seed.sql     test data
apps/app/          Expo app (Expo Router), see apps/app/AGENTS.md
  src/app/         routes: index.tsx (browse), listings/[id].tsx (detail)
  src/lib/api.ts   API client and types
  src/lib/device.ts  per-install random ID for view counts
Makefile           all local commands; run `make` to list them
```

The v1 Next.js app is on `main`. Do not add it back here.

## Rules

- The API works on the v1 database, which v1 still uses in production. It writes only `listings.listing_view` (v1 rules: 30-minute window per viewer) and the Better Auth tables `user`, `account` and `session` (server/src/auth.rs). Keep those rows readable by v1 Better Auth 1.3: same password hash format, 32-character ids and tokens. Any other write needs a decision first. It returns published listings only and never exposes private documents (only their count).
- Run `make check` and `make test` before you finish a change. CI runs the same checks.
- In `apps/app`, add packages with `npx expo install`, not `npm install`.
- To test on a USB phone: `adb reverse tcp:8080 tcp:8080 && adb reverse tcp:8081 tcp:8081`, then `make app` and press `a`.
