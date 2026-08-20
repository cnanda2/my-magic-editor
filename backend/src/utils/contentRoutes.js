const { query } = require('../db/pool');
const { writeAudit, clientIp } = require('../db/init');
const { authRequired } = require('./auth');

function isSuperAdmin(req) {
  return req.auth?.role === 'Super Admin';
}

function setupContentRoutes(app) {
  // ===== PUBLIC: Get page content =====
  // For 'pricing' page, comparison table is auto-generated from billing_plans
  app.get('/api/content/:id', async (req, res) => {
    try {
      const { rows } = await query('SELECT content FROM page_content WHERE id = $1', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Page not found' });

      const content = rows[0].content;

      // Auto-generate comparison table from active plans
      if (req.params.id === 'pricing') {
        const { rows: plans } = await query(
          'SELECT id, name, features FROM billing_plans WHERE active = true ORDER BY sort_order ASC, name ASC'
        );

        // Collect all unique feature texts across all plans
        const featureSet = new Set();
        const planFeatures = plans.map(p => {
          const features = (typeof p.features === 'string' ? JSON.parse(p.features) : p.features) || [];
          features.forEach(f => { if (f.text) featureSet.add(f.text); });
          return { id: p.id, name: p.name, features };
        });

        // Build comparison rows
        const compare = [];
        for (const featureText of featureSet) {
          const row = { feature: featureText };
          for (const p of planFeatures) {
            const match = p.features.find(f => f.text === featureText);
            if (match && match.included !== false) {
              row[p.id] = true;
            } else if (match) {
              row[p.id] = false;
            } else {
              row[p.id] = false;
            }
          }
          compare.push(row);
        }

        content.compare = compare;
      }

      return res.json({ content });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: Update page content =====
  app.patch('/api/admin/content/:id', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const existing = await query('SELECT content FROM page_content WHERE id = $1', [req.params.id]);
      if (!existing.rows[0]) return res.status(404).json({ error: 'Page not found' });

      const oldContent = existing.rows[0].content;
      const newContent = { ...oldContent, ...req.body.content };

      await query(
        `UPDATE page_content SET content = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(newContent), req.params.id]
      );
      writeAudit({ userId: req.auth.sub, actorName: req.auth.email, actionType: 'CONTENT_UPDATED', details: `Updated page content: ${req.params.id}`, ip: clientIp(req) });
      return res.json({ success: true, content: newContent });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { setupContentRoutes };
