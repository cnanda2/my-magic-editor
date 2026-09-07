@echo off
REM Installation Regression Test Runner
REM Run this after extracting zip on any machine to verify one-click install
echo Running installation regression test...
node test-installation.js
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo REGRESSION FAILED — see failures above
  pause
  exit /b 1
) else (
  echo.
  echo REGRESSION PASSED — install is good to go
  echo Next: ONE-CLICK-INSTALL.bat ^(FULL^) or INSTALL.bat ^(lightweight^) then http://localhost:3001/white-label
  pause
)
