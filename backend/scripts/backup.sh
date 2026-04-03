#!/bin/bash
# Backup PostgreSQL database and uploads
# Works both inside container (docker exec crm_backend bash scripts/backup.sh)
# and from host (docker compose exec backend bash scripts/backup.sh)
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
mkdir -p "$BACKUP_DIR"

# Database connection from env vars (same as the app uses)
DB_HOST="${DB_HOST:-db}"
DB_USER="${DB_USER:-${POSTGRES_USER:-crm_user}}"
DB_NAME="${DB_NAME:-${POSTGRES_DB:-crm_db}}"
DB_PASSWORD="${DB_PASSWORD:-${POSTGRES_PASSWORD:-crm_password}}"

# Database backup via pg_dump over network (no docker exec needed)
echo "[BACKUP] Dumping database..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

# Uploads backup
echo "[BACKUP] Archiving uploads..."
tar czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C /app uploads/ 2>/dev/null || echo "[BACKUP] No uploads directory found, skipping."

# Cleanup old backups (keep last 7)
echo "[BACKUP] Cleaning up old backups..."
ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
ls -t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "[BACKUP] Done: $BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
echo "[BACKUP] Files saved to $BACKUP_DIR"
