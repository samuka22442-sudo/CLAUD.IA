#!/usr/bin/env bash
# Backup do banco do Ritmo (PostgreSQL em container). Rode NA VPS, na pasta do projeto — ou agende no cron:
#   0 3 * * * cd /home/usuario/ritmo && ./deploy/backup.sh >> backups/backup.log 2>&1
#
# Restaurar (num banco vazio):
#   gunzip -c backups/ritmo-AAAA-MM-DD-HHMM.sql.gz | docker compose exec -T db psql -U ritmo -d ritmo
#
# Variáveis opcionais: BACKUP_DIR (padrão: backups) e KEEP (quantos backups guardar, padrão: 14).
set -euo pipefail

cd "$(dirname "$0")/.."
DIR="${BACKUP_DIR:-backups}"
KEEP="${KEEP:-14}"
mkdir -p "$DIR"

FILE="$DIR/ritmo-$(date +%F-%H%M).sql.gz"
docker compose exec -T db pg_dump -U ritmo -d ritmo --no-owner | gzip > "$FILE"
echo "$(date '+%F %T') backup salvo em $FILE ($(du -h "$FILE" | cut -f1))"

# Mantém só os mais recentes.
ls -1t "$DIR"/ritmo-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm --
