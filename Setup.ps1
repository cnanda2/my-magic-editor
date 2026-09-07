#Requires -Version 5.1
<#
.SYNOPSIS
  StemEducatorApp - Windows Setup (PowerShell)
  Double-click: Right-click -> Run with PowerShell  OR  run as:
    powershell -ExecutionPolicy Bypass -File Setup.ps1

  Checks every prerequisite, auto-installs missing ones, installs app deps,
  runs the interactive wizard (setup.js), creates shortcuts + firewall.
  Safe to re-run. Auto-elevates to Administrator when needed.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ROOT -or $ROOT -eq '') { $ROOT = Get-Location | Select-Object -ExpandProperty Path }
$LOG  = Join-Path $ROOT 'setup.log'
"[$(Get-Date)] Setup.ps1 started ROOT=$ROOT" | Out-File $LOG -Encoding utf8

function Write-Ok  ($m){ Write-Host "  [ OK ] $m" -ForegroundColor Green;  "[ OK ] $m" | Out-File $LOG -Append -Encoding utf8 }
function Write-Warn($m){ Write-Host "  [WARN] $m" -ForegroundColor Yellow; "[WARN] $m" | Out-File $LOG -Append -Encoding utf8 }
function Write-Fail($m){ Write-Host "  [FAIL] $m" -ForegroundColor Red;    "[FAIL] $m" | Out-File $LOG -Append -Encoding utf8 }
function Write-Info($m){ Write-Host "  [ .. ] $m" -ForegroundColor Cyan;   "[ .. ] $m" | Out-File $LOG -Append -Encoding utf8 }
function Section($m)   { Write-Host "`n  -- $m --" -ForegroundColor White; "-- $m --" | Out-File $LOG -Append -Encoding utf8 }

# ── Self-elevate ───────────────────────────────────────────
function Test-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  return ([Security.Principal.WindowsPrincipal]$id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
if (-not (Test-Admin)) {
  Write-Warn "Not running as Administrator - will re-launch elevated"
  Write-Info "If UAC prompts, click Yes"
  try {
    $arg = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process powershell -ArgumentList $arg -Verb RunAs -WorkingDirectory $ROOT
    exit 0
  } catch {
    Write-Warn "Auto-elevate cancelled. Continuing without admin (firewall + machine installs may fail)."
  }
} else {
  Write-Ok "Running as Administrator"
}

Write-Host ""
Write-Host "  +==================================================+" -ForegroundColor Green
Write-Host "  |     StemEducatorApp - Setup  v2.0 (PowerShell)   |" -ForegroundColor Green
Write-Host "  |     Full system check + auto-install              |" -ForegroundColor Green
Write-Host "  +==================================================+" -ForegroundColor Green
Write-Host "  Log: $LOG" -ForegroundColor DarkGray
Write-Host ""

# ── Helpers ────────────────────────────────────────────────
function Has-Cmd($name){ $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $m = (Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -Name Path -ErrorAction SilentlyContinue).Path
  $u = (Get-ItemProperty -Path 'HKCU:\Environment' -Name Path -ErrorAction SilentlyContinue).Path
  if ($m) { $env:Path = $m + ';' + $u }
  # also prepend common locations immediately
  foreach ($p in @('C:\Program Files\nodejs','C:\Program Files (x86)\nodejs')) {
    if (Test-Path "$p\node.exe" -PathType Leaf) { if ($env:Path -notlike "*$p*") { $env:Path = "$p;" + $env:Path } }
  }
  for ($v=18; $v -ge 10; $v--) {
    foreach ($b in @("C:\Program Files\PostgreSQL\$v\bin","C:\Program Files (x86)\PostgreSQL\$v\bin")) {
      if (Test-Path "$b\psql.exe" -PathType Leaf) { if ($env:Path -notlike "*$b*") { $env:Path = "$b;" + $env:Path } }
    }
  }
}
function Find-Psql {
  if (Has-Cmd psql) { return (Get-Command psql).Source }
  for ($v=18; $v -ge 10; $v--) {
    foreach ($b in @("C:\Program Files\PostgreSQL\$v\bin\psql.exe","C:\Program Files (x86)\PostgreSQL\$v\bin\psql.exe")) {
      if (Test-Path $b) { return $b }
    }
  }
  foreach ($d in (Get-ChildItem 'C:\Program Files\PostgreSQL\*' -Directory -ErrorAction SilentlyContinue)) {
    $c = Join-Path $d.FullName 'bin\psql.exe'
    if (Test-Path $c) { return $c }
  }
  # EDB registry (covers custom install paths the folder scan misses)
  foreach ($rk in @('HKLM:\SOFTWARE\PostgreSQL\Installations\*','HKLM:\SOFTWARE\WOW6432Node\PostgreSQL\Installations\*')) {
    foreach ($k in (Get-ItemProperty $rk -ErrorAction SilentlyContinue)) {
      foreach ($prop in @('BaseDirectory','InstallationDirectory','InstallDir')) {
        $base = $k.$prop
        if ($base) {
          $c = Join-Path $base 'bin\psql.exe'
          if (Test-Path $c) { return $c }
        }
      }
    }
  }
  # Windows service hint (installed but bin not on disk layout above)
  $svc = Get-Service postgresql* -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($svc) { Write-Info "PostgreSQL service found: $($svc.Name) ($($svc.Status))" }
  return $null
}

# ── 1) Node.js ────────────────────────────────────────────
function Test-PgConnection($psql, $user, $password, $db='postgres') {
  $env:PGPASSWORD = $password
  & $psql -h localhost -p 5432 -U $user -d $db -c "SELECT 1" 2>&1 | Out-Null
  return ($LASTEXITCODE -eq 0)
}

Section "1/7  Checking Node.js"
$nodeOk = $false
$nodeVer = $null
if (Has-Cmd node) {
  try { $nodeVer = (node -v) -replace '^v','' } catch {}
  if ($nodeVer) {
    $major = [int]($nodeVer.Split('.')[0])
    if ($major -ge 18) { Write-Ok "Node.js v$nodeVer"; $nodeOk = $true } else { Write-Warn "Node.js v$nodeVer too old (need 18+)" }
  }
}
if (-not $nodeOk) {
  Write-Warn "Node.js missing or too old."
  $ans = Read-Host "  Install Node.js LTS now? [Y/n]"
  if ($ans -eq '' -or $ans -match '^[Yy]') {
    Write-Info "Installing Node.js LTS..."
    $installed = $false
    if (Has-Cmd winget) {
      Write-Info "Trying winget..."
      try { winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements | Out-File $LOG -Append -Encoding utf8; if ($LASTEXITCODE -eq 0){ $installed=$true } } catch {}
      if (-not $installed) { try { winget install --id OpenJS.NodeJS -e --silent --accept-source-agreements --accept-package-agreements | Out-File $LOG -Append -Encoding utf8; if ($LASTEXITCODE -eq 0){ $installed=$true } } catch {} }
    }
    if (-not $installed -and (Has-Cmd choco)) {
      Write-Info "Trying Chocolatey..."
      try { choco install nodejs-lts -y --force | Out-File $LOG -Append -Encoding utf8; if ($LASTEXITCODE -eq 0){ $installed=$true } } catch {}
    }
    if (-not $installed) {
      Write-Info "Downloading MSI..."
      try {
        $url = 'https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi'
        $out = Join-Path $env:TEMP 'node-lts.msi'
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        Start-Process msiexec -ArgumentList "/i `"$out`" /qn" -Wait
        $installed = $true
      } catch { Write-Fail "MSI download failed: $_" }
    }
    Refresh-Path
    Start-Sleep -Seconds 2
    if (Has-Cmd node) { $nodeVer = (node -v); Write-Ok "Node.js $nodeVer installed" } else { Write-Fail "Install did not put node on PATH. Restart terminal and re-run Setup.ps1"; Read-Host "Press Enter to exit"; exit 1 }
  } else {
    Write-Info "Please install from https://nodejs.org (LTS) then re-run"
    Start-Process "https://nodejs.org"
    Read-Host "Press Enter to exit"; exit 1
  }
}

# ── 2) npm ────────────────────────────────────────────────
Section "2/7  Checking npm"
if (-not (Has-Cmd npm)) { Write-Fail "npm not found - reinstall Node.js"; Read-Host "Press Enter"; exit 1 }
Write-Ok "npm $(npm --version)"

# ── 3) PostgreSQL ─────────────────────────────────────────
Section "3/7  Checking PostgreSQL"
$psql = Find-Psql
if ($psql) {
  try { $v = & $psql --version 2>&1 | Out-String } catch { $v = $psql }
  Write-Ok ($v.Trim() + " @ $psql")
  # ensure on PATH
  $dir = Split-Path $psql -Parent
  if ($env:Path -notlike "*$dir*") { $env:Path = "$dir;" + $env:Path }
} else {
  Write-Warn "psql not found."
  Write-Host "  [Y] Yes install now  [N] I will install  [S] Skip" -ForegroundColor Yellow
  $ans = Read-Host "  Choice [Y/N/S]"
  if ($ans -match '^[Yy]' -or $ans -eq '') {
    Write-Info "Installing PostgreSQL..."
    $ok=$false
    if (Has-Cmd winget) {
      try { winget install --id PostgreSQL.PostgreSQL -e --silent --accept-source-agreements --accept-package-agreements | Out-File $LOG -Append -Encoding utf8; if($LASTEXITCODE -eq 0){$ok=$true}} catch {}
      if(-not $ok){ try { winget install --id PostgreSQL.PostgreSQL.16 -e --silent --accept-source-agreements --accept-package-agreements | Out-File $LOG -Append -Encoding utf8; if($LASTEXITCODE -eq 0){$ok=$true}} catch {}}
    }
    if(-not $ok -and (Has-Cmd choco)){ try{ choco install postgresql16 -y --params "/Password:postgres" | Out-File $LOG -Append -Encoding utf8; if($LASTEXITCODE -eq 0){$ok=$true}} catch {}}
    Refresh-Path
    $psql = Find-Psql
    if ($psql) { Write-Ok "PostgreSQL installed @ $psql" } else { Write-Warn "Auto-install didn't add psql to PATH. Create DB manually later." }
  } elseif ($ans -match '^[Nn]') {
    Write-Info "Install from https://www.postgresql.org/download/ and check 'Add to PATH'"
    Start-Process "https://www.postgresql.org/download/"
  } else { Write-Info "Skipping - wizard will ask to create DB manually" }
}

# ── 4) App dependencies ───────────────────────────────────
Section "4/7  Installing app dependencies"
function NpmInstall($dir, $args) {
  # Stream output live so install never looks "silent"; tee to log.
  Write-Info "Running: npm $args (in $dir) - this can take 1-3 min, please wait..."
  Push-Location $dir
  try {
    & npm $args.Split(' ') 2>&1 | Tee-Object -FilePath $LOG -Append | Write-Host
    $code = $LASTEXITCODE
    "[npm exit code: $code]" | Out-File $LOG -Append -Encoding utf8
    return $code
  } finally { Pop-Location }
}
if (Test-Path (Join-Path $ROOT 'backend\package.json')) {
  $expressOk = Test-Path (Join-Path $ROOT 'backend\node_modules\express\package.json')
  $dotenvOk = Test-Path (Join-Path $ROOT 'backend\node_modules\dotenv\package.json')
  if (-not $expressOk) {
    Write-Info "Backend dependencies missing (express not found) - installing..."
    $c = NpmInstall (Join-Path $ROOT 'backend') 'install --omit=dev'
    if ($c -ne 0) { Write-Warn "retry with --legacy-peer-deps"; $c = NpmInstall (Join-Path $ROOT 'backend') 'install --legacy-peer-deps' }
    if ($c -ne 0) { Write-Fail "backend npm install failed - see $LOG"; Write-Fail "Try manually: cd backend && npm install"; Read-Host "Enter"; exit 1 }
    if (-not (Test-Path (Join-Path $ROOT 'backend\node_modules\express\package.json'))) { Write-Fail "Verify failed - express still missing"; Read-Host "Enter"; exit 1 }
    Write-Ok "Backend deps installed"
  } elseif (-not $dotenvOk) {
    Write-Info "Adding dotenv (missing) - quick install, please wait..."
    $c = NpmInstall (Join-Path $ROOT 'backend') 'install dotenv --save'
    if ($c -ne 0) { Write-Warn "dotenv install failed, continuing (backend still boots with defaults)" }
    Write-Ok "Backend deps present (express + dotenv found) - skipping full verify"
  } else {
    # Both sentinels present: SKIP the slow 'npm install --omit=dev' verify entirely.
    # That verify was the silent-hang culprit (minutes with no output in Program Files).
    Write-Ok "Backend deps present (express + dotenv found) - skipping npm verify"
  }
}
if (Test-Path (Join-Path $ROOT 'frontend\package.json')) {
  # Frontend runtime only needs frontend/dist (served statically). Skip heavy
  # 'npm install' (392 pkgs) when dist already exists - it is not needed to run.
  $distOk = Test-Path (Join-Path $ROOT 'frontend\dist\index.html')
  $reactOk = Test-Path (Join-Path $ROOT 'frontend\node_modules\react\package.json')
  if ($distOk) {
    Write-Ok "Frontend build present (frontend\dist) - skipping frontend npm install (not needed at runtime)"
  } elseif (-not $reactOk) {
    Write-Info "Frontend dependencies missing (react not found) - installing..."
    $c = NpmInstall (Join-Path $ROOT 'frontend') 'install'
    if ($c -ne 0){ Write-Warn "retry with --legacy-peer-deps"; $c = NpmInstall (Join-Path $ROOT 'frontend') 'install --legacy-peer-deps' }
    if ($c -ne 0){ Write-Fail "frontend npm install failed - see $LOG"; Read-Host "Enter"; exit 1 }
    Write-Ok "Frontend deps installed"
  } else { Write-Ok "Frontend deps present (react found)" }
}

# ── 5) Build artifacts ────────────────────────────────────
Section "5/7  Verifying build artifacts"
if (-not (Test-Path (Join-Path $ROOT 'build\editor.html'))) { Write-Warn "build\editor.html missing" } else { Write-Ok "Editor build found" }
if (-not (Test-Path (Join-Path $ROOT 'frontend\dist\index.html'))) {
  Write-Warn "frontend\dist missing - building..."
  if (Test-Path (Join-Path $ROOT 'frontend\package.json')) {
    $c = NpmInstall (Join-Path $ROOT 'frontend') 'run build'
    if ($c -eq 0){ Write-Ok "Frontend built" } else { Write-Warn "frontend build failed - see $LOG" }
  }
} else { Write-Ok "Frontend build found" }

# ── 6) Wizard ─────────────────────────────────────────────
Section "6/7  Configuration wizard"
if (-not (Test-Path (Join-Path $ROOT 'setup.js'))) { Write-Fail "setup.js not found"; Read-Host "Enter"; exit 1 }
Write-Host "  Running fully automated - no prompts, sensible defaults for everything." -ForegroundColor Cyan
Write-Host "  To customize (admin email, company name, etc.) instead, run:  node setup.js" -ForegroundColor DarkGray
node (Join-Path $ROOT 'setup.js') --yes
if ($LASTEXITCODE -ne 0){ Write-Fail "Wizard exited code $LASTEXITCODE"; Read-Host "Enter"; exit $LASTEXITCODE }

# ── 7) Verify + shortcut + firewall ───────────────────────
Section "7/7  Verifying installation"
if (-not (Test-Path (Join-Path $ROOT 'backend\.env'))) { Write-Fail "backend\.env not created"; Read-Host "Enter"; exit 1 }
Write-Ok "Config backend\.env created"
if (-not (Test-Path (Join-Path $ROOT 'backend\node_modules\dotenv\package.json'))) {
  Write-Info "Installing dotenv..."
  NpmInstall (Join-Path $ROOT 'backend') 'install dotenv --save' | Out-Null
}
# Desktop shortcut + Start Menu entries: setup.js already created these a few
# steps ago (step 6, "Creating shortcuts") - redoing it here just wrote a second,
# separate Start Menu folder and re-saved the same Desktop shortcut for no reason.

# Firewall (needs admin)
try {
  $envLine = Get-Content (Join-Path $ROOT 'backend\.env') | Where-Object { $_ -match '^PORT=' }
  $port = ($envLine -split '=',2)[1].Trim()
  if (-not $port) { $port = '3001' }
  if (Test-Admin) {
    New-NetFirewallRule -DisplayName 'StemEducatorApp' -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Write-Ok "Firewall inbound TCP $port allowed"
  } else { Write-Warn "Run as Admin to add firewall rule for port $port" }
} catch { Write-Warn "Firewall: $_" }

Write-Host ""
Write-Host "  ==========================================================" -ForegroundColor Green
Write-Host "   Setup complete!" -ForegroundColor Green
Write-Host "  ==========================================================" -ForegroundColor Green
Write-Host "  Next: Double-click start.bat or Desktop shortcut" -ForegroundColor White
$be = (Get-Content (Join-Path $ROOT 'backend\.env') | Where-Object { $_ -match '^BACKEND_URL=' }) -split '=',2 | Select-Object -Last 1
if ($be) { Write-Host "  Browser: $be" -ForegroundColor Cyan }
Write-Host "  Re-configure: re-run Setup.ps1 or edit backend\.env" -ForegroundColor DarkGray
Write-Host "  Log: $LOG" -ForegroundColor DarkGray
Write-Host ""
Read-Host "Press Enter to exit"
