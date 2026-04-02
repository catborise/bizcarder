#!/bin/bash
# Backup PostgreSQL database and uploads
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

# Database backup
echo "[BACKUP] Dumping database..."
docker exec crm_db pg_dump -U "${POSTGRES_USER:-crm_user}" "${POSTGRES_DB:-crm_db}" | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

# Uploads backup
echo "[BACKUP] Archiving uploads..."
docker cp crm_backend:/app/uploads - | gzip > "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

# Cleanup old backups (keep last 7)
echo "[BACKUP] Cleaning up old backups..."
ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
ls -t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "[BACKUP] Done: $BACKUP_DIR/db_${TIMESTAMP}.sql.gz, $BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
