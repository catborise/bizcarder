#!/bin/bash
# Restore PostgreSQL database and uploads from backup
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <timestamp>"
    echo "Example: $0 20260401_120000"
    echo ""
    echo "Available backups:"
    ls -1 "${BACKUP_DIR:-./backups}"/db_*.sql.gz 2>/dev/null | sed 's/.*db_//;s/.sql.gz//'
    exit 1
fi

TIMESTAMP=$1
BACKUP_DIR="${BACKUP_DIR:-./backups}"
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

# Restore database
echo "[RESTORE] Restoring database..."
gunzip -c "$DB_FILE" | docker exec -i crm_db psql -U "${POSTGRES_USER:-crm_user}" -d "${POSTGRES_DB:-crm_db}" --quiet

# Restore uploads (if backup exists)
if [ -f "$UPLOADS_FILE" ]; then
    echo "[RESTORE] Restoring uploads..."
    gunzip -c "$UPLOADS_FILE" | docker cp - crm_backend:/app/
    echo "[RESTORE] Uploads restored."
else
    echo "[RESTORE] No uploads backup found, skipping."
fi

echo "[RESTORE] Done."
