# Audit — System Logs (Super Admin)

**Route:** `/audit` • **File:** `AuditLog.jsx` • **Table:** `audit_log`

## What it logs
- `TENANT_CREATED`, `TENANT_UPDATED`, `TENANT_DELETED`, `WHITE_LABEL_ONBOARDED`, `TENANT_BRANDING_UPDATED`, `USER_CREATED` etc. via `writeAudit()` in `tenantRoutes.js`, `userRoutes.js`.
- Fields: `tenant_id`, `user_id`, `actorName`, `actionType`, `details`, `ip`, `created_at`.

## Filters
By `tenant_id`, `actionType`, date range. Super Admin sees all; Tenant Admin filtered to own tenant.

## HTML
`docs/SUPER_ADMIN_GUIDE.html#audit`
