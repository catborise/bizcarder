#!/bin/bash
# PostgreSQL Major Version Upgrade Script
# Safely migrates data when docker-compose.yml postgres image version changes.
#
# Usage: ./scripts/pg-upgrade.sh [--force]
#   Detects current PG data version vs docker-compose.yml target version.
#   If they differ: dump → stop → destroy volume → start new → restore.
#   --force: skip confirmation prompt
#
# Safety: Creates a timestamped backup before any destructive action.
#         Aborts on any error. Keeps backup even after successful restore.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# ── Config ──────────────────────────────────────────────────────────
DB_CONTAINER="crm_db"
BACKUP_DIR="$PROJECT_DIR/.pg-upgrade-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source <(sed 's/\r$//' "$PROJECT_DIR/.env")
    set +a
fi

DB_USER="${POSTGRES_USER:-crm_user}"
DB_NAME="${POSTGRES_DB:-crm_db}"
DB_PASSWORD="${POSTGRES_PASSWORD:-crm_password}"

FORCE=false
[ "${1:-}" = "--force" ] && FORCE=true

# ── Helpers ─────────────────────────────────────────────────────────
die()  { echo "[ERROR] $*" >&2; exit 1; }
info() { echo "[INFO]  $*"; }
warn() { echo "[WARN]  $*"; }

get_target_pg_version() {
    grep -E '^\s+image:\s+postgres:' docker-compose.yml \
        | head -1 | grep -oP '\d+' | head -1 || echo ""
}

get_running_pg_version() {
    docker compose exec -T db postgres --version 2>/dev/null \
        | grep -oP '\d+' | head -1 || echo ""
}

get_volume_pg_version() {
    # Read PG_VERSION from the data volume to detect version even when container is stopped
    local vol_name
    vol_name=$(docker volume ls --format '{{.Name}}' | grep pgdata | head -1 || echo "")
    [ -z "$vol_name" ] && echo "" && return
    docker run --rm -v "${vol_name}:/pgdata" alpine cat /pgdata/PG_VERSION 2>/dev/null || echo ""
}

wait_for_db() {
    local retries=30
    info "Waiting for database to be ready..."
    until docker compose exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
        retries=$((retries - 1))
        if [ $retries -le 0 ]; then
            die "Database did not become ready in time."
        fi
        sleep 2
    done
    info "Database is ready."
}

start_db_with_image() {
    local pg_image="$1"
    local orig_image
    orig_image=$(grep -E '^\s+image:\s+postgres:' docker-compose.yml | head -1 | sed 's/.*image:\s*//')

    # Temporarily set the image to the specified version
    sed -i "s|image: ${orig_image}|image: ${pg_image}|" docker-compose.yml
    docker compose up -d db 2>/dev/null
    wait_for_db

    # Restore original image
    sed -i "s|image: ${pg_image}|image: ${orig_image}|" docker-compose.yml
}

# ── Pre-flight checks ──────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "docker not found."
docker compose version >/dev/null 2>&1 || die "docker compose not found."

TARGET_VERSION=$(get_target_pg_version)
[ -n "$TARGET_VERSION" ] || die "Could not detect target PG version from docker-compose.yml"

# Detect current version: try running container first, then volume
CURRENT_VERSION=$(get_running_pg_version)
if [ -z "$CURRENT_VERSION" ]; then
    CURRENT_VERSION=$(get_volume_pg_version)
fi

echo ""
echo "============================================"
echo "  PostgreSQL Upgrade Check"
echo "============================================"

if [ -z "$CURRENT_VERSION" ]; then
    info "No existing PostgreSQL data found. Starting fresh with PG $TARGET_VERSION."
    docker compose up -d db
    wait_for_db
    info "Fresh PG $TARGET_VERSION is running."
    exit 0
fi

echo "  Data version:     PostgreSQL $CURRENT_VERSION"
echo "  Target version:   PostgreSQL $TARGET_VERSION"
echo "============================================"
echo ""

if [ "$CURRENT_VERSION" = "$TARGET_VERSION" ]; then
    info "Already at target version. No upgrade needed."
    exit 0
fi

if [ "$CURRENT_VERSION" -gt "$TARGET_VERSION" ]; then
    die "Downgrade detected ($CURRENT_VERSION → $TARGET_VERSION). Not supported."
fi

# ── Upgrade flow ────────────────────────────────────────────────────
warn "Major version upgrade: PG $CURRENT_VERSION → PG $TARGET_VERSION"
echo ""
echo "This will:"
echo "  1. Start PG $CURRENT_VERSION temporarily (if not running)"
echo "  2. Dump the current database"
echo "  3. Stop all containers and remove pgdata volume"
echo "  4. Start new PG $TARGET_VERSION container"
echo "  5. Restore the dump"
echo ""

if [ "$FORCE" != true ]; then
    read -p "Continue? (y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
fi

# Step 1: Ensure old PG is running for dump
RUNNING_VERSION=$(get_running_pg_version)
if [ -z "$RUNNING_VERSION" ] || [ "$RUNNING_VERSION" != "$CURRENT_VERSION" ]; then
    info "Step 1/5: Starting PG $CURRENT_VERSION temporarily for dump..."
    docker compose down 2>/dev/null || true
    start_db_with_image "postgres:${CURRENT_VERSION}-alpine"
else
    info "Step 1/5: PG $CURRENT_VERSION already running."
fi

# Step 2: Dump
mkdir -p "$BACKUP_DIR"
DUMP_FILE="$BACKUP_DIR/pg${CURRENT_VERSION}_to_pg${TARGET_VERSION}_${TIMESTAMP}.sql.gz"
info "Step 2/5: Dumping database..."
docker compose exec -T db sh -c "PGPASSWORD='$DB_PASSWORD' pg_dump -U '$DB_USER' '$DB_NAME'" \
    | gzip > "$DUMP_FILE"

[ -s "$DUMP_FILE" ] || die "Dump file is empty. Aborting."
DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
info "Dump complete: $DUMP_FILE ($DUMP_SIZE)"

# Step 3: Stop and remove volume
info "Step 3/5: Stopping containers and removing pgdata volume..."
docker compose down

VOLUME_NAME=$(docker volume ls --format '{{.Name}}' | grep pgdata | head -1 || echo "")
if [ -n "$VOLUME_NAME" ]; then
    docker volume rm "$VOLUME_NAME"
    info "Volume $VOLUME_NAME removed."
else
    warn "No pgdata volume found."
fi

# Step 4: Start PG target
info "Step 4/5: Starting PG $TARGET_VERSION..."
docker compose up -d db
wait_for_db

NEW_VERSION=$(get_running_pg_version)
info "Running PostgreSQL $NEW_VERSION"

# Step 5: Restore
info "Step 5/5: Restoring database..."
gunzip -c "$DUMP_FILE" \
    | docker compose exec -T db sh -c "PGPASSWORD='$DB_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' --quiet" 2>/dev/null

# Verify
TABLE_COUNT=$(docker compose exec -T db sh -c "PGPASSWORD='$DB_PASSWORD' psql -U '$DB_USER' -d '$DB_NAME' -t -c \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\"" | tr -d ' \r\n')
info "Restore complete. $TABLE_COUNT tables in database."

# Start everything
info "Starting all services..."
docker compose up -d

echo ""
echo "============================================"
echo "  ✓ PostgreSQL upgraded: $CURRENT_VERSION → $TARGET_VERSION"
echo ""
echo "  Backup: $DUMP_FILE"
echo "  Tables: $TABLE_COUNT"
echo "============================================"
