# Roles — Role Manager (Super Admin)

**Route:** `/roles` • **File:** `RolesPermissions.jsx` • **Table:** `roles`

## Default roles
- `Super Admin` — full access, `isSuperAdmin` check
- `Tenant Admin` — manage own tenant (`BrandingRoute` includes)
- `Lead Instructor`, `Lab Tech`, `Guest Lecturer`, `Student`

## Permissions
Stored in `roles.permissions JSONB`. UI toggles map to `userRoutes.js` `authRequired` + `isSuperAdmin` / `isAdmin` guards.

## Edit
`PATCH /api/admin/roles/:id` — Super Admin only.

## HTML
`docs/SUPER_ADMIN_GUIDE.html#roles`
