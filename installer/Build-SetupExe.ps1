<#
  Build StemEducatorApp-Setup.exe via Inno Setup
  Requires: Inno Setup 6 (iscc.exe) on PATH or at C:\Program Files (x86)\Inno Setup 6\ISCC.exe
  Usage:  powershell -ExecutionPolicy Bypass -File installer\Build-SetupExe.ps1
#>
$ErrorActionPreference = 'Stop'
param([string]$Edition = '')
$ROOT = Split-Path -Parent $PSScriptRoot
# Support FULL + standard + legacy names
$ISS = $null
$cands = @()
if ($Edition -eq 'FULL') { $cands += 'StemEducatorApp-FULL.iss' }
$cands += @('StemEducatorApp-FULL.iss','StemEducatorApp.iss','HardwareBlocks.iss')
foreach ($cand in ($cands | Select-Object -Unique)) {
  $p = Join-Path $PSScriptRoot $cand
  if (Test-Path $p) { $ISS = $p; break }
}

$ISCC = $null
foreach ($p in @('iscc','C:\Program Files (x86)\Inno Setup 6\ISCC.exe','C:\Program Files\Inno Setup 6\ISCC.exe')) {
  try { $c = Get-Command $p -ErrorAction Stop; $ISCC = $c.Source; break } catch {}
  if (Test-Path $p) { $ISCC = $p; break }
}
if (-not $ISS) {
  Write-Host "No .iss file found (expected StemEducatorApp.iss or HardwareBlocks.iss)" -ForegroundColor Red
  exit 1
}
if (-not $ISCC) {
  Write-Host "Inno Setup 6 not found." -ForegroundColor Yellow
  Write-Host "Install from https://jrsoftware.org/isinfo.php then re-run this script." -ForegroundColor Yellow
  Write-Host "Alternatively, just distribute the portable zip and use setup.bat / Setup.ps1 directly."
  Write-Host "Fix for MODULE_NOT_FOUND: ensure you run 'bash scripts/create-zip.sh' to build fresh zip with fixed setup." -ForegroundColor Cyan
  exit 1
}
Write-Host "Building installer $ISS with $ISCC ..." -ForegroundColor Cyan
& $ISCC $ISS
if ($LASTEXITCODE -eq 0) {
  Write-Host "Done -> installer\Output\StemEducatorApp-Setup-*.exe" -ForegroundColor Green
  Get-ChildItem (Join-Path $PSScriptRoot 'Output\*.exe') | ForEach-Object { Write-Host "  $($_.FullName)  ($([math]::Round($_.Length/1MB,1)) MB)" }
} else { Write-Host "Build failed" -ForegroundColor Red; exit $LASTEXITCODE }
