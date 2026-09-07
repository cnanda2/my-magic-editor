# Tenants — Institution Management (Super Admin)

**Route:** `/tenants`, `/tenants/:id` • **File:** `Tenants.jsx`, `TenantDetail.jsx` • **API:** `GET /api/admin/tenants`, `POST /api/admin/tenants`, `PATCH /api/admin/tenants/:id`

## Wizard-standard
Add New Institution modal is now **wizard-standard**, synced with `/white-label` and `/design`:
- Domain toggle: `Subdomain` (`oakwood.{PLATFORM_HOST}`) vs `Own domain` (`lab.school.edu` → CNAME)
- Branding preview: `primary_color`, `secondary_color` → `config.designTokens`
- Plan: `Enterprise` auto for custom domain
- Advanced DNS: Cloudflare Zone/Token collapsed
- After create → **Open wizard** → `/white-label?tenantId=NEW_ID`

## Table
- `Institution Name` (`company_name || name`)
- `Plan` badge, `Users` bar (`user_count / user_limit`), `Status` dot
- Actions: **White-Label** → `/white-label?tenantId=ID`, **Manage** → detail, **Palette** → `/design?tenantId=ID`

## Detail
`TenantDetail.jsx` — edit `company_name`, `app_name`, `subdomain`, `custom_domain`, `logo_url`, `primary_color` via `PATCH /admin/tenants/:id`.

## HTML
`docs/SUPER_ADMIN_GUIDE.html#tenants`
