param(
  [int]$Port = 3000,
  [string[]]$QaPhases = @(),
  [switch]$CleanInstall,
  [switch]$SkipQa
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$webDir = Join-Path $root "demo\web"
$qaDir = Join-Path $root "demo\qa"
$baseUrl = "http://localhost:$Port"
$serverOutLog = Join-Path $root "tmp\validate-local-next.out.log"
$serverErrLog = Join-Path $root "tmp\validate-local-next.err.log"

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

function Wait-ForHttp($Url, $Seconds = 45) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 3 | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "Timed out waiting for $Url"
}

function Assert-Status($Path, [int[]]$Expected) {
  $url = "$baseUrl$Path"
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 10
    $status = [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
    } else {
      throw
    }
  }

  if ($Expected -notcontains $status) {
    throw "Expected $url to return one of [$($Expected -join ', ')], got $status"
  }
}

function Stop-PortOwner([int]$ListenPort) {
  $pattern = ":$ListenPort\s+.*LISTENING\s+(\d+)"
  $owners = netstat -ano | Select-String -Pattern $pattern | ForEach-Object {
    if ($_.Line -match $pattern) { [int]$Matches[1] }
  } | Select-Object -Unique

  foreach ($owner in $owners) {
    Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
  }
}

Step "Installing demo web dependencies"
Push-Location $webDir
if ($CleanInstall) {
  Run "npm" @("ci", "--no-audit", "--no-fund")
} else {
  Run "npm" @("install", "--no-audit", "--no-fund")
}

Step "Generating Prisma client"
Run "npx" @("prisma", "generate")

Step "Typechecking demo web"
Run "npx" @("tsc", "--noEmit")

Step "Building demo web"
Run "npm" @("run", "build")
Pop-Location

if ($SkipQa) {
  Step "Skipping localhost QA"
  exit 0
}

Step "Installing QA dependencies"
Push-Location $qaDir
if ($CleanInstall) {
  Run "npm" @("ci", "--no-audit", "--no-fund")
} else {
  Run "npm" @("install", "--no-audit", "--no-fund")
}
Run "npx" @("tsc", "--noEmit")
Pop-Location

Step "Starting production server on $baseUrl"
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
$npm = if ($npmCmd) { $npmCmd.Source } else { (Get-Command npm).Source }
New-Item -ItemType Directory -Force -Path (Split-Path $serverOutLog) | Out-Null

$server = Start-Process -WindowStyle Hidden -FilePath $npm `
  -ArgumentList @("run", "start", "--", "-p", "$Port") `
  -WorkingDirectory $webDir `
  -RedirectStandardOutput $serverOutLog `
  -RedirectStandardError $serverErrLog `
  -PassThru

try {
  Wait-ForHttp "$baseUrl/login"

  Step "Running localhost smoke checks against $baseUrl"
  Assert-Status "/login" @(200)
  Assert-Status "/signup" @(200)
  Assert-Status "/" @(302, 307, 308)
  Assert-Status "/api/dashboard" @(401)

  if ($QaPhases.Count -gt 0) {
    Step "Running QA phases against $baseUrl"
    Push-Location $qaDir
    foreach ($phase in $QaPhases) {
      Write-Host ""
      Write-Host "QA phase: $phase"
      $env:QA_BASE_URL = $baseUrl
      Run "npm" @("run", "qa:$phase")
    }
    Pop-Location
  }
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
  Stop-PortOwner $Port
}

Step "Local validation complete"
