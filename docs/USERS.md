# Users — User Directory (Super Admin)

**Route:** `/users`, `/users/:id` • **Access:** Super Admin, Admin (`isAdmin`) • **Files:** `UserDirectory.jsx`, `UserDetail.jsx`

## Features
- Search by name/email, filter by role (`Super Admin`, `Tenant Admin`, `Student`…), status.
- Create user: `POST /api/admin/users` with `tenant_id`, `role`, `email`, `password`, `status`.
- Edit: `PATCH /admin/users/:id` → updates `users` table (tenant-scoped except Super Admin).

## Tenant isolation
- Super Admin sees all tenants; Tenant Admin sees only `tenant_id = auth.tenant_id`.
- `userRoutes.js` enforces `tenantScope(req)`.

## HTML
`docs/SUPER_ADMIN_GUIDE.html#users`
