# Changelog

## 1.7.0 - 2026-09-07
### Fixed
- **Setup wizard password prompt sent empty password on Enter** - interactive `askSecret()` never showed or applied a default, so pressing Enter sent nothing to PostgreSQL, causing `fe_sendauth: no password supplied`. Now shows/applies a sensible default (matching `ask()`'s behavior).
- **White-label branding "not working" after switching tenants** - the Super Admin's tenant-switch dropdown only overwrote `primary_color`/`secondary_color`/`custom_domain` when the newly-selected tenant had a value set, silently leaving the *previous* tenant's stale values in the form. Saving in that state risked writing the wrong domain/colors onto the wrong tenant. Now every field always resets to the selected tenant's real values (or proper defaults), and pending logo/verification state is cleared on switch too.
- Admin-panel logo was hardcoded (rocket icon in the header, and a static bundled image in the sidebar) - now fully config-driven from the `tenants.logo_url` column, uploadable per Super Admin or per white-label tenant via Settings/White-Label, with the previous hardcoded image only used as a fallback when nothing has been configured yet.

### Added
- Setup wizard fully automated by default (`Setup.ps1`/`setup.bat` now run `setup.js --yes` - zero prompts). Run `node setup.js` directly instead to customize values interactively.
- If the target database name is already taken by something unrelated to this install, the wizard now auto-picks a free name (`_2`, `_3`, ...) instead of touching the existing database.
- Google/Microsoft SSO buttons removed from the Login page (never existed on Register/Partner Signup).

## 1.2.0 - 2026-09-07
### Fixed
- **Setup wizard hung / crashed on install** - `psql` calls lacked `-w`/timeouts and would hang forever on a bad/empty password; a `const` reassignment bug (`pgPassword`) crashed the wizard on every run past the DB step
- **Admin login never worked after install** - the wizard wrote `ADMIN_EMAIL`/`ADMIN_PASSWORD` to `.env` but nothing ever created that account; backend now seeds the Super Admin (and an optional second `admin`-role account) from `.env` on boot
- **Re-running the wizard broke a working install** - it regenerated a fresh random `INSTANCE_ID` and admin password every run, causing `duplicate key value violates unique constraint "tenants_subdomain_key"` crashes and login failures against the *old* password; wizard now reuses the previous `backend\.env` values instead of regenerating them
- **"Could not start checkout" with no real error** - billing routes were entirely unregistered when `STRIPE_SECRET_KEY` was unset, so Subscribe silently 404'd; routes now always register and return a clear `503` explaining billing isn't configured
- **White-label tenant creation blocked without Cloudflare credentials** - `POST /api/admin/tenants` required a Cloudflare API token/Zone ID to create *any* tenant with a custom domain, even though those fields are optional/hidden by default in the UI; CNAME automation is now skipped gracefully (domain saved, DNS set up manually) when credentials aren't provided, matching the other tenant-creation routes

### Added
- Self-service **Change Password** (Settings > Security) + `POST /api/auth/change-password` endpoint
- Setup wizard can optionally create an additional `admin`-role account (not Super Admin) during install
- Credential-recovery guidance in `README.txt` and the wizard's completion screen (`backend\.env` / Settings > Security)

## 1.1.1 - 2026-09-01
### Fixed
- **CRITICAL: `Cannot find module 'express'` on fresh install** — `backend/node_modules` is excluded from distribution zip/Setup.exe and `setup.js` previously never installed deps. Now:
  - `setup.js` adds `ensureDeps()` (checks `backend/node_modules/express/package.json`, runs `npm install --omit=dev` with `--legacy-peer-deps` fallback, creates `backend/logs/`)
  - `setup.bat` / `Setup.ps1` `:INSTALL_DEPS` now checks `express` as sentinel (not `.package-lock.json`), verifies after install, nukes corrupted `node_modules` if needed
  - `start.js` dependency guard auto-installs backend deps before port scan with friendly error
  - `installer/StemEducatorApp.iss` / `HardwareBlocks.iss` fixed to include `VERSION`/`CHANGELOG.md` and `installer/Build-SetupExe.ps1` now resolves both `.iss` names
  - `scripts/bump-version.js` now updates both ISS files; rebuilt portable zip `releases/StemEducatorApp-v1.1.1.zip` contains fixes

### Changed
- Version bump to 1.1.1

## 1.1.0 - 2026-09-01
### Added
- `Setup.ps1` - PowerShell setup wizard with self-elevation (UAC), auto-install Node.js/PostgreSQL via winget/choco/MSI
- `installer/StemEducatorApp.iss` - Inno Setup 6 script to build `StemEducatorApp-Setup-1.1.0.exe` (Start Menu, Desktop icon, firewall, uninstall)
- `installer/Build-SetupExe.ps1` - helper to compile Setup.exe
- `VERSION` file - single source of truth for version
- `scripts/bump-version.js` - change versioning helper

### Fixed
- `setup.bat` now full 7-step checker: Node >=18, npm, psql (scans `C:\Program Files\PostgreSQL\*\bin`), `npm install` backend/frontend, build verify, `setup.log`
- `setup.js` - `findPsql()` fallback scan, OneDrive Desktop via `GetFolderPath('Desktop')`, firewall handles non-admin gracefully
- `backend/src/index.js` - load `backend/.env` via `dotenv`
- `backend/package.json` - added `dotenv@^16.6.1`

### Changed
- `README.txt` - documents Option A (Setup.ps1), B (setup.bat), C (Setup.exe)

## 1.0.0 - Initial
- Base app: backend Express+Socket.io, frontend React, build editor, `setup.bat` minimal, `setup.js` basic wizard, `start.bat/js` launcher.
