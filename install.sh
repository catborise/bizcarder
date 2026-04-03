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

# Parse flags
FRESH=false
if [ "${1:-}" = "--fresh" ]; then
    FRESH=true
    echo "[WARNING] --fresh mode: ALL DATA WILL BE DELETED!"
    read -p "Are you sure? (y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
fi

# Step 1: Stop existing containers
echo ""
echo "[1/7] Stopping existing containers..."
docker compose down ${FRESH:+"-v"} 2>/dev/null || true

# Step 2: Pull latest code (if git repo)
if [ -d .git ]; then
    echo "[2/7] Pulling latest code..."
    git pull origin main 2>/dev/null || echo "[SKIP] Git pull failed — using local code."
else
    echo "[2/7] Not a git repo — using local code."
fi

# Step 3: Build and start containers
echo "[3/7] Building and starting containers..."
docker compose up --build -d

# Step 4: Wait for database to be healthy
echo "[4/7] Waiting for database..."
RETRIES=30
until docker compose exec -T db pg_isready -U "${POSTGRES_USER:-crm_user}" -d "${POSTGRES_DB:-crm_db}" >/dev/null 2>&1; do
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

# Step 6: Sync database schema + seed
echo "[6/7] Syncing database schema..."
docker compose exec -T backend node -e "
    require('./models').sequelize.sync({ alter: true })
        .then(() => { console.log('  Schema synced.'); process.exit(0); })
        .catch(err => { console.error('  Schema sync failed:', err.message); process.exit(1); });
"

echo "  Seeding default data..."
docker compose exec -T backend node scripts/seed.js

# Step 7: Health check
echo "[7/7] Running health checks..."
echo ""

# Check all containers
HEALTHY=true
for SERVICE in db redis backend frontend; do
    STATUS=$(docker compose ps --format json "$SERVICE" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['State'])" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "running" ]; then
        echo "  ✓ $SERVICE — running"
    else
        echo "  ✗ $SERVICE — $STATUS"
        HEALTHY=false
    fi
done

echo ""

# Test backend API
BACKEND_URL="http://localhost:${PORT:-5000}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/cards/stats" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✓ Backend API — responding (HTTP $HTTP_CODE)"
else
    echo "  ✗ Backend API — HTTP $HTTP_CODE"
    HEALTHY=false
fi

# Test frontend
FRONTEND_URL="http://localhost:5173"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✓ Frontend — responding (HTTP $HTTP_CODE)"
else
    echo "  ✗ Frontend — HTTP $HTTP_CODE"
    HEALTHY=false
fi

echo ""
echo "============================================"
if [ "$HEALTHY" = true ]; then
    echo "  ✓ Deployment successful!"
    echo ""
    echo "  Frontend: ${FRONTEND_URL:-http://localhost:5173}"
    echo "  Backend:  ${BACKEND_URL}"
    echo "  Login:    admin / admin (change immediately!)"
    echo ""
    echo "  Next steps:"
    echo "  - Change admin password"
    echo "  - Configure SAML in .env (if using SSO)"
    echo "  - Set up daily backup cron:"
    echo "    crontab -e"
    echo "    0 3 * * * cd $SCRIPT_DIR && /usr/bin/docker compose exec -T backend bash scripts/backup.sh >> /var/log/crm_backup.log 2>&1"
else
    echo "  ✗ Some services are not healthy."
    echo "  Check logs: docker compose logs --tail 50"
fi
echo "============================================"
