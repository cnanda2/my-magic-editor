/**
 * Authentication routes.
 *
 * Local:
 *   POST /api/auth/register   { username, email, password }
 *   POST /api/auth/login      { email, password }
 *   GET  /api/auth/me         (Bearer token)
 *
 * SSO (Google & Microsoft) using OAuth 2.0 Authorization Code flow:
 *   GET  /api/auth/google              -> redirects to Google consent
 *   GET  /api/auth/google/callback     -> exchanges code, issues JWT
 *   GET  /api/auth/microsoft           -> redirects to Microsoft consent
 *   GET  /api/auth/microsoft/callback  -> exchanges code, issues JWT
 *
 * All secrets come from environment variables (see backend/.env.example).
 * Uses Node 18+ global fetch, so no extra dependencies are needed.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const { writeAudit } = require('../db/init');

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// ---- helpers ---------------------------------------------------------------

function sanitizeUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** Express middleware: verifies Bearer token and attaches req.user. */
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token' });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role guard: requires one of the allowed roles.
 * Admin-equivalent roles are 'admin' and 'System Admin'.
 */
const ADMIN_ROLES = ['admin', 'System Admin', 'Super Admin', 'Tenant Admin'];

function requireRole(...allowed) {
  const roles = allowed.length ? allowed : ADMIN_ROLES;
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'Missing authentication token' });
    const userRole = req.auth.role || '';
    if (!roles.map((r) => r.toLowerCase()).includes(userRole.toLowerCase())) {
      return res.status(403).json({ error: 'You do not have permission to access this resource' });
    }
    next();
  };
}

async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
  return rows[0] || null;
}

/**
 * Find or create a user coming from an OAuth provider.
 * Links to an existing local account if the email already exists.
 */
async function upsertOAuthUser({ provider, subject, email, name, avatarUrl }) {
  // 1) existing OAuth identity
  let { rows } = await query(
    'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_subject = $2 LIMIT 1',
    [provider, subject]
  );
  if (rows[0]) {
    await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [rows[0].id]);
    return rows[0];
  }

  // 2) link to existing local account by email
  const existing = await findUserByEmail(email);
  if (existing) {
    const upd = await query(
      `UPDATE users
         SET oauth_provider = $1, oauth_subject = $2,
             avatar_url = COALESCE($3, avatar_url),
             status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
             last_login_at = NOW(), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [provider, subject, avatarUrl, existing.id]
    );
    return upd.rows[0];
  }

  // 3) brand-new SSO account
  const baseUsername = (name || email.split('@')[0] || 'user').replace(/\s+/g, '').slice(0, 40);
  const username = `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`;
  const insert = await query(
    `INSERT INTO users (username, email, role, status, oauth_provider, oauth_subject, avatar_url, last_login_at)
     VALUES ($1, $2, 'user', 'active', $3, $4, $5, NOW())
     RETURNING *`,
    [username, email, provider, subject, avatarUrl]
  );
  return insert.rows[0];
}

// ---- OAuth provider config -------------------------------------------------

const MS_TENANT = process.env.MICROSOFT_TENANT || 'common';

const providers = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: () => `${BACKEND_URL}/api/auth/google/callback`,
    parseUser: (info) => ({
      subject: info.sub,
      email: info.email,
      name: info.name,
      avatarUrl: info.picture,
    }),
  },
  microsoft: {
    authUrl: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`,
    userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    scope: 'openid email profile',
    clientId: () => process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: () => `${BACKEND_URL}/api/auth/microsoft/callback`,
    parseUser: (info) => ({
      subject: info.sub,
      email: info.email || info.preferred_username,
      name: info.name,
      avatarUrl: info.picture,
    }),
  },
};

// ---- route registration ----------------------------------------------------

function setupAuthRoutes(app) {
  // ===== REGISTER =====
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body || {};
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'username, email and password are required' });
      }
      if (String(password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      if (await findUserByEmail(email)) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      const tenantId = (req.tenant && req.tenant.id) || null;
      const password_hash = await bcrypt.hash(password, 10);
      const { rows } = await query(
        `INSERT INTO users (username, email, password_hash, role, status, tenant_id)
         VALUES ($1, $2, $3, 'user', 'active', $4) RETURNING *`,
        [username, email, password_hash, tenantId]
      );
      const user = rows[0];
      return res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== LOGIN =====
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
      }
      const user = await findUserByEmail(email);
      if (!user || !user.password_hash) {
        writeAudit({ actionType: 'LOGIN_FAILED', details: `Failed login for ${email}`, ip: clientIp(req) });
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (user.status === 'suspended' || user.status === 'disabled') {
        writeAudit({ userId: user.id, actionType: 'LOGIN_BLOCKED', details: 'Account suspended/disabled', ip: clientIp(req) });
        return res.status(403).json({ error: 'This account is not active. Contact your administrator.' });
      }
      // Tenant-scoped login: if request came through a tenant subdomain, user must belong to that tenant
      const tenantId = (req.tenant && req.tenant.id) || null;
      if (tenantId && String(user.tenant_id || '') !== String(tenantId)) {
        writeAudit({ actionType: 'LOGIN_FAILED', details: `Cross-tenant login attempt for ${email}`, ip: clientIp(req) });
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        writeAudit({ actionType: 'LOGIN_FAILED', details: `Invalid password for ${email}`, ip: clientIp(req) });
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      await query('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
      writeAudit({ userId: user.id, actorName: user.username, actorRole: user.role, actionType: 'LOGIN', ip: clientIp(req) });
      return res.json({ token: signToken(user), user: sanitizeUser(user) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== CURRENT USER =====
  app.get('/api/auth/me', authRequired, async (req, res) => {
    try {
      const { rows } = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [req.auth.sub]);
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: sanitizeUser(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== CHANGE PASSWORD (self-service; requires current password) =====
  app.post('/api/auth/change-password', authRequired, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'currentPassword and newPassword are required' });
      }
      if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      const { rows } = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [req.auth.sub]);
      const user = rows[0];
      if (!user || !user.password_hash) {
        return res.status(400).json({ error: 'This account has no password set (SSO-only login)' });
      }
      const ok = await bcrypt.compare(currentPassword, user.password_hash);
      if (!ok) {
        writeAudit({ userId: user.id, actorName: user.username, actorRole: user.role, actionType: 'CHANGE_PASSWORD_FAILED', details: 'Wrong current password', ip: clientIp(req) });
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const password_hash = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, user.id]);
      writeAudit({ userId: user.id, actorName: user.username, actorRole: user.role, actionType: 'CHANGE_PASSWORD', ip: clientIp(req) });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===== SSO: start + callback (Google & Microsoft) =====
  for (const [name, cfg] of Object.entries(providers)) {
    // Step 1: redirect the browser to the provider's consent screen.
    app.get(`/api/auth/${name}`, (req, res) => {
      const clientId = cfg.clientId();
      if (!clientId) {
        return res
          .status(503)
          .json({ error: `${name} SSO is not configured. Set ${name.toUpperCase()}_CLIENT_ID.` });
      }
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: cfg.redirectUri(),
        response_type: 'code',
        scope: cfg.scope,
        access_type: 'offline',
        prompt: 'select_account',
      });
      res.redirect(`${cfg.authUrl}?${params.toString()}`);
    });

    // Step 2: provider redirects back with ?code=...; exchange it for a token.
    app.get(`/api/auth/${name}/callback`, async (req, res) => {
      try {
        const { code, error: oauthError } = req.query;
        if (oauthError) return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(oauthError)}`);
        if (!code) return res.redirect(`${FRONTEND_URL}/login?error=missing_code`);

        // Exchange authorization code for tokens.
        const tokenResp = await fetch(cfg.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: String(code),
            client_id: cfg.clientId(),
            client_secret: cfg.clientSecret(),
            redirect_uri: cfg.redirectUri(),
            grant_type: 'authorization_code',
          }),
        });
        const tokenData = await tokenResp.json();
        if (!tokenResp.ok || !tokenData.access_token) {
          throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
        }

        // Fetch the user's profile.
        const infoResp = await fetch(cfg.userInfoUrl, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const info = await infoResp.json();
        if (!infoResp.ok) throw new Error('Failed to fetch user info');

        const parsed = cfg.parseUser(info);
        if (!parsed.email) throw new Error('Provider did not return an email address');

        const user = await upsertOAuthUser({ provider: name, ...parsed });
        const token = signToken(user);

        // Hand the JWT back to the SPA via URL fragment.
        return res.redirect(`${FRONTEND_URL}/login#token=${encodeURIComponent(token)}`);
      } catch (err) {
        return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(err.message)}`);
      }
    });
  }
}

module.exports = { setupAuthRoutes, authRequired, requireRole, signToken };
