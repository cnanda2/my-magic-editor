const { query } = require('../db/pool');

const DISALLOWED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'mail', 'auth', 'login', 'dashboard']);

function extractSubdomain(host) {
  if (!host) return null;
  const parts = host.split(':')[0].split('.');
  if (parts.length < 2) return null;
  const sub = parts[0];
  if (DISALLOWED_SUBDOMAINS.has(sub)) return null;
  if (sub === 'localhost' || sub === '127' || sub === '0' || sub === '192' || sub === '10') return null;
  return sub;
}

function extractHost(host) {
  if (!host) return null;
  return host.split(':')[0].toLowerCase().replace(/^www\./, '');
}

async function resolveTenantByHost(host) {
  if (!host) return null;
  const { rows } = await query(
    'SELECT id, name, app_name, company_name, logo_url, favicon_url, primary_color, secondary_color, subdomain, custom_domain, config FROM tenants WHERE LOWER(custom_domain) = $1 LIMIT 1',
    [host]
  );
  return rows[0] || null;
}

async function resolveTenant(subdomain) {
  if (!subdomain) return null;
  const { rows } = await query(
    'SELECT id, name, app_name, company_name, logo_url, favicon_url, primary_color, secondary_color, subdomain, custom_domain, config FROM tenants WHERE subdomain = $1 LIMIT 1',
    [subdomain]
  );
  return rows[0] || null;
}

async function tenantResolver(req, res, next) {
  const host = extractHost(req.headers.host);
  if (host) {
    // 1. White-label: match the full custom domain first
    const byDomain = await resolveTenantByHost(host);
    if (byDomain) {
      req.tenant = byDomain;
      return next();
    }
    // 2. Fallback: platform subdomain (e.g. <sub>.<platform domain>)
    const subdomain = extractSubdomain(host);
    if (subdomain) {
      const bySub = await resolveTenant(subdomain);
      if (bySub) req.tenant = bySub;
    }
  }
  next();
}

module.exports = { tenantResolver, extractSubdomain, resolveTenant, resolveTenantByHost, extractHost };