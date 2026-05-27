#!/usr/bin/env bash
# Generates production .env files on the VM with FRESHLY ROTATED secrets.
# Run ONCE on the VM after the first push, before deploy.sh.
#
# Usage on VM:
#   sudo bash /opt/tradex/demo/infra/bootstrap-secrets.sh

set -euo pipefail

APP_DIR="/opt/tradex/demo"

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "▶ Creating $APP_DIR/.env (worker-side)"
  read -r -p "TELEGRAM_API_ID: " TG_API_ID
  read -r -p "TELEGRAM_API_HASH: " TG_API_HASH
  cat > "$APP_DIR/.env" <<EOF
TELEGRAM_API_ID=${TG_API_ID}
TELEGRAM_API_HASH=${TG_API_HASH}
TELEGRAM_PHONE=
TELEGRAM_SESSION_NAME=tradex_demo
OPENAI_API_KEY=
DATABASE_URL=file:../demo.db
SESSION_DIR=./sessions
EOF
  chown tradex:tradex "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi

if [[ ! -f "$APP_DIR/web/.env" ]]; then
  echo "▶ Creating $APP_DIR/web/.env (web-side, freshly rotated secrets)"
  SESSION_SECRET="$(openssl rand -hex 32)"
  PII_KEY="$(openssl rand -hex 32)"
  cat > "$APP_DIR/web/.env" <<EOF
DATABASE_URL="file:../../demo.db"
SESSION_SECRET="${SESSION_SECRET}"
PII_ENCRYPTION_KEY="${PII_KEY}"
MAX_BETA_USERS="10"
EOF
  chown tradex:tradex "$APP_DIR/web/.env"
  chmod 600 "$APP_DIR/web/.env"
  echo "  SESSION_SECRET rotated."
  echo "  PII_ENCRYPTION_KEY rotated."
  echo "  ⚠ NOTE: Any PII (PAN) encrypted with the OLD local-dev key cannot be decrypted on this VM."
  echo "    (Beta users will re-enter their PAN if they wish — optional field anyway.)"
fi

echo "▶ Done. Next: bash $APP_DIR/infra/deploy.sh"
