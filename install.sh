#!/bin/bash
# Bizcarder CRM — Production Install & Deploy Script
# Usage: ./install.sh [--fresh]
#   --fresh : Drops volumes and starts from scratch (WARNING: deletes all data)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  Bizcarder CRM — Install & Deploy"
echo "============================================"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "[ERROR] docker not found. Install Docker first."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "[ERROR] docker compose not found. Install Docker Compose v2."; exit 1; }

# Check .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "[SETUP] .env not found. Copying from .env.example..."
        cp .env.example .env
        echo "[SETUP] Please edit .env with your production settings, then re-run this script."
        exit 1
    else
        echo "[ERROR] .env file not found and no .env.example available."
        exit 1
    fi
fi

# Safely read specific env vars from .env without executing arbitrary shell code
get_env() {
    local key="$1"
    local default="$2"
    local val
    val=$(grep -E "^${key}=" .env | tail -n 1 | cut -d'=' -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//')
    echo "${val:-$default}"
}

POSTGRES_USER=$(get_env POSTGRES_USER crm_user)
POSTGRES_DB=$(get_env POSTGRES_DB crm_db)
PORT=$(get_env PORT 5000)
DOMAIN=$(get_env DOMAIN localhost)

# Parse flags
FRESH=false
if [ "${1:-}" = "--fresh" ]; then
    FRESH=true
    echo "[WARNING] --fresh mode: ALL DATA WILL BE DELETED!"
    read -r -p "Are you sure? (y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
fi

# Step 1: Stop existing containers (only pass -v when FRESH is explicitly true!)
echo ""
echo "[1/7] Stopping existing containers..."
if [ "$FRESH" = true ]; then
    docker compose --profile prod down -v 2>/dev/null || true
else
    docker compose --profile prod down 2>/dev/null || true
fi

# Step 2: Pull latest code (if git repo)
if [ -d .git ]; then
    echo "[2/7] Pulling latest code..."
    git pull origin main 2>/dev/null || echo "[SKIP] Git pull failed — using local code."
else
    echo "[2/7] Not a git repo — using local code."
fi

# Step 3: Build and start production containers (including Caddy)
echo "[3/7] Building and starting containers..."
docker compose --profile prod up --build -d

# Step 4: Wait for database to be healthy
echo "[4/7] Waiting for database..."
RETRIES=30
until docker compose exec -T db pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        echo "[ERROR] Database did not become ready in time."
        docker compose logs db --tail 10
        exit 1
    fi
    sleep 2
done
echo "  Database is ready."

# Step 5: Wait for backend to start
echo "[5/7] Waiting for backend..."
RETRIES=30
until docker compose exec -T backend node -e "require('./models').sequelize.authenticate().then(() => process.exit(0)).catch(() => process.exit(1))" 2>/dev/null; do
    RETRIES=$((RETRIES - 1))
    if [ $RETRIES -le 0 ]; then
        echo "[ERROR] Backend did not connect to database in time."
        docker compose logs backend --tail 10
        exit 1
    fi
    sleep 2
done
echo "  Backend is connected."

# Step 6: Run database migrations + seed
echo "[6/7] Running database migrations..."
docker compose exec -T backend npx sequelize-cli db:migrate

echo "  Seeding default data..."
docker compose exec -T backend node scripts/seed.js

# Step 7: Health check
echo "[7/7] Running health checks..."
echo ""

HEALTHY=true
for SERVICE in db redis backend caddy; do
    STATUS=$(docker compose --profile prod ps --format json "$SERVICE" 2>/dev/null | python3 -c "import sys,json; data=sys.stdin.read().strip(); print(json.loads(data.splitlines()[0])['State'] if data else 'unknown')" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "running" ]; then
        echo "  ✓ $SERVICE — running"
    else
        echo "  ✗ $SERVICE — $STATUS"
        HEALTHY=false
    fi
done

echo ""

# Test backend API
BACKEND_URL="http://localhost:${PORT}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/cards/stats" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✓ Backend API — responding (HTTP $HTTP_CODE)"
else
    echo "  ✗ Backend API — HTTP $HTTP_CODE"
    HEALTHY=false
fi

# Test Caddy frontend
APP_URL="http://${DOMAIN}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "308" ] || [ "$HTTP_CODE" = "301" ]; then
    echo "  ✓ Caddy / Frontend — responding (HTTP $HTTP_CODE)"
else
    echo "  ✗ Caddy / Frontend — HTTP $HTTP_CODE"
    HEALTHY=false
fi

echo ""
echo "============================================"
if [ "$HEALTHY" = true ]; then
    echo "  ✓ Deployment successful!"
    echo ""
    echo "  App URL:  ${APP_URL}"
    echo "  Backend:  ${BACKEND_URL}"
    echo "  Login:    admin / (see ADMIN_DEFAULT_PASSWORD in .env or seed output)"
    echo ""
    echo "  Next steps:"
    echo "  - Change admin password immediately"
    echo "  - Configure SAML in .env (if using SSO)"
    echo "  - Set up daily backup cron:"
    echo "    crontab -e"
    echo "    0 3 * * * cd $SCRIPT_DIR && /usr/bin/docker compose exec -T backend bash scripts/backup.sh >> /var/log/crm_backup.log 2>&1"
else
    echo "  ✗ Some services are not healthy."
    echo "  Check logs: docker compose --profile prod logs --tail 50"
fi
echo "============================================"
