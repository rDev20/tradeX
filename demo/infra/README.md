# tradeX deploy infra

Deploys the demo to a single Ubuntu 24.04 VM with HTTPS via Caddy + Let's Encrypt
(using `nip.io` magic DNS so we don't need to own a domain for closed beta).

## What runs on the VM

- **Caddy** on :80 / :443 — auto-HTTPS, reverse-proxies to Next.js
- **tradex-web** systemd unit — `next start` on :3000 (production build)
- **tradex-worker** systemd unit — Python worker (Telegram + parser + paper-trade + yfinance)
- **SQLite** at `/opt/tradex/demo/demo.db` — single file, daily backup to `/var/backups/tradex/`
- **ufw** firewall — only 22, 80, 443 inbound
- **fail2ban** — SSH brute-force protection

## File layout

```
demo/infra/
├── README.md                 # this file
├── deploy.sh                 # idempotent VM bootstrap (runs ON the VM)
├── push.sh                   # local-side rsync + remote deploy trigger
├── bootstrap-secrets.sh      # one-time: generate prod .env files with rotated secrets
└── systemd/
    ├── tradex-web.service
    └── tradex-worker.service
```

## First deploy — step by step

Run from your **local Windows Git Bash** terminal:

### 1. Push code to VM (does NOT deploy yet)

```bash
bash demo/infra/push.sh --no-deploy
```

This rsyncs the repo to `/opt/tradex/demo/`, excluding node_modules, .next, .venv, sessions, .env, demo.db.

### 2. SSH in and bootstrap secrets

```bash
ssh tradex-vm
sudo bash /opt/tradex/demo/infra/bootstrap-secrets.sh
```

Prompts for `TELEGRAM_API_ID` + `TELEGRAM_API_HASH` (same values from your local `.env`).
Generates fresh `SESSION_SECRET` and `PII_ENCRYPTION_KEY` for production.
Files end up at:
- `/opt/tradex/demo/.env` (worker)
- `/opt/tradex/demo/web/.env` (web)

### 3. Run deploy

```bash
# (still SSH'd into the VM)
sudo bash /opt/tradex/demo/infra/deploy.sh
```

Installs Node + Python + Caddy + ufw + fail2ban, builds Next.js, sets up systemd, configures
Caddy with `103-240-24-3.nip.io` → :3000, enables daily backup cron.

### 4. Verify

```bash
sudo systemctl status tradex-web tradex-worker caddy
sudo journalctl -u tradex-web -n 30
sudo journalctl -u tradex-worker -n 30
```

From any browser: **https://103-240-24-3.nip.io**

## Subsequent deploys (after code changes)

### Standard delivery flow

Use this order for normal work:

1. Make code changes locally.
2. Run local validation:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-local.ps1
```

For deeper feature QA, pass explicit phases, for example:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-local.ps1 -QaPhases m0.2,m0.3
```

3. Commit and push to `main`.
4. GitHub Actions runs CI.
5. If CI passes on `main`, the `Deploy VM` workflow syncs `demo/` to the VM, runs
   `deploy.sh`, and smoke-checks `https://103-240-24-3.nip.io/login`.

The public beta URL remains:

```text
https://103-240-24-3.nip.io
```

Required GitHub repository secrets for automatic deploy:

| Secret | Value |
|---|---|
| `VM_HOST` | VM IP or hostname, e.g. `103.240.24.3` |
| `VM_USER` | SSH user, usually `ubuntu` |
| `VM_SSH_PRIVATE_KEY` | Private key that can SSH to the VM |
| `VM_PORT` | Optional, defaults to `22` |
| `VM_DEPLOY_DIR` | Optional, defaults to `/opt/tradex` |
| `VM_SUBDOMAIN` | Optional, defaults to `103-240-24-3.nip.io` |

Keep branch protection enabled on `main`: require the CI workflow to pass before
merging, and use pull requests for non-emergency changes.

### Sync discipline

Use local code as the source of truth. The VM is a deploy target, not a second
development workspace.

Before every deploy:

```bash
cd demo/web
npm run build
npx tsc --noEmit
cd ../..
bash demo/infra/push.sh --dry-run
```

If the dry run looks right, deploy:

```bash
bash demo/infra/push.sh    # rsync + auto-trigger deploy.sh on VM
```

Or to push without redeploying:

```bash
bash demo/infra/push.sh --no-deploy
ssh tradex-vm 'sudo systemctl restart tradex-web tradex-worker'
```

`push.sh` creates a timestamped remote code snapshot in `/opt/tradex/backups/`
before syncing. Runtime state is excluded from both snapshots and rsync:
`.env`, SQLite DB files, Telegram sessions, `node_modules`, `.next`, Python venvs,
caches, and logs.

If an emergency hotfix is made directly on the VM, copy that changed file back
to local immediately, run the build checks locally, then redeploy from local.
Do not continue local feature work until the VM hotfix is reconciled.

## Operational quick-ref

| Action | Command |
|---|---|
| Tail web logs | `ssh tradex-vm sudo journalctl -u tradex-web -f` |
| Tail worker logs | `ssh tradex-vm sudo journalctl -u tradex-worker -f` |
| Restart web only | `ssh tradex-vm sudo systemctl restart tradex-web` |
| Restart worker only | `ssh tradex-vm sudo systemctl restart tradex-worker` |
| Check Caddy cert | `ssh tradex-vm sudo caddy reverse-proxy --to localhost:3000` |
| Inspect SQLite | `ssh tradex-vm sudo -u tradex sqlite3 /opt/tradex/demo/demo.db` |
| List backups | `ssh tradex-vm ls -lh /var/backups/tradex/` |
| Disk / memory | `ssh tradex-vm "df -h /; free -h"` |

## Promotion later

When you buy a real domain (e.g. `tradex.in`):
1. Add an A record: `beta.tradex.in` → `103.240.24.3`
2. Edit `/etc/caddy/Caddyfile` on the VM, change `103-240-24-3.nip.io` to `beta.tradex.in`
3. `sudo systemctl reload caddy` — auto-fetches new Let's Encrypt cert
