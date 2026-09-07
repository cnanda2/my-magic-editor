/**
 * Feature gating middleware.
 *
 * Usage:
 *   const { requireFeature, requireActiveSubscription } = require('./featureGate');
 *
 *   // Gate a route by feature flag stored in the plan's feature_flags JSONB:
 *   app.post('/api/firmware/upload', authRequired, requireFeature('firmware_upload'), handler);
 *
 *   // Gate by just having any active (non-free) subscription:
 *   app.get('/api/devices/advanced', authRequired, requireActiveSubscription, handler);
 *
 * Plans must have feature_flags set in billing_plans.feature_flags JSONB, e.g.:
 *   { "firmware_upload": true, "multiple_devices": true, "analytics": false }
 *
 * Free/starter plan always resolves to an empty feature set unless explicitly
 * set in the billing_plans row.
 */

const { query } = require('../db/pool');

// In-memory cache so we don't hit the DB on every request.
// TTL: 60 seconds. Fine for feature flags that change rarely.
const planCache = new Map();
const CACHE_TTL_MS = 60_000;

async function getPlanFeatures(planId) {
  const cached = planCache.get(planId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.flags;

  const { rows } = await query(
    'SELECT feature_flags FROM billing_plans WHERE id=$1',
    [planId]
  );
  const flags = rows[0]?.feature_flags || {};
  planCache.set(planId, { flags, ts: Date.now() });
  return flags;
}

async function resolveTenantPlan(tenantId) {
  if (!tenantId) return 'starter';
  const { rows } = await query(
    'SELECT plan, status FROM subscriptions WHERE tenant_id=$1 ORDER BY id DESC LIMIT 1',
    [tenantId]
  );
  const sub = rows[0];
  // Treat canceled / past_due subs as free tier
  if (!sub || !['active', 'trialing'].includes(sub.status)) return 'starter';
  return sub.plan || 'starter';
}

/**
 * Middleware factory — requires a specific feature flag to be true on the
 * tenant's current plan. Super Admins always pass.
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      if (req.auth?.role === 'Super Admin') return next();

      const tenantId = req.auth?.tenant_id;
      const plan = await resolveTenantPlan(tenantId);
      const flags = await getPlanFeatures(plan);

      if (flags[featureName] === true) return next();

      return res.status(403).json({
        error: 'Feature not available on your current plan',
        feature: featureName,
        currentPlan: plan,
        upgradeUrl: '/pricing',
      });
    } catch (err) {
      console.error('[featureGate]', err.message);
      return res.status(500).json({ error: 'Feature check failed' });
    }
  };
}

/**
 * Middleware — requires any active paid subscription (not free/starter).
 * Super Admins and Tenant Admins always pass.
 */
async function requireActiveSubscription(req, res, next) {
  try {
    const role = req.auth?.role;
    if (role === 'Super Admin' || role === 'Tenant Admin') return next();

    const tenantId = req.auth?.tenant_id;
    const plan = await resolveTenantPlan(tenantId);

    if (plan !== 'starter' && plan !== 'free') return next();

    return res.status(403).json({
      error: 'An active subscription is required',
      currentPlan: plan,
      upgradeUrl: '/pricing',
    });
  } catch (err) {
    console.error('[featureGate]', err.message);
    return res.status(500).json({ error: 'Subscription check failed' });
  }
}

module.exports = { requireFeature, requireActiveSubscription };
