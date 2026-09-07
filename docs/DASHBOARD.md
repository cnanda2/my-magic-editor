# Dashboard — Global Metrics (Super Admin)

**Route:** `/dashboard` • **Access:** Super Admin only • **File:** `frontend/src/pages/AdminDashboard.jsx`

## What it shows
- **Total Institutions** (`tenants.length`)
- **Active Students** (`SUM user_count` across tenants)
- **System Health** (`activeCount / total` where `status='active'`)
- Recent activity from `audit_log`

## How to use
1. Check `Active / Total` — if < 90% investigate `Tenants` → `Status` filter.
2. Watch `Active Students` trend — sudden drop = DB sync issue.
3. Use cards to jump: Institutions → `/tenants`, Users → `/users`.

## Data source
`GET /api/admin/tenants` → `tenants[].user_count`, `GET /api/admin/audit` for logs. No cache — reload to refresh.

## Related
- `docs/TENANTS.md` — manage institutions
- `docs/AUDIT.md` — system logs

## HTML view
See `docs/SUPER_ADMIN_GUIDE.html#dashboard` for styled HTML with screenshots.
