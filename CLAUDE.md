# CLAUDE.md

Landil v2: a read-only MVP. Guests browse published listings. See `README.md` for setup, the API routes and the environment variables.

## Layout

```
server/            Rust API (axum + sqlx), all in src/main.rs
  dev/schema.sql   v1 database schema for the local test database
  dev/seed.sql     test data
apps/app/          Expo app (Expo Router), see apps/app/AGENTS.md
  src/app/         routes: index.tsx (browse), listings/[id].tsx (detail)
  src/lib/api.ts   API client and types
Makefile           all local commands; run `make` to list them
```

The v1 Next.js app is on `main`. Do not add it back here.

## Rules

- The API is read-only. It reads the v1 database and never writes to it. It returns published listings only and never exposes private documents (only their count).
- Run `make check` and `make test` before you finish a change. CI runs the same checks.
- In `apps/app`, add packages with `npx expo install`, not `npm install`.
- To test on a USB phone: `adb reverse tcp:8080 tcp:8080 && adb reverse tcp:8081 tcp:8081`, then `make app` and press `a`.
