# Pricing — Pricing Plans (Super Admin)

**Route:** `/pricing` • **File:** `Pricing.jsx` • **API:** `GET /api/plans`, `POST /api/admin/plans`, `PATCH /api/admin/plans/:id`

## Plans
Seeded in `init.js`: `Starter $0`, `Professional $49`, `Enterprise custom` (includes `White-labeled Platform` feature). `billing_plans.features JSONB`, `sort_order`.

## Edit
Super Admin CRUD. `page_content` `pricing` auto-generates compare matrix from `billing_plans.features`.

## HTML
`docs/SUPER_ADMIN_GUIDE.html#pricing`
