const { query } = require('../db/pool');
const { writeAudit, clientIp } = require('../db/init');
const { authRequired } = require('./auth');

function isSuperAdmin(req) {
  return req.auth?.role === 'Super Admin';
}

function setupPlanRoutes(app) {
  // ===== PUBLIC: List active plans (for pricing page) =====
  app.get('/api/plans', async (req, res) => {
    try {
      const { rows } = await query("SELECT * FROM billing_plans WHERE active = true ORDER BY sort_order ASC, name ASC");
      return res.json({ plans: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: List all plans =====
  app.get('/api/admin/plans', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const { rows } = await query('SELECT * FROM billing_plans ORDER BY sort_order ASC, name ASC');
      return res.json({ plans: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: Create plan =====
  app.post('/api/admin/plans', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const { name, price, description, features, popular } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Plan name is required' });
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
      await query(
        `INSERT INTO billing_plans (id, name, price, description, features, popular)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [id, name, price ?? null, description || null, JSON.stringify(features || []), !!popular]
      );
      const { rows } = await query('SELECT * FROM billing_plans WHERE id = $1', [id]);
      writeAudit({ userId: req.auth.sub, actorName: req.auth.email, actionType: 'PLAN_CREATED', details: `Created plan ${name}`, ip: clientIp(req) });
      return res.status(201).json({ plan: rows[0] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: Update plan =====
  app.patch('/api/admin/plans/:id', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const allowed = ['name', 'price', 'description', 'features', 'popular', 'active', 'sort_order'];
      const updates = [];
      const vals = [];
      let i = 1;
      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          if (field === 'features') {
            updates.push(`${field} = $${i++}::jsonb`);
            vals.push(JSON.stringify(req.body[field]));
          } else {
            updates.push(`${field} = $${i++}`);
            vals.push(req.body[field]);
          }
        }
      }
      if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
      updates.push('updated_at = NOW()');
      vals.push(req.params.id);
      await query(`UPDATE billing_plans SET ${updates.join(', ')} WHERE id = $${i}`, vals);
      writeAudit({ userId: req.auth.sub, actorName: req.auth.email, actionType: 'PLAN_UPDATED', details: `Updated plan ${req.params.id}`, ip: clientIp(req) });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: Delete plan =====
  app.delete('/api/admin/plans/:id', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const { rowCount } = await query('DELETE FROM billing_plans WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: 'Plan not found' });
      writeAudit({ userId: req.auth.sub, actorName: req.auth.email, actionType: 'PLAN_DELETED', details: `Deleted plan ${req.params.id}`, ip: clientIp(req) });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { setupPlanRoutes };
