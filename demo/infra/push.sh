#!/usr/bin/env bash
# Local-side companion to deploy.sh. Rsyncs demo/ to the VM, then optionally deploys.
# Run from local Git Bash or any shell with ssh + rsync.
#
# Pre-req: ~/.ssh/config has Host `tradex-vm` configured with the right key + user.
#
# Usage:
#   bash demo/infra/push.sh                # rsync + run deploy.sh
#   bash demo/infra/push.sh --no-deploy    # rsync only
#   bash demo/infra/push.sh --dry-run      # preview rsync changes only

set -euo pipefail

REMOTE="tradex-vm"
REMOTE_DIR="/opt/tradex"
LOCAL_DIR="$(cd "$(dirname "$0")/../.." && pwd)/demo"

DEPLOY=true
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --no-deploy) DEPLOY=false ;;
    --dry-run) DRY_RUN=true; DEPLOY=false ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

echo "Pushing $LOCAL_DIR/ -> $REMOTE:$REMOTE_DIR/demo/"

# Ensure target exists and is writable by ubuntu. deploy.sh later chowns to tradex.
ssh "$REMOTE" "sudo mkdir -p $REMOTE_DIR && sudo chown -R ubuntu:ubuntu $REMOTE_DIR"

if ! $DRY_RUN; then
  SNAPSHOT="tradex-demo-code-$(date -u +%Y%m%dT%H%M%SZ).tgz"
  echo "Creating remote safety snapshot: $REMOTE_DIR/backups/$SNAPSHOT"
  ssh "$REMOTE" "sudo mkdir -p $REMOTE_DIR/backups && \
    sudo tar -C $REMOTE_DIR \
      --exclude='demo/.env' \
      --exclude='demo/web/.env' \
      --exclude='demo/demo.db' \
      --exclude='demo/demo.db-shm' \
      --exclude='demo/demo.db-wal' \
      --exclude='demo/web/node_modules' \
      --exclude='demo/web/.next' \
      --exclude='demo/worker/.venv' \
      --exclude='demo/worker/__pycache__' \
      --exclude='demo/worker/sessions' \
      --exclude='demo/qa/node_modules' \
      --exclude='*.pyc' \
      --exclude='*.log' \
      -czf $REMOTE_DIR/backups/$SNAPSHOT demo && \
    sudo chown ubuntu:ubuntu $REMOTE_DIR/backups/$SNAPSHOT"
fi

RSYNC_FLAGS="-avz --delete"
if $DRY_RUN; then
  RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"
  echo "Dry run only: no files will be changed"
fi

# Exclude runtime state and generated artifacts that must never be pushed.
rsync $RSYNC_FLAGS \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'demo.db' \
  --exclude 'demo.db-journal' \
  --exclude 'demo.db-shm' \
  --exclude 'demo.db-wal' \
  --exclude 'sessions/*.session' \
  --exclude 'sessions/*.session-journal' \
  --exclude '*.log' \
  --exclude '.env' \
  --exclude '.env.local' \
  -e ssh \
  "$LOCAL_DIR/" \
  "$REMOTE:$REMOTE_DIR/demo/"

if $DRY_RUN; then
  echo "Dry run complete"
  exit 0
fi

echo "Sync complete"

if $DEPLOY; then
  echo "Running deploy.sh on $REMOTE"
  ssh "$REMOTE" "sudo bash $REMOTE_DIR/demo/infra/deploy.sh"
else
  echo "Skipping deploy (--no-deploy). Run manually:"
  echo "    ssh $REMOTE 'sudo bash $REMOTE_DIR/demo/infra/deploy.sh'"
fi
