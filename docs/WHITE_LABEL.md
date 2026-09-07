# White-Label Setup — Complete Documentation

> Same flow as **thestemeducator.com**. Super Admin only. Synced across `/tenants`, `/white-label`, `/design`.

## 1. Overview

White-label lets each institution run the platform on its own domain and branding:

- **Domain:** `lab.school.edu` (your domain) OR `oakwood.localhost` / `oakwood.thestemeducator.com` (subdomain)
- **Branding:** logo, `primary_color` / `secondary_color` → CSS vars `--ds-primary`, `--brand-primary`, favicon, `document.title`, login headline
- **Storage:** `tenants.custom_domain`, `logo_url`, `primary_color`, `config JSONB` (`designTokens`, `customDomain`, `loginHeadline`, `dns`)
- **Resolution:** `backend/src/utils/tenantMiddleware.js` → `Host` header → `tenants.custom_domain` > `subdomain`

---

## 2. Super Admin Onboarding (3 minutes)

### Wizard: `/white-label` (also `/design`)

Same 3-step wizard on both routes — fully synced.

**Step 1 — Domain**
- Toggle: **Subdomain** (instant, no DNS) vs **Own domain** (already purchased)
- Subdomain: `your-school.{PLATFORM_HOST}` → auto, e.g. `oakwood.localhost` in dev, `oakwood.thestemeducator.com` in prod
- Own domain: e.g. `lab.oakwood.edu` → check availability (`GET /api/tenant/check-availability?domain=`) → shows `CNAME lab.oakwood.edu → {cnameTarget}`
- `Check` button verifies availability via `tenants.custom_domain` uniqueness.

**Step 2 — Branding**
- App name (browser title), logo upload (PNG/SVG, 2MB → `POST /tenant/logo` or `POST /admin/tenants/:id/logo` → `/uploads/branding/`), primary/secondary + 8 preset swatches, WCAG contrast, welcome headline/support text.
- Save via `POST /tenant/white-label/setup` (tenant) or `PATCH /admin/tenants/:id` (super admin) → deep-merge `config`, sync `custom_domain`/`primary_color` columns.

**Step 3 — Verify & Go Live**
- For custom domain: add **1 DNS record** at GoDaddy / Cloudflare / Route53:
  ```
  Type: CNAME
  Host: lab
  Value: thestemeducator.com  ( = PLATFORM_HOST / cnameTarget )
  TTL:  3600
  Proxied: ON (Cloudflare orange cloud) → auto SSL
  ```
- Click **Verify** → `GET /api/tenant/verify-domain?domain=lab.school.edu` → `dns.resolveCname()` vs `PLATFORM_HOST`.
- Open `https://lab.school.edu` — `BrandContext.jsx` loads `/api/tenant/config` and sets CSS vars, title, favicon.

Super Admin picker at top of wizard: `?tenantId=` param → `GET /admin/tenants/:id` → editing any institution. `/tenants` → **White-Label** button navigates there.

### Alternative: `/tenants` → Add New Institution

Wizard-standard form, synced with wizard:
- Domain toggle (same as step 1), branding preview, plan (Enterprise auto for custom domain), advanced DNS (Cloudflare Zone/Token) collapsed.
- After create: modal **Open wizard** → `/white-label?tenantId=NEW_ID` to finish DNS + branding.
- Table actions: **White-Label** (wizard) + **Palette** (`/design?tenantId=ID`) — all edit same DB row.

### `/design` — Same Wizard

`/design` is now the same 3-step wizard as `/white-label` (not the old 2-panel). Step 1 domain, Step 2 branding (with swatches + login messaging), Step 3 preview. Super admin tenant picker + sync banner.

---

## 3. Tenant Already Owns a Domain

1. Tenant gives you `lab.school.edu` (or you type it in wizard)
2. You set `custom_domain` via wizard → auto upgrades `plan=enterprise`
3. Tenant adds **CNAME lab → thestemeducator.com** at their DNS (or you paste Cloudflare Zone ID + Token → `createCnameRecord()` auto-creates)
4. Click **Verify** → `verified: true` → live.

No code change. Multiple tenants can each have their own domain on the same deployment (row-level `tenant_id` isolation).

---

## 4. DNS & SSL

- **CNAME target:** `PLATFORM_HOST` env (`backend/.env` `PLATFORM_HOST` or `BACKEND_URL` hostname). In dev `localhost`, in prod `thestemeducator.com` or `platform.thestemeducator.com`.
- **Apex domain:** `school.edu` (without subdomain) cannot use CNAME → use ALIAS/ANAME or Cloudflare CNAME flattening.
- **SSL:** If Cloudflare proxied (`proxied: true`), Cloudflare terminates SSL. If not, put Caddy/Traefik with Let's Encrypt in front (UI note “Let's Encrypt” is placeholder; backend does not issue certs).
- **Local test:** `127.0.0.1 lab.school.edu` in `C:\Windows\System32\drivers\etc\hosts` → `http://lab.school.edu:5173` → Host header `lab.school.edu`.

---

## 5. API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/tenant/config` | public | Branding by `Host` header (used by `BrandContext`) |
| `GET` | `/api/tenant/check-availability?domain=` or `?subdomain=` | public | Availability |
| `GET` | `/api/tenant/verify-domain?domain=` | auth | Real `dns.resolveCname` check |
| `POST` | `/api/tenant/white-label/setup` | Tenant Admin | 1-click `{customDomain?, subdomain?, appName?, primaryColor?, secondaryColor?, logoUrl?}` |
| `POST` | `/api/tenant/logo` | Tenant Admin | `multipart logo` → `/uploads/branding/` |
| `POST` | `/api/admin/tenants/:id/logo` | Super Admin | Admin logo for any tenant |
| `PATCH` | `/api/admin/tenants/:id` | Super Admin | `{custom_domain, subdomain, logo_url, primary_color, config}` |
| `PATCH` | `/api/tenant/settings` | Tenant Admin | Now allows `config` deep-merge |
| `POST` | `/api/admin/tenants/white-label/bulk-fix` | Super Admin | Fixes https:// prefix, syncs colors |

`GET /editor.html` injects `window.__TENANT_CONFIG__` for `build/editor.html`.

---

## 6. Sync Guarantee

All 3 pages write to **same columns**:
- `tenants.custom_domain` + `subdomain`
- `tenants.logo_url` + `favicon_url`
- `tenants.primary_color` + `secondary_color`
- `tenants.config` (`designTokens`, `customDomain`, `loginHeadline`)

`BrandContext.jsx` re-reads `/api/tenant/config` on mount (and after wizard `window.location.reload()`). No per-tenant DB — single `thestemeducator` PG with `tenant_id` row-level isolation.

---

## 7. Help Bot & Video (Super Admin only)

- **Bot:** Floating `?` at bottom-right on `/tenants`, `/white-label`, `/design` (only when `user.role === 'Super Admin'`). Steps highlight `[data-help]` targets, auto-scroll, next/prev, `Verify` trigger. LocalStorage `wl-help-seen-*` controls auto-open.
- **Video:** 95s synthetic video (6 chapters: Intro, Create, Domain, Branding, DNS, Verify) — Super Admin only. Button in bot → modal `WhiteLabelHelpVideo.jsx` (play/pause, progress, chapter jump). No external MP4 — mock UI rendered in video container.

Links in bot/video → this doc (`/docs/white-label`) and `docs/API.md`, `docs/DEPLOYMENT.md`.

---

## 8. Troubleshooting

- **Domain taken:** `409 Already taken` → check `SELECT custom_domain FROM tenants` or `check-availability` endpoint.
- **Verify fails:** `No DNS record` → ensure CNAME exists, TTL not cached. Try `nslookup -type=CNAME lab.school.edu`.
- **Logo not showing:** Check `/uploads/branding/` exists and `express.static('/uploads')` in `backend/src/index.js`. Vite proxies `/uploads` → `:3001`.
- **Branding not applying:** `BrandContext` caches on mount — hard reload or `applyDesignTokens()` after save.
- **Subdomain 404:** Ensure `PLATFORM_HOST` matches apex (e.g. `thestemeducator.com`) and `extractSubdomain()` not blocked by `DISALLOWED_SUBDOMAINS`.

---

## 9. Related Docs

- `docs/API.md` — REST & Socket.io
- `docs/DEPLOYMENT.md` — env, `PLATFORM_HOST`, `BACKEND_URL`, DB
- `docs/INSTALLATION.md` — local dev (`npm start` → `:3001` + `:5173`)
- Frontend: `frontend/src/context/BrandContext.jsx`, `frontend/src/pages/WhiteLabelOnboarding.jsx` (wizard), `frontend/src/pages/DesignSettings.jsx` (synced), `frontend/src/pages/Tenants.jsx` (add modal), `frontend/src/components/WhiteLabelHelpBot.jsx`, `WhiteLabelHelpVideo.jsx`
- Backend: `backend/src/utils/tenantMiddleware.js`, `tenantRoutes.js`, `dnsManager.js`
