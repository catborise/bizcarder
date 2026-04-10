# Bizcarder CRM — Makefile
# Usage: make help
#
# Dev:  make up   → backend + db + redis (frontend: make dev-frontend)
# Prod: make prod → backend + db + redis + caddy (auto HTTPS, static serve)

COMPOSE      = docker compose
COMPOSE_PROD = $(COMPOSE) --profile prod
BACKEND      = $(COMPOSE) exec backend

.PHONY: help install upgrade prod-upgrade _upgrade \
        up down restart build dev-frontend \
        logs logs-backend status \
        prod prod-up \
        seed migrate backup restore pg-upgrade \
        test test-backend test-frontend \
        lint format \
        shell shell-db shell-redis \
        clean fresh

# ── Setup ────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## First-time setup: copy .env, build, start, migrate, seed
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example — edit it before proceeding")
	$(COMPOSE) up --build -d
	@echo "Waiting for backend to be ready..."
	@sleep 5
	$(BACKEND) npx sequelize-cli db:migrate
	$(BACKEND) node scripts/seed.js
	@echo ""
	@echo "✓ Backend running on http://localhost:5000"
	@echo "  Run 'make dev-frontend' in another terminal for the UI"
	@echo "  Default login: admin / admin"

upgrade: _COMPOSE_UP = $(COMPOSE)
upgrade: _upgrade ## Pull latest code, rebuild dev, migrate, seed

prod-upgrade: _COMPOSE_UP = $(COMPOSE_PROD)
prod-upgrade: _upgrade ## Pull latest code, rebuild prod (Caddy), migrate, seed

_upgrade:
	@OLD_PG=$$(grep -oP 'image:\s+postgres:\K\d+' docker-compose.yml | head -1); \
	$(COMPOSE) down; \
	git pull; \
	NEW_PG=$$(grep -oP 'image:\s+postgres:\K\d+' docker-compose.yml | head -1); \
	if [ "$$OLD_PG" != "$$NEW_PG" ]; then \
		echo ""; \
		echo "⚠  PostgreSQL version changed: $$OLD_PG → $$NEW_PG"; \
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

# ── Dev ─────────────────────────────────────────────────

up: ## Start backend + db + redis
	$(COMPOSE) up -d

down: ## Stop all containers
	$(COMPOSE) down

restart: ## Restart all containers
	$(COMPOSE) restart

build: ## Rebuild backend image and start
	$(COMPOSE) up --build -d

dev-frontend: ## Start frontend dev server (Vite, HMR, port 5173)
	cd frontend && test -d node_modules || npm install && npm run dev

logs: ## Tail logs from all services
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Tail backend logs only
	$(COMPOSE) logs -f --tail=100 backend

status: ## Show container status
	$(COMPOSE) ps -a

# ── Production (Caddy) ──────────────────────────────────

prod: ## Build and start production stack (Caddy + backend)
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

# ── Testing ──────────────────────────────────────────────

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests (Jest)
	cd backend && npm test

test-frontend: ## Run frontend tests (Vitest)
	cd frontend && npm test

# ── Code quality ────────────────────────────────────────

lint: ## Run ESLint on frontend
	cd frontend && npx eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0

format: ## Format all code with Prettier
	npx prettier --write .

# ── Shell access ─────────────────────────────────────────

shell: ## Open shell in backend container
	$(BACKEND) sh

shell-db: ## Open psql shell
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-crm_user} -d $${POSTGRES_DB:-crm_db}

shell-redis: ## Open redis-cli shell
	$(COMPOSE) exec redis redis-cli

# ── Cleanup ──────────────────────────────────────────────

clean: ## Stop containers and remove images (keeps volumes)
	$(COMPOSE) down --rmi local

fresh: ## DESTRUCTIVE: wipe everything (volumes + images) and rebuild
	@echo "⚠  This will delete ALL data (database, uploads, backups)."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(COMPOSE) down -v --rmi local
	$(COMPOSE) up --build -d
	@sleep 5
	$(BACKEND) npx sequelize-cli db:migrate
	$(BACKEND) node scripts/seed.js
	@echo ""
	@echo "✓ Fresh install complete."
