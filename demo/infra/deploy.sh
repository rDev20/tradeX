#!/usr/bin/env bash
# tradeX VM bootstrap — idempotent. Run on the target VM as user `ubuntu` with passwordless sudo.
#
# What it does:
#   1. apt update + install Node 20, Python 3.12 venv, Caddy, sqlite3, ufw, fail2ban
#   2. lock down ufw to ports 22 / 80 / 443
#   3. install repo at /opt/tradex (rsync from local — see scripts/push.sh)
#   4. set up Python venv + Telethon + yfinance
#   5. set up Node deps + Prisma client + production build
#   6. install systemd units (tradex-web, tradex-worker)
#   7. configure Caddy with nip.io domain → :3000 (auto Let's Encrypt cert)
#   8. enable + start services
#   9. set up daily SQLite backup cron
#
# Usage on the VM:
#   sudo bash /opt/tradex/infra/deploy.sh

set -euo pipefail

APP_USER="${APP_USER:-tradex}"
APP_DIR="${APP_DIR:-/opt/tradex}"
SUBDOMAIN="${SUBDOMAIN:-103-240-24-3.nip.io}"
NODE_MAJOR=20
PYTHON_VERSION=python3.12

log()  { printf "\n\033[1;34m▶\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }

# ─────── Step 1 — System packages ───────
log "Updating apt & installing system packages"
sudo apt-get update -y
sudo apt-get install -y \
  curl ca-certificates gnupg \
  build-essential git \
  python3.12 python3.12-venv python3-pip \
  sqlite3 \
  ufw fail2ban

# Node 20 (NodeSource)
if ! command -v node >/dev/null 2>&1 || [[ "$(node --version)" != v${NODE_MAJOR}* ]]; then
  log "Installing Node ${NODE_MAJOR}"
  curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version
npm --version

# Caddy (official repo)
if ! command -v caddy >/dev/null 2>&1; then
  log "Installing Caddy"
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi
caddy version

# ─────── Step 2 — Firewall + fail2ban ───────
log "Configuring ufw firewall"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose

log "Enabling fail2ban"
sudo systemctl enable --now fail2ban

# ─────── Step 3 — App user ───────
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "Creating app user: $APP_USER"
  sudo useradd -r -m -s /bin/bash "$APP_USER"
fi
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ─────── Step 4 — Python venv ───────
log "Setting up Python venv"
sudo -u "$APP_USER" bash -c "
  cd '$APP_DIR/demo/worker'
  test -d .venv || ${PYTHON_VERSION} -m venv .venv
  .venv/bin/pip install --upgrade pip --quiet
  .venv/bin/pip install -r requirements.txt --quiet
"

# ─────── Step 5 — Node + Prisma + build ───────
log "Installing Node deps + building Next.js"
sudo -u "$APP_USER" bash -c "
  cd '$APP_DIR/demo/web'
  npm ci --no-audit --no-fund
  npx prisma db push --skip-generate
  npx prisma generate
  NODE_OPTIONS='--max-old-space-size=3072' npm run build
"

# ─────── Step 6 — systemd ───────
log "Installing systemd units"
sudo cp "$APP_DIR/demo/infra/systemd/tradex-web.service" /etc/systemd/system/
sudo cp "$APP_DIR/demo/infra/systemd/tradex-worker.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable tradex-web tradex-worker

# ─────── Step 7 — Caddy ───────
log "Configuring Caddy ($SUBDOMAIN)"
sudo bash -c "cat > /etc/caddy/Caddyfile" <<EOF
{
  email admin@tradex.in
}

${SUBDOMAIN} {
  encode gzip
  reverse_proxy 127.0.0.1:3000
  log {
    output file /var/log/caddy/tradex-access.log
  }
}
EOF
sudo mkdir -p /var/log/caddy
sudo chown caddy:caddy /var/log/caddy
sudo systemctl restart caddy

# ─────── Step 8 — start services ───────
log "Starting tradex-web + tradex-worker"
sudo systemctl restart tradex-web
sleep 5
sudo systemctl restart tradex-worker

# ─────── Step 9 — daily backup cron ───────
log "Installing daily SQLite backup cron"
sudo bash -c "cat > /etc/cron.daily/tradex-backup" <<'EOF'
#!/usr/bin/env bash
set -e
DST="/var/backups/tradex"
mkdir -p "$DST"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
sqlite3 /opt/tradex/demo/demo.db ".backup '$DST/demo-${TS}.db'"
# keep last 14
ls -1t "$DST"/demo-*.db | tail -n +15 | xargs -r rm
EOF
sudo chmod +x /etc/cron.daily/tradex-backup

# ─────── Smoke check ───────
log "Smoke check"
sleep 3
sudo systemctl status tradex-web --no-pager | head -5 || true
sudo systemctl status tradex-worker --no-pager | head -5 || true
sudo systemctl status caddy --no-pager | head -5 || true

cat <<EOF

──────────────────────────────────────────────────
✅ tradeX deploy complete

  URL:      https://${SUBDOMAIN}
  Logs:     sudo journalctl -u tradex-web -f
            sudo journalctl -u tradex-worker -f
            sudo tail -f /var/log/caddy/tradex-access.log
  Status:   systemctl status tradex-web tradex-worker caddy

  Backups:  /var/backups/tradex/  (daily, 14-day retention)

──────────────────────────────────────────────────
EOF
