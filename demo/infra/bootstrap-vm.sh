#!/usr/bin/env bash
# One-time VM bootstrap for tradeX.
# Re-run only when system packages or base VM configuration need changing.

set -euo pipefail

NODE_MAJOR="${NODE_MAJOR:-20}"
PYTHON_VERSION="${PYTHON_VERSION:-python3.12}"

log() {
  printf "\n\033[1;34m>\033[0m %s\n" "$*"
}

log "Installing base system packages"
sudo apt-get update -y
sudo apt-get install -y \
  curl ca-certificates gnupg \
  build-essential git \
  "$PYTHON_VERSION" "$PYTHON_VERSION-venv" python3-pip \
  sqlite3 \
  ufw fail2ban

if ! command -v node >/dev/null 2>&1 || [[ "$(node --version)" != v${NODE_MAJOR}* ]]; then
  log "Installing Node ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null 2>&1; then
  log "Installing Caddy"
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -y
  sudo apt-get install -y caddy
fi

log "Configuring firewall"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

log "Enabling fail2ban"
sudo systemctl enable --now fail2ban

log "Installing daily SQLite backup cron"
sudo tee /etc/cron.daily/tradex-backup >/dev/null <<'EOF'
#!/usr/bin/env bash
set -e
DST="/var/backups/tradex"
mkdir -p "$DST"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
if [ -f /opt/tradex/demo/demo.db ]; then
  sqlite3 /opt/tradex/demo/demo.db ".backup '$DST/demo-${TS}.db'"
fi
ls -1t "$DST"/demo-*.db 2>/dev/null | tail -n +15 | xargs -r rm
EOF
sudo chmod +x /etc/cron.daily/tradex-backup

node --version
npm --version
caddy version

log "VM bootstrap complete"
