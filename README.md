# Landil v2

Landil v2 is an MVP: guests browse published listings on Android, iOS and the web. It has two parts:

| Folder | What it is |
| -- | -- |
| `server/` | Rust API (axum and sqlx) on the v1 database. It writes listing views, and accounts and sessions for sign-in. |
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
| `GET /v1/listings/{id}/similar` | Up to 4 published listings in the same province: same property type first, then the closest price |
| `POST /v1/auth/sign-up` | Body `{username, password, name, email, gender}`. Creates the account and returns `{token, user}` (201). `role`, `plan` and `verified` in the body are ignored |
| `POST /v1/auth/sign-in` | Body `{username, password}`. Returns `{token, user}`. 401 for a wrong username or password, 403 for a banned account |
| `POST /v1/auth/sign-out` | Ends the session in `Authorization: Bearer <token>`. 204 |
| `GET /v1/me` | The signed-in user. 401 without a valid session |
| `POST /v1/me/password` | Body `{current_password, new_password}`. Changes the password and signs out every other session of the account. 204. Wrong current passwords count toward the sign-in limit |
| `POST /v1/listings/{id}/views` | Body `{"device_id": "..."}`. Records a view, at most one per device and listing every 30 minutes (as in v1). Stores only a hash of the device ID. Returns 204 |

| Variable | Default | Use |
| -- | -- | -- |
| `DATABASE_URL` | (required) | Postgres connection string |
| `BIND` | `0.0.0.0:8080` | Address and port to listen on |
| `CORS_ORIGINS` | `http://localhost:8081` | Comma-separated website origins that can call the API |
| `TRUST_PROXY` | (off) | Set to `1` only behind a proxy that sets `X-Forwarded-For`. The API then takes the client IP from it (for rate limits and sessions); otherwise from the connection, so the header cannot be faked |

Sign-in uses the v1 Better Auth tables (`user`, `account`, `session`) and its password hash format, so v1 accounts sign in to v2 with their v1 passwords, and passwords set in v2 work in v1. Rate limits (in memory, per API process): 5 wrong passwords per username in 15 minutes, 30 sign-in tries per IP in 15 minutes, 5 new accounts per IP per hour. Over the limit: 429 with `Retry-After`. Restarting the API clears them. Test accounts in the local database: `seller1` / `seller1-password`, and the banned `banned1` / `banned-password`.

The app reads `EXPO_PUBLIC_API_URL` (default `http://localhost:8080`; `make app` sets it from `API_URL`) and `EXPO_PUBLIC_SITE_URL` (default `http://localhost:8081`).

## Checks

```bash
make check   # cargo fmt, clippy and the app type check (CI runs these)
make test    # API unit tests
```

## Web build

`make web` builds the static website and serves it with Caddy on http://localhost:8081.
