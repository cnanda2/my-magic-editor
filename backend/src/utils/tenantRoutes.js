const { query } = require('../db/pool');
const { writeAudit, clientIp } = require('../db/init');
const { authRequired } = require('./auth');
const { createCnameRecord, deleteCnameRecord, normalizeHostname, isValidHostname } = require('./dnsManager');

function defaultPlatformHost() {
  try {
    if (process.env.BACKEND_URL) return normalizeHostname(new URL(process.env.BACKEND_URL).hostname);
  } catch (e) {}
  return 'localhost';
}

const PLATFORM_HOST = normalizeHostname(process.env.PLATFORM_HOST || defaultPlatformHost());
const PLATFORM_APEX = PLATFORM_HOST.split('.').slice(-2).join('.') || PLATFORM_HOST;

function dnsConfig(record, zoneId, proxied) {
  return {
    dns: record
      ? {
          provider: 'cloudflare',
          zone_id: zoneId,
          record_id: record.recordId,
          record_name: record.recordName,
          target: record.recordContent,
          proxied: !!proxied,
          status: 'created',
          created_at: new Date().toISOString(),
        }
      : { status: 'manual', created_at: new Date().toISOString() },
  };
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key] && typeof target[key] === 'object') {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function isSuperAdmin(req) {
  return req.auth?.role === 'Super Admin';
}

function setupTenantRoutes(app) {
  // ===== PUBLIC: Tenant onboarding / signup =====
  app.post('/api/tenants/register', async (req, res) => {
    try {
      const {
        companyName, email, password, subdomain, appName,
        customDomain, cloudflareZoneId, cloudflareApiToken, proxied, cnameTarget,
      } = req.body || {};
      if (!companyName || !email || !password) {
        return res.status(400).json({ error: 'companyName, email and password are required' });
      }
      if (String(password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      if (customDomain && !isValidHostname(customDomain)) {
        return res.status(400).json({ error: `Invalid tenant domain: ${customDomain}` });
      }
      const tid = 'tenant_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const sd = subdomain || companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.random().toString(36).slice(2, 6);
      const host = customDomain ? normalizeHostname(customDomain) : null;

      // White-label: create the CNAME record before provisioning the tenant
      let record = null;
      if (host) {
        try {
          record = await createCnameRecord({
            apiToken: cloudflareApiToken,
            zoneId: cloudflareZoneId,
            name: host,
            content: cnameTarget || PLATFORM_HOST,
            proxied,
          });
        } catch (err) {
          return res.status(400).json({ error: `Failed to create CNAME for ${host}: ${err.message}` });
        }
      }

      await query(
        `INSERT INTO tenants (id, name, company_name, app_name, subdomain, custom_domain, owner_email, status, plan, config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 'trial', $8::jsonb)`,
        [tid, appName || companyName, companyName, appName || companyName, sd, host, email, JSON.stringify(dnsConfig(record, cloudflareZoneId, proxied))]
      );

      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await query(
        `INSERT INTO users (username, email, password_hash, role, tenant_id, status)
         VALUES ($1, $2, $3, 'Tenant Admin', $4, 'active') RETURNING id, username, email, role, tenant_id`,
        [email.split('@')[0], email, hash, tid]
      );

      writeAudit({ tenantId: tid, actionType: 'TENANT_CREATED', details: `Company: ${companyName}, Admin: ${email}, Domain: ${host || sd}` });
      return res.status(201).json({ tenantId: tid, subdomain: sd, customDomain: host, cname: record, user: rows[0] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: List all tenants =====
  app.get('/api/admin/tenants', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const { rows } = await query(
        `SELECT t.*, (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS user_count
         FROM tenants t ORDER BY t.created_at DESC`
      );
      return res.json({ tenants: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: Get single tenant =====
  app.get('/api/admin/tenants/:id', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const { rows } = await query('SELECT * FROM tenants WHERE id = $1', [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: 'Tenant not found' });
      const { rows: users } = await query('SELECT id, username, email, role, status, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC', [req.params.id]);
      return res.json({ tenant: rows[0], users });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: Update tenant =====
  app.patch('/api/admin/tenants/:id', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const allowed = ['name', 'company_name', 'app_name', 'subdomain', 'custom_domain', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'plan', 'status', 'owner_email', 'user_limit'];
      const allowedJsonb = ['config'];
      const updates = [];
      const vals = [];
      let i = 1;
      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${i++}`);
          vals.push(req.body[field]);
        }
      }
      for (const field of allowedJsonb) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${i++}::jsonb`);
          vals.push(typeof req.body[field] === 'string' ? req.body[field] : JSON.stringify(req.body[field]));
        }
      }
      if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
      updates.push(`updated_at = NOW()`);
      vals.push(req.params.id);
      await query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = $${i}`, vals);
      writeAudit({ tenantId: req.params.id, userId: req.auth.sub, actorName: req.auth.email, actionType: 'TENANT_UPDATED', details: `Updated: ${updates.join(', ')}`, ip: clientIp(req) });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: Create tenant =====
  app.post('/api/admin/tenants', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const {
        name, company_name, app_name, subdomain, custom_domain, plan, status,
        owner_email, user_limit, temp_password,
        cloudflare_zone_id, cloudflare_api_token, proxied, cname_target,
      } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Tenant name is required' });
      if (custom_domain && !isValidHostname(custom_domain)) {
        return res.status(400).json({ error: `Invalid tenant domain: ${custom_domain}` });
      }
      const tid = 'tenant_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const sd = subdomain || name.toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Math.random().toString(36).slice(2, 6);
      const host = custom_domain ? normalizeHostname(custom_domain) : null;

      // White-label: create the CNAME record before provisioning the tenant
      let record = null;
      if (host) {
        try {
          record = await createCnameRecord({
            apiToken: cloudflare_api_token,
            zoneId: cloudflare_zone_id,
            name: host,
            content: cname_target || PLATFORM_HOST,
            proxied,
          });
        } catch (err) {
          return res.status(400).json({ error: `Failed to create CNAME for ${host}: ${err.message}` });
        }
      }

      await query(
        `INSERT INTO tenants (id, name, company_name, app_name, subdomain, custom_domain, owner_email, plan, status, user_limit, config)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
        [tid, name, company_name || name, app_name || name, sd, host, owner_email || null, plan || 'free', status || 'active', user_limit ?? 10, JSON.stringify(dnsConfig(record, cloudflare_zone_id, proxied))]
      );
      let user = null;
      if (temp_password) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(temp_password, 10);
        const username = (company_name || name).toLowerCase().replace(/[^a-z0-9]/g, '_') + '_admin';
        const email = owner_email || (host ? `${username}@${host}` : `${username}@${sd}.${PLATFORM_APEX}`);
        const { rows: userRows } = await query(
          `INSERT INTO users (username, email, password_hash, role, tenant_id, status)
           VALUES ($1, $2, $3, 'Tenant Admin', $4, 'active') RETURNING id, username, email, role`,
          [username, email, hash, tid]
        );
        user = userRows[0];
      }
      const { rows } = await query('SELECT * FROM tenants WHERE id = $1', [tid]);
      writeAudit({ tenantId: tid, userId: req.auth.sub, actorName: req.auth.email, actionType: 'TENANT_CREATED', details: `Created tenant ${name} (${host || sd})`, ip: clientIp(req) });
      return res.status(201).json({ tenant: rows[0], user, cname: record });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SUPER ADMIN: Delete tenant =====
  app.delete('/api/admin/tenants/:id', authRequired, async (req, res) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin access required' });
    try {
      const { rows: existing } = await query('SELECT config FROM tenants WHERE id = $1', [req.params.id]);
      const { rowCount } = await query('DELETE FROM tenants WHERE id = $1', [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: 'Tenant not found' });
      // Best-effort: remove the white-label CNAME record if credentials were supplied
      const dns = existing[0] && existing[0].config && existing[0].config.dns;
      if (dns && dns.record_id && dns.zone_id && req.body && req.body.cloudflareApiToken) {
        try {
          await deleteCnameRecord({ apiToken: req.body.cloudflareApiToken, zoneId: dns.zone_id, recordId: dns.record_id });
        } catch (err) {
          writeAudit({ tenantId: req.params.id, userId: req.auth.sub, actorName: req.auth.email, actionType: 'TENANT_DELETED', status: 'FAILED', details: `Tenant deleted but CNAME removal failed: ${err.message}`, ip: clientIp(req) });
        }
      }
      writeAudit({ tenantId: req.params.id, userId: req.auth.sub, actorName: req.auth.email, actionType: 'TENANT_DELETED', details: `Deleted tenant ${req.params.id}`, ip: clientIp(req) });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== TENANT ADMIN: Get own tenant settings =====
  app.get('/api/tenant/settings', authRequired, async (req, res) => {
    try {
      const { rows } = await query('SELECT * FROM tenants WHERE id = $1', [req.auth.tenant_id]);
      if (!rows[0]) return res.status(404).json({ error: 'Tenant not found' });
      return res.json({ tenant: rows[0] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== TENANT ADMIN: Update own tenant branding =====
  app.patch('/api/tenant/settings', authRequired, async (req, res) => {
    try {
      const allowed = ['name', 'company_name', 'app_name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color'];
      const updates = [];
      const vals = [];
      let i = 1;
      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${i++}`);
          vals.push(req.body[field]);
        }
      }
      if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
      updates.push(`updated_at = NOW()`);
      vals.push(req.auth.tenant_id);
      await query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = $${i}`, vals);
      writeAudit({ tenantId: req.auth.tenant_id, userId: req.auth.sub, actionType: 'TENANT_BRANDING_UPDATED', ip: clientIp(req) });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== PUBLIC: Get tenant config by subdomain/domain =====
  app.get('/api/tenant/config', async (req, res) => {
    try {
      let tenant = req.tenant || null;
      if (!tenant) {
        const host = req.headers.host || '';
        const domain = host.split(':')[0].toLowerCase();
        const { rows } = await query('SELECT * FROM tenants WHERE custom_domain = $1 OR subdomain = $1 LIMIT 1', [domain]);
        tenant = rows[0] || null;
      }
      if (!tenant) {
        const { rows } = await query("SELECT * FROM tenants WHERE id = 'default' OR instance_id = 'default' LIMIT 1");
        tenant = rows[0] || null;
      }
      if (!tenant) {
        return res.json({ appName: 'STEM Platform', primaryColor: '#00979D', secondaryColor: '#4c97ff', tenantId: null });
      }
      let cfg = {};
      try { cfg = typeof tenant.config === 'string' ? JSON.parse(tenant.config) : (tenant.config || {}); } catch (e) {}
      // Default design tokens — tenants can override via config.designTokens
      const defaultDesignTokens = {
        colors: {
          surface: '#f7f9fb',
          'surface-dim': '#d8dadc',
          'surface-bright': '#f7f9fb',
          'surface-container-lowest': '#ffffff',
          'surface-container-low': '#f2f4f6',
          'surface-container': '#eceef0',
          'surface-container-high': '#e6e8ea',
          'surface-container-highest': '#e0e3e5',
          'on-surface': '#191c1e',
          'on-surface-variant': '#45464d',
          'inverse-surface': '#2d3133',
          'inverse-on-surface': '#eff1f3',
          outline: '#76777d',
          'outline-variant': '#c6c6cd',
          'surface-tint': '#565e74',
          primary: tenant.primary_color || '#000000',
          'on-primary': '#ffffff',
          'primary-container': '#131b2e',
          'on-primary-container': '#7c839b',
          'inverse-primary': '#bec6e0',
          secondary: tenant.secondary_color || '#0058be',
          'on-secondary': '#ffffff',
          'secondary-container': '#2170e4',
          'on-secondary-container': '#fefcff',
          tertiary: '#000000',
          'on-tertiary': '#ffffff',
          'tertiary-container': '#0b1c30',
          'on-tertiary-container': '#75859d',
          error: '#ba1a1a',
          'on-error': '#ffffff',
          'error-container': '#ffdad6',
          'on-error-container': '#93000a',
          'primary-fixed': '#dae2fd',
          'primary-fixed-dim': '#bec6e0',
          'on-primary-fixed': '#131b2e',
          'on-primary-fixed-variant': '#3f465c',
          'secondary-fixed': '#d8e2ff',
          'secondary-fixed-dim': '#adc6ff',
          'on-secondary-fixed': '#001a42',
          'on-secondary-fixed-variant': '#004395',
          'tertiary-fixed': '#d3e4fe',
          'tertiary-fixed-dim': '#b7c8e1',
          'on-tertiary-fixed': '#0b1c30',
          'on-tertiary-fixed-variant': '#38485d',
          background: '#f7f9fb',
          'on-background': '#191c1e',
          'surface-variant': '#e0e3e5',
        },
        typography: {
          'headline-lg': { fontFamily: 'Inter', fontSize: '32px', fontWeight: '700', lineHeight: '40px', letterSpacing: '-0.02em' },
          'headline-lg-mobile': { fontFamily: 'Inter', fontSize: '24px', fontWeight: '700', lineHeight: '32px', letterSpacing: '-0.01em' },
          'headline-md': { fontFamily: 'Inter', fontSize: '24px', fontWeight: '600', lineHeight: '32px', letterSpacing: '-0.01em' },
          'headline-sm': { fontFamily: 'Inter', fontSize: '20px', fontWeight: '600', lineHeight: '28px' },
          'body-lg': { fontFamily: 'Inter', fontSize: '18px', fontWeight: '400', lineHeight: '28px' },
          'body-md': { fontFamily: 'Inter', fontSize: '16px', fontWeight: '400', lineHeight: '24px' },
          'body-sm': { fontFamily: 'Inter', fontSize: '14px', fontWeight: '400', lineHeight: '20px' },
          'label-md': { fontFamily: 'Inter', fontSize: '14px', fontWeight: '600', lineHeight: '20px' },
          'label-sm': { fontFamily: 'Inter', fontSize: '12px', fontWeight: '500', lineHeight: '16px', letterSpacing: '0.01em' },
        },
        rounded: { sm: '0.125rem', DEFAULT: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
        spacing: { unit: '4px', 'container-max': '1440px', gutter: '24px', 'margin-desktop': '40px', 'margin-tablet': '24px', 'margin-mobile': '16px' },
      };
      // Merge tenant config overrides
      const designTokens = cfg.designTokens
        ? deepMerge(defaultDesignTokens, cfg.designTokens)
        : defaultDesignTokens;
      return res.json({
        appName: tenant.app_name || tenant.name || 'STEM Platform',
        companyName: tenant.company_name || '',
        logoUrl: tenant.logo_url || '',
        faviconUrl: tenant.favicon_url || '',
        primaryColor: tenant.primary_color || '#00979D',
        secondaryColor: tenant.secondary_color || '#4c97ff',
        tenantId: tenant.id,
        platformHost: PLATFORM_HOST,
        cnameTarget: PLATFORM_HOST,
        designTokens,
        config: cfg,
      });
    } catch (err) {
      return res.json({ appName: 'STEM Platform', primaryColor: '#00979D', secondaryColor: '#4c97ff', tenantId: null, platformHost: PLATFORM_HOST, cnameTarget: PLATFORM_HOST });
    }
  });
}

module.exports = { setupTenantRoutes };
