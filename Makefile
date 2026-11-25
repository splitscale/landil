# Landil v2: local development. Run `make` to list the targets.

PG_VERSION ?= 17# match production (Supabase runs 17.6)
DB_PORT    ?= 5433
API_PORT   ?= 8080
WEB_PORT   ?= 8081
DB         := landil-v2-db
WEB        := landil-v2-web
DB_URL     := postgres://postgres:postgres@localhost:$(DB_PORT)/landil
API_URL    ?= http://localhost:$(API_PORT)# phone: make app API_URL=http://<LAN IP>:8080
APP        := apps/app

.DEFAULT_GOAL := help
.PHONY: help setup db db-reset api app web test check stop clean

help: ## List the targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-9s %s\n", $$1, $$2}'

setup: ## Install app dependencies
	cd $(APP) && npm ci

db: ## Start the local Postgres with the v1 schema and test data
	@docker start $(DB) >/dev/null 2>&1 || { \
	  docker run -d --name $(DB) -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=landil -p $(DB_PORT):5432 postgres:$(PG_VERSION)-alpine >/dev/null && \
	  until docker exec $(DB) pg_isready -U postgres -d landil -q; do sleep 1; done && \
	  docker exec -i $(DB) psql -q -v ON_ERROR_STOP=1 -U postgres -d landil < server/dev/schema.sql && \
	  docker exec -i $(DB) psql -q -v ON_ERROR_STOP=1 -U postgres -d landil < server/dev/seed.sql && \
	  echo "created $(DB) (Postgres $(PG_VERSION)) with test data"; }
	@until docker exec $(DB) pg_isready -U postgres -d landil -q; do sleep 1; done

db-reset: ## Delete the local database and create it again
	-docker rm -f $(DB) >/dev/null 2>&1
	$(MAKE) db

api: db ## Run the API on all interfaces (phones on the same Wi-Fi can reach it)
	cd server && DATABASE_URL=$(DB_URL) BIND=0.0.0.0:$(API_PORT) CORS_ORIGINS=http://localhost:$(WEB_PORT) cargo run

app: ## Start the Expo dev server (w = web, a = Android, QR = Expo Go)
	cd $(APP) && EXPO_PUBLIC_API_URL=$(API_URL) npx expo start --port $(WEB_PORT)

web: ## Build the static website and serve it with Caddy on WEB_PORT
	cd $(APP) && EXPO_PUBLIC_API_URL=$(API_URL) npx expo export --platform web --output-dir dist
	-docker rm -f $(WEB) >/dev/null 2>&1
	docker run -d --name $(WEB) -p $(WEB_PORT):8081 -v $(CURDIR)/$(APP)/dist:/srv:ro \
	  -v $(CURDIR)/$(APP)/Caddyfile:/etc/caddy/Caddyfile:ro caddy:2-alpine >/dev/null
	@echo "website on http://localhost:$(WEB_PORT)"

test: ## Run the API unit tests
	cd server && cargo test

check: ## Format check, lint and type check (what CI runs)
	cd server && cargo fmt --check && cargo clippy --all-targets -- -D warnings
	cd $(APP) && npx tsc --noEmit

stop: ## Stop the database and the website containers
	-docker stop $(DB) $(WEB) >/dev/null 2>&1

clean: stop ## Remove containers and build output
	-docker rm -f $(DB) $(WEB) >/dev/null 2>&1
	rm -rf server/target $(APP)/dist
