# Bizcarder CRM — Makefile
# Usage: make help
#
# Dev:  make up   → backend + db + redis (frontend: make dev-frontend)
# Prod: make prod → backend + db + redis + caddy (auto HTTPS, static serve)

COMPOSE      = docker compose
COMPOSE_PROD = $(COMPOSE) -f docker-compose.yml --profile prod
COMPOSE_ALL  = $(COMPOSE) --profile prod
BACKEND      = $(COMPOSE) exec -T backend

.PHONY: help install upgrade prod-upgrade _upgrade \
        up down restart build dev-frontend deps \
        logs logs-backend logs-db status health \
        prod prod-up \
        seed migrate migrate-undo migrate-status \
        backup restore pg-upgrade \
        test test-backend test-frontend check \
        lint format format-check \
        shell shell-db shell-redis \
        clean fresh

# ── Setup ────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## First-time setup: copy .env, build, start, migrate, seed
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example — edit secrets (SESSION_SECRET, CRM_API_ENCRYPTION_KEY, ADMIN_DEFAULT_PASSWORD) and re-run 'make install'."; \
		exit 1; \
	fi
	$(COMPOSE) up --build -d
	@echo "Waiting for backend to be ready..."
	@sleep 5
	$(BACKEND) npx sequelize-cli db:migrate
	$(BACKEND) node scripts/seed.js
	@echo ""
	@echo "✓ Backend running on http://localhost:5000"
	@echo "  Run 'make dev-frontend' in another terminal for the UI"
	@echo "  Default login: admin / (ADMIN_DEFAULT_PASSWORD from .env)"

upgrade: _COMPOSE_UP = $(COMPOSE)
upgrade: _upgrade ## Pull latest code, rebuild dev, migrate, seed

prod-upgrade: _COMPOSE_UP = $(COMPOSE_PROD)
prod-upgrade: _upgrade ## Pull latest code, rebuild prod (Caddy), migrate, seed

_upgrade:
	@set -e; \
	$(COMPOSE_ALL) down; \
	git pull; \
	TARGET_PG=$$(grep -oP 'image:\s+postgres:\K\d+' docker-compose.yml | head -1); \
	PROJECT_NAME=$$(basename "$$PWD" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]//g'); \
	VOL_NAME=$$(docker volume ls --format '{{.Name}}' | grep -E "^$${PROJECT_NAME}_pgdata$$" | head -1 || echo ""); \
	CURRENT_PG=""; \
	if [ -n "$$VOL_NAME" ]; then \
		CURRENT_PG=$$(docker run --rm -v "$$VOL_NAME:/pgdata:ro" alpine sh -c 'cat /pgdata/PG_VERSION /pgdata/*/docker/PG_VERSION 2>/dev/null | head -1' || echo ""); \
	fi; \
	if [ -n "$$CURRENT_PG" ] && [ "$$CURRENT_PG" != "$$TARGET_PG" ]; then \
		echo ""; \
		echo "⚠  PostgreSQL data version ($$CURRENT_PG) does not match target ($$TARGET_PG)"; \
		echo "   Running pg-upgrade to migrate data..."; \
		echo ""; \
		./scripts/pg-upgrade.sh --force; \
	fi; \
	$(_COMPOSE_UP) up --build -d; \
	echo "Waiting for backend to be ready..."; \
	sleep 5; \
	$(BACKEND) npx sequelize-cli db:migrate; \
	$(BACKEND) node scripts/seed.js; \
	echo ""; \
	echo "✓ Upgrade complete."

deps: ## Install dependencies (frontend + backend)
	cd backend && npm install
	cd frontend && npm install

# ── Dev ─────────────────────────────────────────────────

up: ## Start backend + db + redis
	$(COMPOSE) up -d

down: ## Stop all containers (including prod Caddy if running)
	$(COMPOSE_ALL) down

restart: ## Restart all running containers
	$(COMPOSE_ALL) restart

build: ## Rebuild backend image and start
	$(COMPOSE) up --build -d

dev-frontend: ## Start frontend dev server (Vite, HMR, port 5173)
	cd frontend && (test -d node_modules || npm install) && npm run dev

# ── Logs & monitoring ───────────────────────────────────

logs: ## Tail logs from all services
	$(COMPOSE_ALL) logs -f --tail=100

logs-backend: ## Tail backend logs only
	$(COMPOSE) logs -f --tail=100 backend

logs-db: ## Tail database logs only
	$(COMPOSE) logs -f --tail=100 db

status: ## Show container status
	$(COMPOSE_ALL) ps -a

health: ## Check health of all running services
	@echo "── Containers ──"
	@$(COMPOSE_ALL) ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || $(COMPOSE_ALL) ps
	@echo ""
	@echo "── Backend API ──"
	@curl -sf http://localhost:5000/health > /dev/null \
		&& echo "  ✓ Backend healthy on :5000/health" \
		|| echo "  ✗ Backend not healthy on :5000/health"
	@echo ""
	@echo "── Database ──"
	@$(COMPOSE) exec -T db pg_isready -U $${POSTGRES_USER:-crm_user} -d $${POSTGRES_DB:-crm_db} > /dev/null 2>&1 \
		&& echo "  ✓ PostgreSQL ready" \
		|| echo "  ✗ PostgreSQL not ready"
	@echo ""
	@echo "── Redis ──"
	@$(COMPOSE) exec -T redis redis-cli ping > /dev/null 2>&1 \
		&& echo "  ✓ Redis responding" \
		|| echo "  ✗ Redis not responding"

# ── Production (Caddy) ──────────────────────────────────

prod: ## Build and start production stack (Caddy + backend, no dev bind-mount)
	$(COMPOSE_PROD) up --build -d
	@echo "Waiting for backend to be ready..."
	@sleep 5
	$(BACKEND) npx sequelize-cli db:migrate
	$(BACKEND) node scripts/seed.js
	@echo ""
	@echo "✓ Production stack running."

prod-up: ## Start production containers (no rebuild)
	$(COMPOSE_PROD) up -d

# ── Database & data ──────────────────────────────────────

seed: ## Seed default admin user and dashboard tiles
	$(BACKEND) node scripts/seed.js

migrate: ## Run pending database migrations
	$(BACKEND) npx sequelize-cli db:migrate

migrate-undo: ## Rollback last database migration
	$(BACKEND) npx sequelize-cli db:migrate:undo

migrate-status: ## Show migration status (pending/applied)
	$(BACKEND) npx sequelize-cli db:migrate:status

backup: ## Create database + uploads backup
	$(BACKEND) bash scripts/backup.sh

restore: ## List backups, or: make restore T=20260403_120000
ifdef T
	$(BACKEND) bash scripts/restore.sh $(T)
else
	$(BACKEND) bash scripts/restore.sh
endif

pg-upgrade: ## Upgrade PostgreSQL version (runs migration script)
	./scripts/pg-upgrade.sh

# ── Testing & quality ───────────────────────────────────

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests (Jest)
	cd backend && npm test

test-frontend: ## Run frontend tests (Vitest)
	cd frontend && npm test

check: lint format-check test ## Run lint + format check + tests (CI locally)

lint: ## Run ESLint on frontend
	cd frontend && npm run lint

format: ## Format all code with Prettier
	npx prettier --write .

format-check: ## Check formatting without writing (CI mode)
	npx prettier --check .

# ── Shell access ─────────────────────────────────────────

shell: ## Open shell in backend container
	$(COMPOSE) exec backend sh

shell-db: ## Open psql shell
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-crm_user} -d $${POSTGRES_DB:-crm_db}

shell-redis: ## Open redis-cli shell
	$(COMPOSE) exec redis redis-cli

# ── Cleanup ──────────────────────────────────────────────

clean: ## Stop containers and remove images (keeps volumes)
	$(COMPOSE_ALL) down --rmi local

fresh: ## DESTRUCTIVE: wipe everything (volumes + images) and rebuild
	@echo "⚠  This will delete ALL data (database, uploads, backups)."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(COMPOSE_ALL) down -v --rmi local
	$(COMPOSE) up --build -d
	@sleep 5
	$(BACKEND) npx sequelize-cli db:migrate
	$(BACKEND) node scripts/seed.js
	@echo ""
	@echo "✓ Fresh install complete."
