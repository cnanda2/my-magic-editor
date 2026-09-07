/**
 * User Management API routes.
 *
 *   GET    /api/admin/stats            dashboard summary counts
 *   GET    /api/admin/users           list users (search/filter/paginate)
 *   POST   /api/admin/users           create user
 *   GET    /api/admin/users/:id       single user
 *   PATCH  /api/admin/users/:id       update user
 *   DELETE /api/admin/users/:id       delete user
 *   GET    /api/admin/roles           list roles + permissions
 *   POST   /api/admin/roles           create role
 *   PATCH  /api/admin/roles/:id       update role/permissions
 *   GET    /api/admin/audit           list audit-log entries
 *
 * All routes require a valid JWT (authRequired).
 */

const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { writeAudit } = require('../db/init');
const { authRequired, requireRole } = require('./auth');

const USER_FIELDS = `id, username, email, full_name, role, department, institution,
                     avatar_url, status, oauth_provider, tenant_id, last_login_at, created_at, updated_at`;

function isSuperAdmin(req) {
  return req.auth?.role === 'Super Admin';
}

function tenantScope(req) {
  return isSuperAdmin(req) ? '' : req.auth.tenant_id;
}

function tenantWhere(field, req, params) {
  const tid = tenantScope(req);
  if (tid) { params.push(tid); return `${field} = $${params.length}`; }
  return '';
}

function setupUserRoutes(app) {
  // ===== DASHBOARD STATS =====
  app.get('/api/admin/stats', authRequired, requireRole(), async (req, res) => {
    try {
      const tid = tenantScope(req);
      const isSuper = isSuperAdmin(req);
      const buildWhere = (extra) => {
        const clauses = [];
        const p = [];
        if (tid) { p.push(tid); clauses.push(`tenant_id = $${p.length}`); }
        if (!isSuper) { clauses.push("role NOT IN ('Super Admin', 'Tenant Admin')"); }
        if (extra) { clauses.push(extra); }
        return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params: p };
      };
      const totalQ = buildWhere();
      const activeQ = buildWhere("status = 'active'");
      const pendingQ = buildWhere("status = 'pending'");
      const [{ rows: total }, { rows: roles }, { rows: active }, { rows: pending }] = await Promise.all([
        query(`SELECT COUNT(*)::int AS c FROM users ${totalQ.sql}`, totalQ.params),
        query('SELECT COUNT(*)::int AS c FROM roles'),
        query(`SELECT COUNT(*)::int AS c FROM users ${activeQ.sql}`, activeQ.params),
        query(`SELECT COUNT(*)::int AS c FROM users ${pendingQ.sql}`, pendingQ.params),
      ]);
      res.json({
        totalUsers: total[0].c,
        activeUsers: active[0].c,
        pendingUsers: pending[0].c,
        totalRoles: roles[0].c,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== LIST USERS =====
  app.get('/api/admin/users', authRequired, requireRole(), async (req, res) => {
    try {
      const { search = '', role, status, department, page = 1, pageSize = 10 } = req.query;
      const limit = Math.min(parseInt(pageSize, 10) || 10, 100);
      const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

      const where = [];
      const params = [];
      const tid = tenantScope(req);
      if (tid) { params.push(tid); where.push(`tenant_id = $${params.length}`); }
      // Tenant Admin cannot see other admins or Super Admins
      if (!isSuperAdmin(req)) {
        where.push("role NOT IN ('Super Admin', 'Tenant Admin')");
      }
      if (search) {
        params.push(`%${search}%`);
        where.push(`(username ILIKE $${params.length} OR email ILIKE $${params.length} OR COALESCE(full_name,'') ILIKE $${params.length})`);
      }
      if (role) { params.push(role); where.push(`role = $${params.length}`); }
      if (status) { params.push(status); where.push(`status = $${params.length}`); }
      if (department) { params.push(department); where.push(`department = $${params.length}`); }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countRes = await query(`SELECT COUNT(*)::int AS c FROM users ${whereSql}`, params);
      params.push(limit); params.push(offset);
      const rowsRes = await query(
        `SELECT ${USER_FIELDS} FROM users ${whereSql} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      res.json({ users: rowsRes.rows, total: countRes.rows[0].c, page: Number(page), pageSize: limit });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== GET ONE =====
  app.get('/api/admin/users/:id', authRequired, requireRole(), async (req, res) => {
    try {
      const tid = tenantScope(req);
      let sql = `SELECT ${USER_FIELDS} FROM users WHERE id = $1`;
      const params = [req.params.id];
      if (tid) { sql += ' AND tenant_id = $2'; params.push(tid); }
      const { rows } = await query(sql, params);
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });
      res.json({ user: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== CREATE =====
  app.post('/api/admin/users', authRequired, requireRole(), async (req, res) => {
    try {
      const { username, email, password, full_name, role = 'user', department, institution, status = 'active' } = req.body || {};
      if (!username || !email) return res.status(400).json({ error: 'username and email are required' });
      const { rows: exists } = await query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (exists[0]) return res.status(409).json({ error: 'Email already in use' });

      // Tenant Admin can only create users under their own tenant
      const tenantId = isSuperAdmin(req) ? (req.body.tenant_id || null) : (req.auth.tenant_id || null);

      // Enforce user creation limit for non-Super-Admin
      if (!isSuperAdmin(req) && tenantId) {
        const { rows: count } = await query('SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1', [tenantId]);
        const { rows: tenant } = await query('SELECT user_limit FROM tenants WHERE id = $1', [tenantId]);
        const limit = tenant[0]?.user_limit ?? 10;
        if (count[0].c >= limit) {
          return res.status(403).json({ error: `User limit of ${limit} reached. Contact your Super Admin to increase the limit.` });
        }
      }

      const password_hash = password ? await bcrypt.hash(password, 10) : null;
      const { rows } = await query(
        `INSERT INTO users (username, email, password_hash, full_name, role, department, institution, status, tenant_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${USER_FIELDS}`,
        [username, email, password_hash, full_name, role, department, institution, status, tenantId]
      );
      await writeAudit({
        userId: req.auth.sub, actorName: req.auth.email, actorRole: req.auth.role,
        actionType: 'USER_CREATED', details: `Created user ${email}`, ip: req.ip,
      });
      res.status(201).json({ user: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== TENANT ADMIN: Create user under own tenant =====
  app.post('/api/tenant/users', authRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenant_id;
      if (!tenantId) return res.status(400).json({ error: 'No tenant assigned' });

      // Enforce user creation limit
      const { rows: count } = await query('SELECT COUNT(*)::int AS c FROM users WHERE tenant_id = $1', [tenantId]);
      const { rows: tenant } = await query('SELECT user_limit FROM tenants WHERE id = $1', [tenantId]);
      const limit = tenant[0]?.user_limit ?? 10;
      if (count[0].c >= limit) {
        return res.status(403).json({ error: `User limit of ${limit} reached. Contact your Super Admin to increase the limit.` });
      }

      const { username, email, password, full_name, role: requestedRole, department, institution } = req.body || {};
      if (!username || !email) return res.status(400).json({ error: 'username and email are required' });
      // Self-service tenant user creation must never be able to grant admin-tier
      // access (Super Admin has zero tenant scoping anywhere in the codebase - a
      // Tenant Admin passing role: 'Super Admin' here would create a full
      // platform-wide admin account). The UI never offers these roles either.
      const ADMIN_TIER_ROLES = ['admin', 'System Admin', 'Super Admin', 'Tenant Admin'];
      const role = (requestedRole && !ADMIN_TIER_ROLES.includes(requestedRole)) ? requestedRole : 'user';
      const { rows: exists } = await query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email]);
      if (exists[0]) return res.status(409).json({ error: 'Email already in use' });
      const password_hash = password ? await bcrypt.hash(password, 10) : null;
      const { rows } = await query(
        `INSERT INTO users (username, email, password_hash, full_name, role, department, institution, status, tenant_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8) RETURNING ${USER_FIELDS}`,
        [username, email, password_hash, full_name, role, department, institution, tenantId]
      );
      res.status(201).json({ user: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== UPDATE =====
  app.patch('/api/admin/users/:id', authRequired, requireRole(), async (req, res) => {
    try {
      const allowed = ['username', 'email', 'full_name', 'role', 'department', 'institution', 'status', 'avatar_url'];
      const sets = [];
      const setParams = [];
      let idx = 1;
      for (const key of allowed) {
        if (req.body[key] !== undefined) { setParams.push(req.body[key]); sets.push(`${key} = $${idx++}`); }
      }
      if (req.body.password) { setParams.push(await bcrypt.hash(req.body.password, 10)); sets.push(`password_hash = $${idx++}`); }
      if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
      const whereClauses = [`id = $${idx++}`];
      const whereParams = [req.params.id];
      const tid = tenantScope(req);
      if (tid) { whereClauses.push(`tenant_id = $${idx++}`); whereParams.push(tid); }
      const { rows } = await query(
        `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE ${whereClauses.join(' AND ')} RETURNING ${USER_FIELDS}`,
        [...setParams, ...whereParams]
      );
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });
      await writeAudit({
        userId: req.auth.sub, actorName: req.auth.email, actorRole: req.auth.role,
        actionType: 'USER_UPDATED', details: `Updated user #${req.params.id}`, ip: req.ip,
      });
      res.json({ user: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== DELETE =====
  app.delete('/api/admin/users/:id', authRequired, requireRole(), async (req, res) => {
    try {
      if (String(req.auth.sub) === String(req.params.id)) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }
      const tid = tenantScope(req);
      const params = [req.params.id];
      let sql = 'DELETE FROM users WHERE id = $1';
      if (tid) { sql += ' AND tenant_id = $2'; params.push(tid); }
      const { rowCount } = await query(sql, params);
      if (!rowCount) return res.status(404).json({ error: 'User not found' });
      await writeAudit({
        userId: req.auth.sub, actorName: req.auth.email, actorRole: req.auth.role,
        actionType: 'USER_DELETED', status: 'SUCCESS', details: `Deleted user #${req.params.id}`, ip: req.ip,
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== ROLES =====
  app.get('/api/admin/roles', authRequired, requireRole(), async (req, res) => {
    try {
      const { rows } = await query('SELECT * FROM roles ORDER BY is_default DESC, id ASC');
      // include assigned user counts
      const { rows: counts } = await query('SELECT role, COUNT(*)::int AS c FROM users GROUP BY role');
      const countMap = Object.fromEntries(counts.map((r) => [r.role, r.c]));
      res.json({ roles: rows.map((r) => ({ ...r, assigned_users: countMap[r.name] || 0 })) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // roles is a single global, platform-wide catalog (no tenant_id column, names
  // are globally unique) - a Tenant Admin editing it would affect every tenant's
  // available roles and permission definitions, not just their own.
  app.post('/api/admin/roles', authRequired, requireRole(), async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const { name, description, permissions = {} } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name is required' });
      const { rows } = await query(
        `INSERT INTO roles (name, description, permissions) VALUES ($1,$2,$3::jsonb) RETURNING *`,
        [name, description, JSON.stringify(permissions)]
      );
      await writeAudit({
        userId: req.auth.sub, actorName: req.auth.email, actorRole: req.auth.role,
        actionType: 'ROLE_CREATED', details: `Created role ${name}`, ip: req.ip,
      });
      res.status(201).json({ role: rows[0] });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Role name already exists' });
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/admin/roles/:id', authRequired, requireRole(), async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const sets = [];
      const params = [];
      if (req.body.name !== undefined) { params.push(req.body.name); sets.push(`name = $${params.length}`); }
      if (req.body.description !== undefined) { params.push(req.body.description); sets.push(`description = $${params.length}`); }
      if (req.body.permissions !== undefined) { params.push(JSON.stringify(req.body.permissions)); sets.push(`permissions = $${params.length}::jsonb`); }
      if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
      params.push(req.params.id);
      const { rows } = await query(
        `UPDATE roles SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!rows[0]) return res.status(404).json({ error: 'Role not found' });
      await writeAudit({
        userId: req.auth.sub, actorName: req.auth.email, actorRole: req.auth.role,
        actionType: 'PERMISSION_UPDATE', details: `Updated role ${rows[0].name}`, ip: req.ip,
      });
      res.json({ role: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===== AUDIT LOG =====
  app.get('/api/admin/audit', authRequired, requireRole(), async (req, res) => {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const limit = Math.min(parseInt(pageSize, 10) || 10, 100);
      const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

      // Tenant Admin: only see non-admin activity in their tenant + their own.
      // Previously missing the tenant_id filter entirely, leaking every other
      // tenant's user-level activity to any Tenant Admin viewing this page.
      const isSuper = isSuperAdmin(req);
      let whereClause = '';
      const params = [];
      if (!isSuper) {
        const tid = req.auth.tenant_id;
        params.push(tid, 'Super Admin', 'Tenant Admin', req.auth.sub);
        whereClause = 'WHERE tenant_id = $1 AND ((actor_role NOT IN ($2, $3)) OR user_id = $4)';
      }

      const [{ rows: logs }, { rows: count }] = await Promise.all([
        query(`SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
        query(`SELECT COUNT(*)::int AS c FROM audit_log ${whereClause}`, params),
      ]);
      // summary stats
      const { rows: summary } = await query(`
        SELECT
          COUNT(*) FILTER (WHERE action_type IN ('LOGIN_ATTEMPT','LOGIN'))::int AS auth_count,
          COUNT(*) FILTER (WHERE action_type IN ('PERMISSION_UPDATE','USER_UPDATED','ROLE_CREATED'))::int AS config_count,
          COUNT(*) FILTER (WHERE status IN ('BLOCKED','FAILURE'))::int AS alerts_count
        FROM audit_log ${whereClause}
      `, params);
      res.json({ logs, total: count[0].c, page: Number(page), pageSize: limit, summary: summary[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { setupUserRoutes };
