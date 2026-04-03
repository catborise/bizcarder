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
    ls -1 "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | sed 's|.*/db_||;s|.sql.gz||' || echo "  No backups found in $BACKUP_DIR"
    exit 1
fi

TIMESTAMP=$1
DB_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

if [ ! -f "$DB_FILE" ]; then
    echo "[ERROR] Database backup not found: $DB_FILE"
    exit 1
fi

echo "[RESTORE] WARNING: This will overwrite the current database and uploads."
read -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
fi

# Database connection from env vars
DB_HOST="${DB_HOST:-db}"
DB_USER="${DB_USER:-${POSTGRES_USER:-crm_user}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-crm_db}}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-crm_password}}"

# Restore database
echo "[RESTORE] Restoring database..."
gunzip -c "$DB_FILE" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --quiet 2>/dev/null
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
