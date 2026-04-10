# Bizcarder CRM — Makefile
# Usage: make help

COMPOSE = docker compose
BACKEND = $(COMPOSE) exec backend
FRONTEND = $(COMPOSE) exec frontend

.PHONY: help install up down restart build logs \
        seed sync backup restore \
        test test-backend test-frontend \
        shell shell-db shell-redis \
        status clean fresh pg-upgrade

# ── Setup ────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## First-time setup: copy .env, build, start, seed
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example — edit it before proceeding")
	$(COMPOSE) up --build -d
	@echo "Waiting for backend to be ready..."
	@sleep 5
	$(BACKEND) node scripts/seed.js
	@echo "\n✓ Bizcarder is running at http://localhost:5173"
	@echo "  Default login: admin / admin"

# ── Docker lifecycle ─────────────────────────────────────

up: ## Start all containers (detached)
	$(COMPOSE) up -d

down: ## Stop all containers
	$(COMPOSE) down

restart: ## Restart all containers
	$(COMPOSE) restart

build: ## Rebuild images and start
	$(COMPOSE) up --build -d

logs: ## Tail logs from all services (Ctrl+C to quit)
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Tail backend logs only
	$(COMPOSE) logs -f --tail=100 backend

logs-frontend: ## Tail frontend logs only
	$(COMPOSE) logs -f --tail=100 frontend

status: ## Show container status
	$(COMPOSE) ps

# ── Database & data ──────────────────────────────────────

seed: ## Seed default admin user and dashboard tiles
	$(BACKEND) node scripts/seed.js

sync: ## Sync DB schema (add new columns — dev only)
	$(BACKEND) node -e "require('./models').sequelize.sync({ alter: true }).then(() => process.exit(0))"

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
	$(BACKEND) node scripts/seed.js
	@echo "\n✓ Fresh install complete."
