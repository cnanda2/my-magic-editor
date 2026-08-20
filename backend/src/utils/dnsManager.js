/**
 * Cloudflare DNS manager for white-label tenant domains.
 * Creates/removes CNAME records pointing a tenant's custom domain
 * at the platform host (PLATFORM_HOST).
 *
 * Credentials (API token + zone ID) are collected from the tenant
 * registration / admin create form per-tenant.
 */

const API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * Strip scheme, path and port from an input, leaving a bare hostname.
 * @param {string} input
 * @returns {string}
 */
function normalizeHostname(input) {
  let host = String(input || '').trim().toLowerCase();
  host = host.replace(/^https?:\/\//i, '');
  host = host.split('/')[0];
  host = host.split(':')[0];
  return host;
}

/**
 * Validate a hostname that a tenant wants to use (no scheme, no path).
 * @param {string} input
 * @returns {boolean}
 */
function isValidHostname(input) {
  const host = normalizeHostname(input);
  if (!host || host.length > 253) return false;
  const labels = host.split('.');
  if (labels.length < 2) return false;
  return labels.every((label) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

async function cfRequest(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!json || json.success !== true) {
    const messages = (json && json.errors && json.errors.map((e) => e.message)) || [`HTTP ${res.status}`];
    throw new Error(`Cloudflare: ${messages.join('; ')}`);
  }
  return json;
}

/**
 * Create a CNAME record for a tenant custom domain.
 * @param {object} opts
 * @param {string} opts.apiToken  Cloudflare API token
 * @param {string} opts.zoneId    Cloudflare zone ID that owns the domain
 * @param {string} opts.name      Tenant custom domain (e.g. lab.school.edu)
 * @param {string} opts.content   CNAME target (platform host)
 * @param {boolean} [opts.proxied] Whether traffic goes through Cloudflare proxy
 * @returns {Promise<object>} Cloudflare DNS record result
 */
async function createCnameRecord({ apiToken, zoneId, name, content, proxied = false }) {
  if (!apiToken) throw new Error('Cloudflare API token is required to create the CNAME record');
  if (!zoneId) throw new Error('Cloudflare Zone ID is required to create the CNAME record');
  const hostname = normalizeHostname(name);
  const target = normalizeHostname(content);
  if (!isValidHostname(hostname)) throw new Error(`Invalid tenant domain: ${name}`);
  if (!isValidHostname(target)) throw new Error(`Invalid CNAME target: ${content}`);
  const json = await cfRequest(`/zones/${zoneId}/dns_records`, {
    token: apiToken,
    method: 'POST',
    body: {
      type: 'CNAME',
      name: hostname,
      content: target,
      ttl: 1,
      proxied: !!proxied,
      comment: 'Created by STEM Educator white-label tenant setup',
    },
  });
  return {
    recordId: json.result && json.result.id,
    recordName: json.result && json.result.name,
    recordContent: json.result && json.result.content,
  };
}

/**
 * Delete a CNAME record.
 * @param {object} opts
 * @param {string} opts.apiToken Cloudflare API token
 * @param {string} opts.zoneId   Cloudflare zone ID
 * @param {string} opts.recordId DNS record id (from createCnameRecord / tenant config)
 * @returns {Promise<boolean>}
 */
async function deleteCnameRecord({ apiToken, zoneId, recordId }) {
  if (!apiToken) throw new Error('Cloudflare API token is required to delete the CNAME record');
  if (!zoneId) throw new Error('Cloudflare Zone ID is required to delete the CNAME record');
  if (!recordId) return false;
  const json = await cfRequest(`/zones/${zoneId}/dns_records/${recordId}`, {
    token: apiToken,
    method: 'DELETE',
  });
  return !!(json.result && json.result.id);
}

module.exports = { createCnameRecord, deleteCnameRecord, normalizeHostname, isValidHostname };