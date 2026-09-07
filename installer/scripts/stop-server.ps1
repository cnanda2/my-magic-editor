# stop-server.ps1 - Stop StemEducatorApp node processes (safe to re-run)
$ErrorActionPreference = 'SilentlyContinue'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*StemEducatorApp*' -or $_.CommandLine -like '*backend\src\index.js*' } |
  ForEach-Object {
    Write-Host "Stopping node PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
Write-Host 'Stop complete.'
