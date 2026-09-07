const bcrypt = require('bcryptjs');
const { query } = require('./pool');

async function initDb() {
  // ---- tenants: full SaaS schema -----------------------------------------
  await query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id              VARCHAR(128) PRIMARY KEY,
      name            VARCHAR(255) NOT NULL,
      company_name    VARCHAR(255),
      subdomain       VARCHAR(128) UNIQUE,
      custom_domain   VARCHAR(255),
      logo_url        TEXT,
      favicon_url     TEXT,
      primary_color   VARCHAR(7) DEFAULT '#00979D',
      secondary_color VARCHAR(7) DEFAULT '#4c97ff',
      app_name        VARCHAR(255),
      instance_id     VARCHAR(128) UNIQUE,
      owner_email     VARCHAR(255),
      plan            VARCHAR(32) DEFAULT 'free',
      status          VARCHAR(32) DEFAULT 'active',
      user_limit      INTEGER DEFAULT 10,
      config          JSONB DEFAULT '{}'::jsonb,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add new columns idempotently
  const tenantCols = ['subdomain', 'custom_domain', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'app_name', 'instance_id', 'owner_email', 'plan', 'status'];
  for (const col of tenantCols) {
    try { await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ${col} VARCHAR(255);`); } catch (e) {}
  }
  try { await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#00979D';`); } catch (e) {}
  try { await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#4c97ff';`); } catch (e) {}
  try { await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 10;`); } catch (e) {}

  // ---- users: full schema ------------------------------------------------
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id             SERIAL PRIMARY KEY,
      username       VARCHAR(255) NOT NULL UNIQUE,
      email          VARCHAR(255) NOT NULL UNIQUE,
      password_hash  VARCHAR(255),
      full_name      VARCHAR(255),
      role           VARCHAR(80) DEFAULT 'user',
      department     VARCHAR(255),
      institution    VARCHAR(255),
      avatar_url     TEXT,
      status         VARCHAR(32) DEFAULT 'pending',
      oauth_provider VARCHAR(64),
      oauth_subject  VARCHAR(255),
      tenant_id      VARCHAR(128),
      last_login_at  TIMESTAMP,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (oauth_provider, oauth_subject)
    );
  `);
  try { await query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));`); } catch (e) {}

  // ---- users: add tenant_id ---------------------------------------------
  try { await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(128) REFERENCES tenants(id) ON DELETE SET NULL;`); } catch (e) {}
  try { await query(`CREATE INDEX IF NOT EXISTS users_tenant_idx ON users (tenant_id);`); } catch (e) {}

  // ---- roles ------------------------------------------------------------
  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(80) NOT NULL UNIQUE,
      description  TEXT,
      is_default   BOOLEAN NOT NULL DEFAULT false,
      permissions  JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const defaultRoles = [
    {
      name: 'Super Admin',
      description: 'Full access across all tenants. Manages platform, tenants, billing.',
      is_default: true,
      permissions: {
        manage_tenants: true, manage_billing: true, manage_platform: true,
        create_lessons: true, edit_syllabus: true, delete_assets: true,
        view_student_progress: true, export_pii: true, modify_permissions: true,
        configure_api_keys: true, manage_iot: true, backup_trigger: true, clear_audit_log: true,
      },
    },
    {
      name: 'Tenant Admin',
      description: 'Full access within their tenant. Manages users, settings, branding.',
      is_default: false,
      permissions: {
        manage_tenants: false, manage_billing: false, manage_platform: false,
        create_lessons: true, edit_syllabus: true, delete_assets: true,
        view_student_progress: true, export_pii: true, modify_permissions: true,
        configure_api_keys: false, manage_iot: true, backup_trigger: false, clear_audit_log: false,
      },
    },
    {
      name: 'Lead Instructor',
      description: 'Manage curriculum, student progress, lab equipment reservations.',
      is_default: false,
      permissions: {
        create_lessons: true, edit_syllabus: true, delete_assets: false,
        view_student_progress: true, export_pii: false, modify_permissions: false,
        configure_api_keys: false, manage_iot: false, backup_trigger: false, clear_audit_log: false,
      },
    },
    {
      name: 'Lab Tech',
      description: 'Operational control over hardware assets and maintenance logging.',
      is_default: false,
      permissions: {
        create_lessons: false, edit_syllabus: false, delete_assets: false,
        view_student_progress: false, export_pii: false, modify_permissions: false,
        configure_api_keys: false, manage_iot: true, backup_trigger: true, clear_audit_log: false,
      },
    },
    {
      name: 'Guest Lecturer',
      description: 'Limited access to presentation tools and specific session materials.',
      is_default: false,
      permissions: {
        create_lessons: false, edit_syllabus: false, delete_assets: false,
        view_student_progress: false, export_pii: false, modify_permissions: false,
        configure_api_keys: false, manage_iot: false, backup_trigger: false, clear_audit_log: false,
      },
    },
    {
      name: 'Student',
      description: 'Can log in and use the STEM editor. No admin access.',
      is_default: false,
      permissions: {
        create_lessons: false, edit_syllabus: false, delete_assets: false,
        view_student_progress: false, export_pii: false, modify_permissions: false,
        configure_api_keys: false, manage_iot: false, backup_trigger: false, clear_audit_log: false,
      },
    },
  ];

  for (const r of defaultRoles) {
    await query(
      `INSERT INTO roles (name, description, is_default, permissions)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (name) DO NOTHING`,
      [r.name, r.description, r.is_default, JSON.stringify(r.permissions)]
    );
  }

  // ---- audit_log (tenant-aware) -----------------------------------------
  await query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id          SERIAL PRIMARY KEY,
      tenant_id   VARCHAR(128),
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_name  VARCHAR(255),
      actor_role  VARCHAR(80),
      action_type VARCHAR(80) NOT NULL,
      status      VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
      details     TEXT,
      ip_address  VARCHAR(64),
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try { await query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(128);`); } catch (e) {}
  try { await query(`CREATE INDEX IF NOT EXISTS audit_log_tenant_idx ON audit_log (tenant_id);`); } catch (e) {}
  try { await query(`CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);`); } catch (e) {}

  // ---- tenant settings (key-value for extensibility) ---------------------
  await query(`
    CREATE TABLE IF NOT EXISTS tenant_settings (
      id         SERIAL PRIMARY KEY,
      tenant_id  VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      key        VARCHAR(255) NOT NULL,
      value      TEXT,
      UNIQUE(tenant_id, key)
    );
  `);

  // ---- billing plans ----------------------------------------------------
  await query(`
    CREATE TABLE IF NOT EXISTS billing_plans (
      id                  VARCHAR(64) PRIMARY KEY,
      name                VARCHAR(128) NOT NULL,
      price               INTEGER,
      description         TEXT,
      features            JSONB DEFAULT '[]'::jsonb,
      popular             BOOLEAN DEFAULT false,
      active              BOOLEAN DEFAULT true,
      sort_order          INTEGER DEFAULT 0,
      stripe_price_id     VARCHAR(255),
      stripe_price_id_yearly VARCHAR(255),
      feature_flags       JSONB DEFAULT '{}'::jsonb,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  try { await query(`ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);`); } catch (e) {}
  try { await query(`ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS stripe_price_id_yearly VARCHAR(255);`); } catch (e) {}
  try { await query(`ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;`); } catch (e) {}

  // ---- page content for public pages (pricing, about, etc.) ------------
  await query(`
    CREATE TABLE IF NOT EXISTS page_content (
      id        VARCHAR(64) PRIMARY KEY,
      content   JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const { rows: contentCheck } = await query("SELECT COUNT(*)::int AS cnt FROM page_content WHERE id = 'pricing'");
  if (contentCheck[0].cnt === 0) {
    await query(`INSERT INTO page_content (id, content) VALUES ('pricing', $1::jsonb)`, [JSON.stringify({
      currency: '$',
      hero: { title: 'Empower Your STEM Curriculum', subtitle: 'Choose the plan that fits your educational journey. From individual educators to global institutions, we provide the tools for tomorrow\'s discoveries.' },
      compare: [
        { feature: 'Virtual Lab Library', starter: '5 Labs', pro: 'Unlimited', enterprise: 'Unlimited + Custom' },
        { feature: 'Faculty Seats', starter: '1 User', pro: 'Up to 10', enterprise: 'Unlimited' },
        { feature: 'LMS Integration', starter: false, pro: true, enterprise: true },
        { feature: 'Reporting API', starter: false, pro: false, enterprise: true },
        { feature: 'Support Response', starter: '48 Hours', pro: '4 Hours', enterprise: 'Instant / Slack' },
      ],
      faqs: [
        { q: 'Can I switch plans mid-semester?', a: 'Yes, you can upgrade or downgrade your plan at any time. If you upgrade, the new features will be unlocked immediately and the price will be prorated.' },
        { q: 'What constitutes a "Faculty Seat"?', a: 'A Faculty Seat is assigned to an educator or administrator who can create classes, assign labs, and view student progress analytics. Students do not require seats.' },
        { q: 'Do you offer educational institution discounts?', a: 'Our Enterprise plan is specifically designed for institutional volume and includes customized pricing based on the number of departments and users.' },
      ],
      trust: ['EDU-LOGIC', 'STEM-LABS', 'UNI-QUEST', 'TECH-ACAD'],
    })]);
  }

  // Seed default plans if table is empty
  const { rows: existing } = await query('SELECT COUNT(*)::int AS cnt FROM billing_plans');
  if (existing[0].cnt === 0) {
    const starterFeat = JSON.stringify([{text:'Access to 5 Basic Labs',included:true},{text:'1 Faculty Seat',included:true},{text:'Community Support',included:true},{text:'Advanced Analytics',included:false}]);
    const profFeat = JSON.stringify([{text:'Unlimited Labs Access',included:true},{text:'Up to 10 Faculty Seats',included:true},{text:'Priority Email Support',included:true},{text:'Advanced Student Analytics',included:true},{text:'Curriculum Exporting',included:true}]);
    const entFeat = JSON.stringify([{text:'White-labeled Platform',included:true},{text:'Unlimited Faculty Seats',included:true},{text:'Dedicated Account Manager',included:true},{text:'SAML/SSO Integration',included:true}]);
    await query('INSERT INTO billing_plans (id, name, price, description, popular, sort_order, features) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb),($8,$9,$10,$11,$12,$13,$14::jsonb),($15,$16,$17,$18,$19,$20,$21::jsonb)', [
      'starter','Starter',0,'Perfect for individual educators and STEM hobbyists.',false,1,starterFeat,
      'professional','Professional',49,'Optimized for growth and growing science departments.',true,2,profFeat,
      'enterprise','Enterprise',null,'Scaling STEM across entire universities or districts.',false,3,entFeat,
    ]);
  }

  // ---- subscriptions / billing (stub) -----------------------------------
  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                  SERIAL PRIMARY KEY,
      tenant_id           VARCHAR(128) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      plan                VARCHAR(32) NOT NULL DEFAULT 'free',
      status              VARCHAR(32) NOT NULL DEFAULT 'active',
      stripe_customer_id  VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      seats               INTEGER DEFAULT 10,
      current_period_start TIMESTAMP,
      current_period_end   TIMESTAMP,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ---- upsert default tenant from env -----------------------------------
  const instanceId = process.env.INSTANCE_ID || 'default';
  const appName = process.env.APP_NAME || 'Hardware Blocks';
  const companyName = process.env.COMPANY_NAME || '';
  await query(
    `INSERT INTO tenants (id, name, company_name, app_name, instance_id, subdomain)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET name = $2, company_name = $3, app_name = $4, instance_id = $5`,
    [instanceId, appName, companyName, appName, instanceId, process.env.SUBDOMAIN || 'app']
  );

  // ---- seed admin accounts from env (written by the setup wizard) -------
  async function seedAdminIfMissing(email, password, username, role, label) {
    if (!email || !password) return;
    const { rows: existing } = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.length > 0) return;
    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO users (username, email, password_hash, role, status, tenant_id)
       VALUES ($1, $2, $3, $4, 'active', $5)`,
      [username, email, passwordHash, role, instanceId]
    );
    // eslint-disable-next-line no-console
    console.log(`[db] ${label} account created: ${email}`);
  }
  await seedAdminIfMissing(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, process.env.ADMIN_USERNAME || 'superadmin', 'Super Admin', 'super-admin');
  await seedAdminIfMissing(process.env.ADMIN2_EMAIL, process.env.ADMIN2_PASSWORD, process.env.ADMIN2_USERNAME || 'admin', 'admin', 'admin');

  // Backfill: Super Admins created without a tenant (e.g. by the setup
  // wizard) get the instance tenant so Account Info shows a tenant_id and
  // JWTs carry it. Safe: tenant resolution is host-based; Super Admins stay
  // global via role checks.
  try {
    await query(`UPDATE users SET tenant_id = $1 WHERE tenant_id IS NULL AND role = 'Super Admin'`, [instanceId]);
  } catch (_) {}

  // eslint-disable-next-line no-console
  console.log('[db] schema ready (SaaS multi-tenant)');
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
}

const _instanceId = process.env.INSTANCE_ID || 'default';

async function writeAudit({ tenantId, userId, actorName, actorRole, actionType, status = 'SUCCESS', details, ip }) {
  try {
    await query(
      `INSERT INTO audit_log (tenant_id, user_id, actor_name, actor_role, action_type, status, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenantId || _instanceId, userId || null, actorName || null, actorRole || null, actionType, status, details || null, ip || null]
    );
  } catch (err) {
    console.error('[audit] failed to write entry:', err.message);
  }
}

function getInstanceId() {
  return _instanceId;
}

module.exports = { initDb, writeAudit, getInstanceId, clientIp };
