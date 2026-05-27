param(
  [string]$Remote = "tradex-vm",
  [string]$RemoteDir = "/opt/tradex",
  [switch]$NoDeploy
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$tmpDir = Join-Path $repoRoot "tmp"
$archive = Join-Path $tmpDir "tradex-demo-upload.tgz"
$remoteArchive = "/tmp/tradex-demo-upload.tgz"
$remoteScript = Join-Path $tmpDir "tradex-demo-deploy.sh"
$deployFlag = if ($NoDeploy) { "false" } else { "true" }

function Step($Message) {
  Write-Host ""
  Write-Host "==> $Message"
}

function Run($Command, [string[]]$Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
  }
}

New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
Remove-Item -LiteralPath $archive, $remoteScript -Force -ErrorAction SilentlyContinue

Step "Creating local demo archive"
Push-Location $repoRoot
Run "tar.exe" @(
  "-czf", $archive,
  "--exclude=demo/.env",
  "--exclude=demo/web/.env",
  "--exclude=demo/web/node_modules",
  "--exclude=demo/web/.next",
  "--exclude=demo/qa/node_modules",
  "--exclude=demo/worker/.venv",
  "--exclude=demo/worker/__pycache__",
  "--exclude=demo/worker/sessions",
  "--exclude=demo/demo.db",
  "--exclude=demo/demo.db-journal",
  "--exclude=demo/demo.db-shm",
  "--exclude=demo/demo.db-wal",
  "--exclude=*.pyc",
  "--exclude=*.log",
  "demo"
)
Pop-Location

@'
#!/usr/bin/env bash
set -euo pipefail

REMOTE_DIR="$1"
ARCHIVE="$2"
DEPLOY="$3"
REMOTE_USER="$(id -un)"
UPLOAD_DIR="/tmp/tradex-demo-upload"
SNAPSHOT="tradex-demo-code-$(date -u +%Y%m%dT%H%M%SZ).tgz"

echo "Preparing $REMOTE_DIR"
sudo mkdir -p "$REMOTE_DIR" "$REMOTE_DIR/backups"
sudo chown -R "$REMOTE_USER:$REMOTE_USER" "$REMOTE_DIR"

if [ -d "$REMOTE_DIR/demo" ]; then
  echo "Creating remote safety snapshot: $REMOTE_DIR/backups/$SNAPSHOT"
  sudo tar -C "$REMOTE_DIR" \
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
    -czf "$REMOTE_DIR/backups/$SNAPSHOT" demo
  sudo chown "$REMOTE_USER:$REMOTE_USER" "$REMOTE_DIR/backups/$SNAPSHOT"
fi

rm -rf "$UPLOAD_DIR"
mkdir -p "$UPLOAD_DIR"
tar -xzf "$ARCHIVE" -C "$UPLOAD_DIR"

echo "Syncing demo code"
rsync -a --delete \
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
  "$UPLOAD_DIR/demo/" "$REMOTE_DIR/demo/"

if [ "$DEPLOY" = "true" ]; then
  echo "Running deploy.sh"
  sudo bash "$REMOTE_DIR/demo/infra/deploy.sh"
else
  echo "Skipping deploy (--NoDeploy)"
fi
'@ | Set-Content -LiteralPath $remoteScript -Encoding ascii

Step "Uploading archive and remote deploy helper"
Run "scp" @($archive, "$Remote`:$remoteArchive")
Run "scp" @($remoteScript, "$Remote`:/tmp/tradex-demo-deploy.sh")

Step "Running remote sync/deploy"
Run "ssh" @($Remote, "bash /tmp/tradex-demo-deploy.sh '$RemoteDir' '$remoteArchive' '$deployFlag'")

Step "Done"
