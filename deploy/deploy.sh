#!/usr/bin/env bash
# Envia o projeto para a VPS por SSH (rsync) e (re)sobe os containers.
#
# Uso (no SEU computador, na pasta do projeto):
#   ./deploy/deploy.sh usuario@ip-ou-dominio
#
# Variáveis opcionais:
#   SSH_PORT    porta do SSH da VPS            (padrão: 55231)
#   REMOTE_DIR  pasta na VPS (relativa à home) (padrão: ritmo)
#
# Antes da primeira vez, crie o arquivo .env na VPS (veja README.md, passo 3). Ele NÃO é enviado nem apagado por este script.
set -euo pipefail

TARGET="${1:?uso: ./deploy/deploy.sh usuario@host}"
SSH_PORT="${SSH_PORT:-55231}"
REMOTE_DIR="${REMOTE_DIR:-ritmo}"

cd "$(dirname "$0")/.."

echo "→ Enviando arquivos para ${TARGET}:${REMOTE_DIR} (SSH na porta ${SSH_PORT})"
ssh -p "$SSH_PORT" "$TARGET" "mkdir -p '${REMOTE_DIR}'"
rsync -az --delete -e "ssh -p ${SSH_PORT}" \
  --exclude '.git' --exclude 'node_modules' --exclude '**/node_modules' --exclude '**/dist' \
  --exclude '.env' --exclude '.env.*' --exclude '.pgdata' --exclude 'backups' \
  ./ "${TARGET}:${REMOTE_DIR}/"

echo "→ Construindo e subindo os containers"
ssh -p "$SSH_PORT" "$TARGET" "cd '${REMOTE_DIR}' && test -f .env || { echo 'ERRO: falta o arquivo .env na VPS (copie .env.example para .env e preencha).'; exit 1; }; docker compose up -d --build && docker compose ps"

echo "✓ Pronto. Logs: ssh -p ${SSH_PORT} ${TARGET} 'cd ${REMOTE_DIR} && docker compose logs -f app'"
