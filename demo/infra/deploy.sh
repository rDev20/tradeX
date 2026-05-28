#!/usr/bin/env bash
# Deploy the tradeX demo app on a VM.
#
# Defaults keep the existing production deployment unchanged:
#   APP_DIR=/opt/tradex
#   APP_NAME=tradex
#   PORT=3000
#   START_WORKER=1
#
# Staging can use the same script with:
#   APP_DIR=/opt/tradex-staging APP_NAME=tradex-staging PORT=3001 START_WORKER=0

set -euo pipefail

APP_USER="${APP_USER:-tradex}"
APP_DIR="${APP_DIR:-/opt/tradex}"
APP_NAME="${APP_NAME:-tradex}"
SUBDOMAIN="${SUBDOMAIN:-103-240-24-3.nip.io}"
PORT="${PORT:-3000}"
START_WORKER="${START_WORKER:-1}"
SOURCE_APP_DIR="${SOURCE_APP_DIR:-}"
PYTHON_VERSION="${PYTHON_VERSION:-python3.12}"

WEB_SERVICE="${APP_NAME}-web"
WORKER_SERVICE="${APP_NAME}-worker"
SITE_FILE="/etc/caddy/sites-enabled/${APP_NAME}.caddy"
PRODUCTION_SITE_FILE="/etc/caddy/sites-enabled/tradex.caddy"

log() {
  printf "\n\033[1;34m>\033[0m %s\n" "$*"
}

warn() {
  printf "\033[1;33m!\033[0m %s\n" "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    echo "Run demo/infra/bootstrap-vm.sh on this VM first."
    exit 1
  fi
}

require_command node
require_command npm
require_command caddy
require_command sqlite3

log "Preparing app user and directories"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  sudo useradd -r -m -s /bin/bash "$APP_USER"
fi

sudo mkdir -p "$APP_DIR/demo" /etc/caddy/sites-enabled /var/log/caddy
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
sudo chown caddy:caddy /var/log/caddy

if [ -n "$SOURCE_APP_DIR" ]; then
  log "Copying missing environment files from $SOURCE_APP_DIR"
  if [ ! -f "$APP_DIR/demo/.env" ] && [ -f "$SOURCE_APP_DIR/demo/.env" ]; then
    sudo cp "$SOURCE_APP_DIR/demo/.env" "$APP_DIR/demo/.env"
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR/demo/.env"
    sudo chmod 600 "$APP_DIR/demo/.env"
  fi
  if [ ! -f "$APP_DIR/demo/web/.env" ] && [ -f "$SOURCE_APP_DIR/demo/web/.env" ]; then
    sudo cp "$SOURCE_APP_DIR/demo/web/.env" "$APP_DIR/demo/web/.env"
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR/demo/web/.env"
    sudo chmod 600 "$APP_DIR/demo/web/.env"
  fi
fi

if [ ! -f "$APP_DIR/demo/web/.env" ]; then
  echo "Missing $APP_DIR/demo/web/.env"
  echo "Create it before deploying this environment."
  exit 1
fi

log "Setting up Python venv"
sudo -u "$APP_USER" bash -c "
  cd '$APP_DIR/demo/worker'
  test -d .venv || ${PYTHON_VERSION} -m venv .venv
  .venv/bin/pip install --upgrade pip --quiet
  .venv/bin/pip install -r requirements.txt --quiet
"

log "Installing Node dependencies and building Next.js"
sudo -u "$APP_USER" bash -c "
  cd '$APP_DIR/demo/web'
  npm ci --no-audit --no-fund
  npx prisma db push --skip-generate
  npx prisma generate
  NODE_OPTIONS='--max-old-space-size=3072' npm run build
"

log "Installing systemd services"
sudo tee "/etc/systemd/system/${WEB_SERVICE}.service" >/dev/null <<EOF
[Unit]
Description=tradeX web (${APP_NAME})
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/demo/web
Environment=NODE_ENV=production
Environment=PORT=${PORT}
EnvironmentFile=${APP_DIR}/demo/web/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
NoNewPrivileges=yes
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF

if [ "$START_WORKER" = "1" ]; then
  sudo tee "/etc/systemd/system/${WORKER_SERVICE}.service" >/dev/null <<EOF
[Unit]
Description=tradeX worker (${APP_NAME})
After=network.target ${WEB_SERVICE}.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/demo/worker
EnvironmentFile=${APP_DIR}/demo/.env
ExecStart=${APP_DIR}/demo/worker/.venv/bin/python main.py
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
NoNewPrivileges=yes
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
EOF
fi

sudo systemctl daemon-reload
sudo systemctl enable "$WEB_SERVICE"

if [ "$START_WORKER" = "1" ]; then
  sudo systemctl enable "$WORKER_SERVICE"
else
  sudo systemctl disable --now "$WORKER_SERVICE" 2>/dev/null || true
fi

log "Configuring Caddy site for $SUBDOMAIN"
if ! sudo grep -q "import /etc/caddy/sites-enabled/\\*.caddy" /etc/caddy/Caddyfile 2>/dev/null; then
  sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
{
  email admin@tradex.in
}

import /etc/caddy/sites-enabled/*.caddy
EOF
fi

if [ "$APP_NAME" != "tradex" ] && [ ! -f "$PRODUCTION_SITE_FILE" ]; then
  warn "Creating production Caddy site file during first multi-site deploy"
  sudo tee "$PRODUCTION_SITE_FILE" >/dev/null <<'EOF'
103-240-24-3.nip.io {
  encode gzip
  reverse_proxy 127.0.0.1:3000
  log {
    output file /var/log/caddy/tradex-access.log
  }
}
EOF
fi

sudo tee "$SITE_FILE" >/dev/null <<EOF
${SUBDOMAIN} {
  encode gzip
  reverse_proxy 127.0.0.1:${PORT}
  log {
    output file /var/log/caddy/${APP_NAME}-access.log
  }
}
EOF

sudo systemctl reload caddy || sudo systemctl restart caddy

log "Restarting services"
sudo systemctl restart "$WEB_SERVICE"
sleep 5

if [ "$START_WORKER" = "1" ]; then
  sudo systemctl restart "$WORKER_SERVICE"
fi

log "Service status"
sudo systemctl status "$WEB_SERVICE" --no-pager | head -5 || true
if [ "$START_WORKER" = "1" ]; then
  sudo systemctl status "$WORKER_SERVICE" --no-pager | head -5 || true
fi
sudo systemctl status caddy --no-pager | head -5 || true

cat <<EOF

tradeX deploy complete

  Environment: ${APP_NAME}
  URL:         https://${SUBDOMAIN}
  Web logs:    sudo journalctl -u ${WEB_SERVICE} -f
EOF

if [ "$START_WORKER" = "1" ]; then
  cat <<EOF
  Worker logs: sudo journalctl -u ${WORKER_SERVICE} -f
EOF
fi
