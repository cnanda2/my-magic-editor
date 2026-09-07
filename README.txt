StemEducatorApp - Production Build
====================================

REQUIREMENTS (auto-installed if missing)
----------------------------------------
- Windows 10/11 (64-bit)
- Internet connection (for auto-install)
The setup will check and auto-install if needed:
  - Node.js v18+  (via winget / Chocolatey / MSI)
  - PostgreSQL 14+ (psql client, via winget / Chocolatey)
  - App dependencies (backend + frontend via npm)

FIRST-TIME SETUP (run once) - Pick ONE
----------------------------------------
OPTION A - Recommended (PowerShell, auto-elevates):
  1. Right-click Setup.ps1 > Run with PowerShell
     Or: powershell -ExecutionPolicy Bypass -File Setup.ps1
  2. Approve UAC prompt (Yes)

OPTION B - Batch (double-click):
  1. Right-click setup.bat > Run as administrator
     Or double-click setup.bat

OPTION C - Full Windows Installer (Setup.exe):
  1. Build once (on dev machine):
     - Install Inno Setup 6: https://jrsoftware.org/isinfo.php
     - Run: powershell -File installer\Build-SetupExe.ps1
       Or:  iscc installer\StemEducatorApp.iss
     -> creates installer\Output\StemEducatorApp-Setup-1.0.0.exe
  2. On target PC, run StemEducatorApp-Setup-1.0.0.exe (as admin)
     -> installs to C:\Program Files\StemEducatorApp
     -> offers to run wizard at end

What the wizard does:
  1. Checks Node.js / npm / psql / winget / choco / PowerShell
  2. Installs backend/frontend dependencies (npm install)
  3. Verifies build\editor.html and frontend\dist
  4. Asks:
     - Server URL / domain (default http://localhost:3001)
     - PostgreSQL host / port / user / password / database
     - Super-admin email + password
     - Company name / instance ID
  5. Writes backend\.env automatically (with JWT_SECRET)
  6. Creates database (if psql available)
  7. Creates desktop shortcut  StemEducatorApp.lnk
     (OneDrive-aware: uses [Environment]::GetFolderPath Desktop)
  8. Adds firewall rule  TCP inbound  (needs Admin)
  9. Creates Start Menu  StemEducatorApp

Safe to re-run: setup.bat / Setup.ps1 are idempotent.
Log: setup.log (next to setup.bat) and installer setup log.

DAILY USE (after setup)
------------------------
Double-click  start.bat  or the desktop shortcut.
Or: Start Menu > StemEducatorApp > StemEducatorApp
The launcher scans free ports [3001,3000,8080,...] and starts server.

Open browser at: http://localhost:3001  (or your configured URL)

STRUCTURE
---------
backend/          Backend server (Express + Socket.io + dotenv)
build/            TurboWarp block editor (editor.html)
frontend/dist/    Admin panel (served by backend)
setup.bat         Setup wizard (Batch, 7 steps)
Setup.ps1         Setup wizard (PowerShell, self-elevating)
setup.js          Interactive config (writes backend\.env, creates DB/shortcut)
start.bat         Daily server launcher
start.js          Port scanner + spawner (backend/src/index.js)
installer\        Windows installer sources
  StemEducatorApp.iss   Inno Setup 6 script -> Setup.exe
  Build-SetupExe.ps1   Build helper
  uninstall.bat        Removes firewall rule on uninstall

RE-CONFIGURE
------------
Edit backend\.env and restart server (via start.bat).
Or re-run setup.bat / Setup.ps1 (overwrites .env).
Or re-run StemEducatorApp-Setup.exe > Repair.

FORGOT THE ADMIN LOGIN?
------------------------
- The super-admin email/password set during setup are saved in backend\.env
  (ADMIN_EMAIL / ADMIN_PASSWORD). Open that file to recover them.
- If setup ran unattended (no one at the keyboard), a random password was
  generated automatically - it's printed to the console AND saved in
  backend\.env, so check there first.
- Once logged in, change the password any time from
  Settings > Security > Change Your Password (takes effect immediately).

TROUBLESHOOTING
---------------
- Node not found:     installer tries winget -> choco -> MSI. Manual: https://nodejs.org (LTS)
- psql not found:     install PostgreSQL and tick "Add to PATH": https://www.postgresql.org/download/
                      Or winget install PostgreSQL.PostgreSQL
- npm install fails:  see setup.log, try: cd backend && npm install --legacy-peer-deps
- DB cannot connect:  check backend\.env PGHOST/PGPASSWORD, ensure PostgreSQL service running (services.msc)
- Firewall blocked:   re-run as Administrator, or manually: New-NetFirewallRule -DisplayName 'StemEducatorApp' -LocalPort 3001 -Action Allow
- Shortcut missing:   Desktop may be OneDrive\Desktop - wizard uses GetFolderPath, check both
- Port in use:        start.js picks next free port automatically

VERSIONING & ZIP
----------------
Current version: 1.1.0  (see VERSION, CHANGELOG.md)
  Bump:  node scripts/bump-version.js patch  (or minor/major/1.2.3)
  Zip:   bash scripts/create-zip.sh          (reads VERSION)
         -> releases/StemEducatorApp-v1.1.0.zip (16 MB, 687 files)
         Excludes: node_modules, .env, logs, .git (clean for distribution)
  Full:  node scripts/bump-version.js 1.2.0 --zip

SUPPORT
-------
Contact your provider for assistance.
Include setup.log when reporting issues.
