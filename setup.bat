@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title StemEducatorApp - Setup Wizard
color 0A

:: =============================================================
:: StemEducatorApp - Full System Setup / Installer for Windows
:: - Checks every prerequisite
:: - Auto-installs missing components (via winget/choco)
:: - Installs app dependencies (backend + frontend)
:: - Launches the interactive configuration wizard (setup.js)
:: Safe to re-run. Run as Administrator for firewall/shortcut.
:: =============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "LOG=%ROOT%\setup.log"
set "NEED_RESTART=0"
set "IS_ADMIN=0"
set "HAS_WINGET=0"
set "HAS_CHOCO=0"

:: clean log
> "%LOG%" echo [%date% %time%] StemEducatorApp Setup started
>>"%LOG%" echo ROOT=%ROOT%

call :HEADER
echo   Log file: %LOG%
echo.

:: -------------------------------------------------------------
:: 0) Admin check (needed for firewall + machine-wide installs)
:: -------------------------------------------------------------
net session >nul 2>&1
if !errorlevel! EQU 0 (
    set "IS_ADMIN=1"
    call :OK "Running as Administrator"
) else (
    call :WARN "Not running as Administrator - firewall rule + some installs may fail"
    call :INFO "Tip: Right-click setup.bat ^> Run as administrator for full setup"
)
echo.

:: -------------------------------------------------------------
:: 0b) Detect package managers
:: -------------------------------------------------------------
where winget >nul 2>&1
if !errorlevel! EQU 0 (
    set "HAS_WINGET=1"
    call :OK "winget found"
) else (
    call :WARN "winget not found - auto-install will use fallback"
)

where choco >nul 2>&1
if !errorlevel! EQU 0 (
    set "HAS_CHOCO=1"
    call :OK "Chocolatey found"
)

where powershell >nul 2>&1
if !errorlevel! NEQ 0 (
    color 0C
    echo   [FAIL] PowerShell not found - Windows is broken.
    echo   Please install PowerShell 5+ and re-run.
    pause
    exit /b 1
)

:: -------------------------------------------------------------
:: 1) Node.js >= 18
:: -------------------------------------------------------------
call :SECTION "1/7  Checking Node.js"
call :CHECK_NODE
if errorlevel 1 (
    call :WARN "Node.js missing or too old."
    echo.
    echo   Do you want the installer to auto-install Node.js LTS now?
    echo   [Y] Yes  [N] No (I will install manually)
    choice /C YN /N /M "  Choice [Y/N]: "
    if !errorlevel! EQU 1 (
        call :INSTALL_NODE
        if !errorlevel! NEQ 0 goto :NODE_FAIL
        call :CHECK_NODE
        if !errorlevel! NEQ 0 goto :NODE_FAIL
    ) else (
        echo.
        echo   Please install Node.js v18+ from https://nodejs.org  (LTS)
        echo   Then re-run setup.bat
        echo.
        start "" "https://nodejs.org"
        pause
        exit /b 1
    )
) else (
    call :OK "Node.js check passed - skipping auto-install"
)
echo.

:: -------------------------------------------------------------
:: 2) npm
:: -------------------------------------------------------------
call :SECTION "2/7  Checking npm"
where npm >nul 2>&1
if !errorlevel! NEQ 0 (
    call :FAIL "npm not found even though Node.js is installed"
    echo   Reinstall Node.js from https://nodejs.org
    pause
    exit /b 1
)
for /f "delims=" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
call :OK "npm %NPM_VER%"
echo.

:: -------------------------------------------------------------
:: 3) PostgreSQL (psql)
:: -------------------------------------------------------------
call :SECTION "3/7  Checking PostgreSQL"
call :CHECK_PSQL
if !errorlevel! NEQ 0 (
    call :WARN "PostgreSQL client (psql) not found."
    echo   The app needs PostgreSQL 14+ to store data.
    echo.
    echo   Do you want to auto-install PostgreSQL now?
    echo   [Y] Yes  [N] No (I already have it / will install manually)
    echo   [S] Skip (create DB manually later)
    choice /C YNS /N /M "  Choice [Y/N/S]: "
    if !errorlevel! EQU 1 (
        call :INSTALL_PSQL
        call :CHECK_PSQL
        if !errorlevel! NEQ 0 (
            call :WARN "Auto-install did not put psql on PATH. Will continue - you can create DB manually."
        )
    ) else if !errorlevel! EQU 2 (
        echo   Please install PostgreSQL from https://www.postgresql.org/download/
        echo   Make sure to check "Add to PATH" during install, then re-run setup.
        start "" "https://www.postgresql.org/download/"
        echo   Continuing without DB auto-create...
    ) else (
        echo   Skipping - wizard will ask you to create DB manually.
    )
)
echo.

:: -------------------------------------------------------------
:: 4) Install app dependencies
:: -------------------------------------------------------------
call :SECTION "4/7  Installing app dependencies"
call :INSTALL_DEPS
if !errorlevel! NEQ 0 (
    call :FAIL "Dependency install failed - see log: %LOG%"
    pause
    exit /b 1
)
echo.

:: -------------------------------------------------------------
:: 5) Verify build artifacts
:: -------------------------------------------------------------
call :SECTION "5/7  Verifying build artifacts"
if not exist "%ROOT%\build\editor.html" (
    call :WARN "build\editor.html missing - editor build not found"
    call :INFO "If you need to rebuild: npm run build (at repo root)"
) else (
    call :OK "Editor build found (build\editor.html)"
)
if not exist "%ROOT%\frontend\dist\index.html" (
    call :WARN "frontend\dist\index.html missing"
    if exist "%ROOT%\frontend\package.json" (
        echo   Building frontend...
        pushd "%ROOT%\frontend"
        call npm run build >> "%LOG%" 2>&1
        if !errorlevel! NEQ 0 (
            call :WARN "frontend build failed - see %LOG%"
        ) else (
            call :OK "Frontend built"
        )
        popd
    )
) else (
    call :OK "Frontend build found (frontend\dist)"
)
echo.

:: -------------------------------------------------------------
:: 6) Run interactive wizard (setup.js) - writes backend\.env
:: -------------------------------------------------------------
call :SECTION "6/7  Configuration wizard"
if not exist "%ROOT%\setup.js" (
    call :FAIL "setup.js not found at %ROOT%\setup.js"
    pause
    exit /b 1
)
echo   Running fully automated - no prompts, sensible defaults for everything.
echo   To customize instead, run:  node setup.js
echo.
node "%ROOT%\setup.js" --yes
set "WIZ_EXIT=%errorlevel%"
>>"%LOG%" echo Wizard exit code: %WIZ_EXIT%
if %WIZ_EXIT% NEQ 0 (
    call :FAIL "Wizard exited with code %WIZ_EXIT% - check output above"
    pause
    exit /b %WIZ_EXIT%
)
echo.

:: -------------------------------------------------------------
:: 7) Post-wizard verification
:: -------------------------------------------------------------
call :SECTION "7/7  Verifying installation"
if not exist "%ROOT%\backend\.env" (
    call :FAIL "backend\.env not created - wizard did not complete"
    pause
    exit /b 1
)
call :OK "Config written to backend\.env"

:: ensure dotenv is installed (wizard needs it at runtime)
if not exist "%ROOT%\backend\node_modules\dotenv\package.json" (
    call :INFO "Installing dotenv in backend..."
    pushd "%ROOT%\backend"
    call npm install dotenv --save >> "%LOG%" 2>&1
    popd
)

:: quick DB connectivity probe if psql available
call :CHECK_PSQL >nul 2>&1
if !errorlevel! EQU 0 (
    call :INFO "Testing database connection..."
    powershell -NoProfile -Command "$e=Get-Content '%ROOT%\backend\.env' | ConvertFrom-StringData; $env:PGPASSWORD=$e.PGPASSWORD; & psql -h $e.PGHOST -p $e.PGPORT -U $e.PGUSER -d $e.PGDATABASE -c 'select 1' 2>&1 | Out-Null; exit $LASTEXITCODE" >>"%LOG%" 2>&1
    if !errorlevel! NEQ 0 (
        call :WARN "Could not connect to DB - check credentials/service. You can still start the app after fixing."
    ) else (
        call :OK "Database reachable"
    )
)

:: firewall + shortcut are handled inside setup.js, but double-check shortcut
powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')" > "%TEMP%\hb_desktop.txt" 2>nul
set /p HB_DESKTOP=<"%TEMP%\hb_desktop.txt" 2>nul
if exist "%HB_DESKTOP%\StemEducatorApp.lnk" call :OK "Desktop shortcut present"
if "%IS_ADMIN%"=="0" (
    echo.
    call :WARN "For LAN access, re-run as Administrator to add firewall rule for your port."
)

echo.
color 0A
echo   ==========================================================
echo    Setup complete!
echo   ==========================================================
echo.
echo   Next steps:
echo     1. Double-click start.bat  (or the desktop shortcut)
echo     2. Open browser at the URL you configured
echo.
echo   Re-configure:  re-run setup.bat  or edit backend\.env
echo   Logs: %LOG%
echo   Need help?  See README.txt
echo.
if "%NEED_RESTART%"=="1" (
    color 0E
    echo   NOTE: A restart may be required for PATH changes to take effect.
    echo.
)
pause
exit /b 0

:: =============================================================
:: Helpers
:: =============================================================

:HEADER
echo.
echo   +==================================================+
echo   ^|     StemEducatorApp - Setup Wizard  v2.0         ^|
echo   ^|     Full system check + auto-install              ^|
echo   +==================================================+
echo.
goto :eof

:SECTION
echo.
echo   -- %~1 --
>>"%LOG%" echo -- %~1 --
goto :eof

:OK
echo   [ OK ] %~1
>>"%LOG%" echo [ OK ] %~1
goto :eof

:WARN
echo   [WARN] %~1
>>"%LOG%" echo [WARN] %~1
goto :eof

:FAIL
echo   [FAIL] %~1
>>"%LOG%" echo [FAIL] %~1
goto :eof

:INFO
echo   [ .. ] %~1
>>"%LOG%" echo [ .. ] %~1
goto :eof

:: -------------------------------------------------------------
:CHECK_NODE
where node >nul 2>&1
if !errorlevel! NEQ 0 exit /b 1
for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
:: strip v
set "NODE_VER=%NODE_VER:v=%"
for /f "tokens=1 delims=." %%a in ("%NODE_VER%") do set "NODE_MAJOR=%%a"
if not defined NODE_MAJOR exit /b 1
if %NODE_MAJOR% LSS 18 (
    call :WARN "Node.js %NODE_VER% too old - need v18+"
    exit /b 1
)
call :OK "Node.js v%NODE_VER%"
:: also show path
for /f "delims=" %%p in ('where node 2^>nul') do call :INFO "  %%p" & goto :CN_DONE
:CN_DONE
exit /b 0

:INSTALL_NODE
call :INFO "Installing Node.js LTS..."
if "%HAS_WINGET%"=="1" (
    call :INFO "Trying winget..."
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements >> "%LOG%" 2>&1
    if !errorlevel! EQU 0 goto :NODE_REFRESH
    :: fallback id
    winget install --id OpenJS.NodeJS -e --silent --accept-source-agreements --accept-package-agreements >> "%LOG%" 2>&1
    if !errorlevel! EQU 0 goto :NODE_REFRESH
)
if "%HAS_CHOCO%"=="1" (
    call :INFO "Trying Chocolatey..."
    choco install nodejs-lts -y --force >> "%LOG%" 2>&1
    if !errorlevel! EQU 0 goto :NODE_REFRESH
)
:: fallback: download MSI via PowerShell
call :INFO "Downloading Node.js MSI directly..."
powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='https://nodejs.org/dist/v20.17.0/node-v20.17.0-x64.msi'; $o=$env:TEMP+'\node-lts.msi'; try{ Invoke-WebRequest -Uri $u -OutFile $o -UseBasicParsing; Start-Process msiexec -ArgumentList \"/i `\"$o`\" /qn\" -Wait; exit 0 } catch { Write-Error $_; exit 1 }" >> "%LOG%" 2>&1
if !errorlevel! NEQ 0 (
    call :FAIL "Auto-install failed. Please install manually from https://nodejs.org"
    start "" "https://nodejs.org"
    exit /b 1
)
:NODE_REFRESH
:: refresh PATH for current session
call :REFRESH_PATH
:: also prepend common locations
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
where node >nul 2>&1
if !errorlevel! NEQ 0 (
    call :WARN "Node installed but not on PATH yet - you may need to restart terminal"
    set "NEED_RESTART=1"
    exit /b 1
)
call :OK "Node.js installed"
exit /b 0

:REFRESH_PATH
:: Re-read PATH from registry (machine + user)
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "REGPATH_M=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "REGPATH_U=%%b"
if defined REGPATH_M set "PATH=%REGPATH_M%;%REGPATH_U%"
goto :eof

:CHECK_PSQL
:: 1) PATH
where psql >nul 2>&1
if !errorlevel! EQU 0 (
    for /f "delims=" %%v in ('psql --version 2^>nul') do set "PSQL_VER=%%v"
    call :OK "!PSQL_VER! (PATH)"
    exit /b 0
)
:: 2) scan Program Files
for /L %%v in (18,-1,10) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
        set "PATH=C:\Program Files\PostgreSQL\%%v\bin;%PATH%"
        call :OK "PostgreSQL %%v found at C:\Program Files\PostgreSQL\%%v\bin"
        exit /b 0
    )
    if exist "C:\Program Files (x86)\PostgreSQL\%%v\bin\psql.exe" (
        set "PATH=C:\Program Files (x86)\PostgreSQL\%%v\bin;%PATH%"
        call :OK "PostgreSQL %%v found (x86)"
        exit /b 0
    )
)
:: 3) wildcard search (slow but thorough)
for /d %%d in ("C:\Program Files\PostgreSQL\*") do if exist "%%d\bin\psql.exe" (
    set "PATH=%%d\bin;%PATH%"
    call :OK "PostgreSQL found at %%d\bin"
    exit /b 0
)
exit /b 1

:INSTALL_PSQL
call :INFO "Installing PostgreSQL..."
if "%HAS_WINGET%"=="1" (
    call :INFO "Trying winget PostgreSQL.PostgreSQL..."
    winget install --id PostgreSQL.PostgreSQL -e --silent --accept-source-agreements --accept-package-agreements >> "%LOG%" 2>&1
    if !errorlevel! EQU 0 (
        call :REFRESH_PATH
        timeout /t 5 >nul
        exit /b 0
    )
    :: try versioned
    winget install --id PostgreSQL.PostgreSQL.16 -e --silent --accept-source-agreements --accept-package-agreements >> "%LOG%" 2>&1
    if !errorlevel! EQU 0 (
        call :REFRESH_PATH
        exit /b 0
    )
)
if "%HAS_CHOCO%"=="1" (
    choco install postgresql16 -y --params "/Password:postgres" >> "%LOG%" 2>&1
    if !errorlevel! EQU 0 (
        call :REFRESH_PATH
        exit /b 0
    )
)
call :WARN "Auto-install via winget/choco failed."
call :INFO "Please install manually: https://www.postgresql.org/download/"
start "" "https://www.postgresql.org/download/"
exit /b 1

:INSTALL_DEPS
:: Backend - robust check for MODULE_NOT_FOUND (express is required by src/index.js:10)
if exist "%ROOT%\backend\package.json" (
    if not exist "%ROOT%\backend\node_modules\express\package.json" (
        call :INFO "Backend dependencies missing (express not found) - installing..."
        call :INFO "  npm install (backend) - this may take a few minutes, output below..."
        pushd "%ROOT%\backend"
        call npm install --omit=dev
        set "E=!errorlevel!"
        popd
        >>"%LOG%" echo backend npm install exit: !E!
        if !E! NEQ 0 (
            call :WARN "  npm install failed, retrying with --legacy-peer-deps..."
            pushd "%ROOT%\backend"
            call npm install --legacy-peer-deps
            set "E=!errorlevel!"
            popd
            >>"%LOG%" echo backend retry exit: !E!
            if !E! NEQ 0 exit /b 1
        )
        if not exist "%ROOT%\backend\node_modules\express\package.json" (
            call :FAIL "Backend install verification failed - express still missing. Try: cd backend && npm install"
            exit /b 1
        )
        call :OK "Backend deps installed"
    ) else if not exist "%ROOT%\backend\node_modules\dotenv\package.json" (
        call :OK "Backend deps present (express found)"
        call :INFO "  Installing dotenv (missing) - quick, please wait..."
        pushd "%ROOT%\backend"
        call npm install dotenv --save
        set "E=!errorlevel!"
        popd
        >>"%LOG%" echo dotenv install exit: !E!
        if !E! NEQ 0 call :WARN "  dotenv install failed, continuing (backend still boots with defaults)"
    ) else (
        :: Both express + dotenv present: SKIP slow verify (was silent-hang culprit).
        call :OK "Backend deps present (express + dotenv found) - skipping npm verify"
    )
) else (
    call :WARN "backend\package.json not found - skipping"
)

:: Frontend runtime only needs frontend\dist (served statically). Skip heavy install when dist exists.
if exist "%ROOT%\frontend\dist\index.html" (
    call :OK "Frontend build present (frontend\dist) - skipping frontend npm install (not needed at runtime)"
) else if exist "%ROOT%\frontend\package.json" (
    if not exist "%ROOT%\frontend\node_modules\react\package.json" (
        call :INFO "Frontend dependencies missing (react not found) - installing..."
        pushd "%ROOT%\frontend"
        call npm install
        set "E=!errorlevel!"
        popd
        >>"%LOG%" echo frontend npm install exit: !E!
        if !E! NEQ 0 (
            call :WARN "  frontend npm install failed, retrying with --legacy-peer-deps..."
            pushd "%ROOT%\frontend"
            call npm install --legacy-peer-deps
            set "E=!errorlevel!"
            popd
            >>"%LOG%" echo frontend retry exit: !E!
            if !E! NEQ 0 exit /b 1
        )
        call :OK "Frontend deps installed"
    ) else (
        call :OK "Frontend deps present (react found)"
    )
)

:: Root editor (optional - only if build missing and package.json exists)
if not exist "%ROOT%\build\editor.html" if exist "%ROOT%\package.json" (
    if not exist "%ROOT%\node_modules\.package-lock.json" (
        call :WARN "Root editor deps missing but build also missing"
        call :INFO "  Run npm install at repo root if you need to rebuild the editor"
    )
)
exit /b 0

:NODE_FAIL
color 0C
echo.
echo   Node.js is required. Install from https://nodejs.org and re-run setup.
echo.
pause
exit /b 1


