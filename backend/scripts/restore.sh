#!/bin/bash
# Restore PostgreSQL database and uploads from backup
# Run inside backend container: docker compose exec backend bash scripts/restore.sh [timestamp]
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/app/backups}"

if [ $# -lt 1 ]; then
    echo "Usage: restore.sh <timestamp>"
    echo "Example: restore.sh 20260403_120000"
    echo ""
    echo "Available backups:"
    (ls -1 "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null || true) | sed 's|.*/db_||;s|.sql.gz||'
    exit 1
fi

TIMESTAMP="$1"
if ! [[ "$TIMESTAMP" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
    echo "[ERROR] Invalid timestamp format. Expected YYYYMMDD_HHMMSS."
    exit 1
fi

DB_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

if [ ! -f "$DB_FILE" ]; then
    echo "[ERROR] Database backup not found: $DB_FILE"
    exit 1
fi

echo "[RESTORE] WARNING: This will overwrite the current database and uploads."
read -r -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

# Database connection from env vars
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-${POSTGRES_USER:-crm_user}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-crm_db}}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-crm_password}}"

# Restore database — fail loudly on SQL errors instead of swallowing stderr
echo "[RESTORE] Restoring database..."
gunzip -c "$DB_FILE" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --quiet
echo "[RESTORE] Database restored."

# Restore uploads (if backup exists)
if [ -f "$UPLOADS_FILE" ]; then
    echo "[RESTORE] Restoring uploads..."
    tar xzf "$UPLOADS_FILE" -C /app
    echo "[RESTORE] Uploads restored."
else
    echo "[RESTORE] No uploads backup found, skipping."
fi

echo "[RESTORE] Done."
