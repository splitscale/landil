# Landil v2

Landil v2 is a read-only MVP: guests browse published listings on Android, iOS and the web. It has two parts:

| Folder | What it is |
| -- | -- |
| `server/` | Rust API (axum and sqlx). It reads the v1 database and never writes to it. |
| `apps/app/` | Expo app (Expo Router). The same code runs on Android, iOS and the web. |

The v1 Next.js app is on the `main` branch.

## Run locally

You need Docker, Rust 1.98 or later, and Node 26 (see `.nvmrc`).

```bash
make setup   # one time: install the app dependencies
make api     # start the test database (Postgres 17, v1 schema, test data) and the API on :8080
make app     # in a second terminal: w = web, a = Android, QR code = Expo Go
```

Run `make` to see all targets.

### On a phone over USB

1. Turn on USB debugging on the phone and connect it. `adb devices` must show it as `device`.
2. Forward the ports, so the phone's `localhost` reaches your computer:
   ```bash
   adb reverse tcp:8080 tcp:8080   # API
   adb reverse tcp:8081 tcp:8081   # Metro
   ```
3. Run `make app`, then press `a`. The app opens in Expo Go. Install Expo Go from the Play Store first.

To connect over Wi-Fi instead, run `make app API_URL=http://<LAN IP of your computer>:8080` and scan the QR code.

## API

| Route | Result |
| -- | -- |
| `GET /health` | 200 when the database answers |
| `GET /v1/listings?q=&type=&price=&cursor=&limit=` | Published listings, newest first, 20 per page, with `next_cursor` |
| `GET /v1/listings/{id}` | One published listing: photos, public documents and the number of private documents |

| Variable | Default | Use |
| -- | -- | -- |
| `DATABASE_URL` | (required) | Postgres connection string |
| `BIND` | `0.0.0.0:8080` | Address and port to listen on |
| `CORS_ORIGINS` | `http://localhost:8081` | Comma-separated website origins that can call the API |

The app reads `EXPO_PUBLIC_API_URL` (default `http://localhost:8080`; `make app` sets it from `API_URL`) and `EXPO_PUBLIC_SITE_URL` (default `http://localhost:8081`).

## Checks

```bash
make check   # cargo fmt, clippy and the app type check (CI runs these)
make test    # API unit tests
```

## Web build

`make web` builds the static website and serves it with Caddy on http://localhost:8081.
