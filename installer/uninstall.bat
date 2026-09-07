@echo off
REM StemEducatorApp - manual uninstall helper (the real uninstaller is unins000.exe).
echo Stopping StemEducatorApp server (node processes started from this app)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*StemEducatorApp*' -or $_.CommandLine -like '*backend\src\index.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1
echo Removing StemEducatorApp firewall rule...
powershell -NoProfile -Command "Remove-NetFirewallRule -DisplayName 'StemEducatorApp' -ErrorAction SilentlyContinue" >nul 2>&1
echo Removing runtime leftovers (logs, uploads, temp sketches)...
if exist "%ProgramFiles%\StemEducatorApp\backend\logs" rmdir /s /q "%ProgramFiles%\StemEducatorApp\backend\logs"
if exist "%ProgramFiles%\StemEducatorApp\backend\uploads" rmdir /s /q "%ProgramFiles%\StemEducatorApp\backend\uploads"
if exist "%ProgramFiles%\StemEducatorApp\backend\temp_sketches" rmdir /s /q "%ProgramFiles%\StemEducatorApp\backend\temp_sketches"
if exist "%LOCALAPPDATA%\Temp\StemEducatorApp" rmdir /s /q "%LOCALAPPDATA%\Temp\StemEducatorApp"
echo NOTE: your PostgreSQL database was NOT deleted. Remove it in pgAdmin/psql if needed.
echo Done. Prefer Add/Remove Programs ^> StemEducatorApp ^> Uninstall for a full wipe.
pause
