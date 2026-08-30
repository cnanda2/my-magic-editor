/**
 * Stripe billing routes.
 *
 * POST /api/billing/checkout          – create a Stripe Checkout session
 * POST /api/billing/portal            – create a Stripe Customer Portal session
 * GET  /api/billing/subscription      – get current tenant's subscription status
 * POST /api/billing/webhook           – Stripe webhook handler (raw body required)
 *
 * Environment variables required:
 *   STRIPE_SECRET_KEY        – sk_live_… or sk_test_…
 *   STRIPE_WEBHOOK_SECRET    – whsec_… from `stripe listen` or dashboard
 *   FRONTEND_URL             – e.g. http://localhost:5173
 */

const { query } = require('../db/pool');
const { authRequired } = require('./auth');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function getStripe() {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  // require lazily so the server starts even without the key (shows warning)
  return require('stripe')(STRIPE_SECRET_KEY);
}

async function getOrCreateStripeCustomer(stripe, tenantId, email, name) {
  const { rows } = await query(
    'SELECT stripe_customer_id FROM subscriptions WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1',
    [tenantId]
  );
  if (rows[0]?.stripe_customer_id) return rows[0].stripe_customer_id;

  const customer = await stripe.customers.create({ email, name, metadata: { tenant_id: tenantId } });
  return customer.id;
}

async function upsertSubscription(tenantId, data) {
  const { rows } = await query(
    'SELECT id FROM subscriptions WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1',
    [tenantId]
  );
  if (rows.length) {
    await query(
      `UPDATE subscriptions SET plan=$2, status=$3, stripe_customer_id=$4, stripe_subscription_id=$5,
       current_period_start=$6, current_period_end=$7, updated_at=NOW() WHERE tenant_id=$1`,
      [tenantId, data.plan, data.status, data.stripe_customer_id,
       data.stripe_subscription_id, data.current_period_start, data.current_period_end]
    );
  } else {
    await query(
      `INSERT INTO subscriptions (tenant_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, data.plan, data.status, data.stripe_customer_id,
       data.stripe_subscription_id, data.current_period_start, data.current_period_end]
    );
  }
  await query('UPDATE tenants SET plan=$2, updated_at=NOW() WHERE id=$1', [tenantId, data.plan]);
}

function setupStripeRoutes(app, expressRaw) {
  if (!STRIPE_SECRET_KEY) {
    console.warn('[stripe] STRIPE_SECRET_KEY not set — billing routes disabled');
    return;
  }

  // Webhook needs raw body — must be registered before express.json() on this path
  app.post(
    '/api/billing/webhook',
    expressRaw({ type: 'application/json' }),
    async (req, res) => {
      if (!STRIPE_WEBHOOK_SECRET) return res.status(400).send('Webhook secret not configured');
      let event;
      try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        return res.status(400).send(`Webhook error: ${err.message}`);
      }

      try {
        const stripe = getStripe();
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object;
            const tenantId = session.metadata?.tenant_id;
            if (!tenantId || !session.subscription) break;
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            const priceId = sub.items.data[0]?.price?.id;
            const { rows: planRows } = await query(
              'SELECT id FROM billing_plans WHERE stripe_price_id=$1 OR stripe_price_id_yearly=$1 LIMIT 1',
              [priceId]
            );
            const plan = planRows[0]?.id || 'professional';
            await upsertSubscription(tenantId, {
              plan,
              status: sub.status,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              current_period_start: new Date(sub.current_period_start * 1000),
              current_period_end: new Date(sub.current_period_end * 1000),
            });
            break;
          }

          case 'invoice.paid': {
            const invoice = event.data.object;
            const sub = await stripe.subscriptions.retrieve(invoice.subscription);
            const tenantId = sub.metadata?.tenant_id;
            if (!tenantId) break;
            const priceId = sub.items.data[0]?.price?.id;
            const { rows: planRows } = await query(
              'SELECT id FROM billing_plans WHERE stripe_price_id=$1 OR stripe_price_id_yearly=$1 LIMIT 1',
              [priceId]
            );
            const plan = planRows[0]?.id || 'professional';
            await upsertSubscription(tenantId, {
              plan,
              status: 'active',
              stripe_customer_id: invoice.customer,
              stripe_subscription_id: invoice.subscription,
              current_period_start: new Date(sub.current_period_start * 1000),
              current_period_end: new Date(sub.current_period_end * 1000),
            });
            break;
          }

          case 'customer.subscription.updated': {
            const sub = event.data.object;
            const tenantId = sub.metadata?.tenant_id;
            if (!tenantId) break;
            const priceId = sub.items.data[0]?.price?.id;
            const { rows: planRows } = await query(
              'SELECT id FROM billing_plans WHERE stripe_price_id=$1 OR stripe_price_id_yearly=$1 LIMIT 1',
              [priceId]
            );
            const plan = planRows[0]?.id || 'professional';
            await upsertSubscription(tenantId, {
              plan,
              status: sub.status,
              stripe_customer_id: sub.customer,
              stripe_subscription_id: sub.id,
              current_period_start: new Date(sub.current_period_start * 1000),
              current_period_end: new Date(sub.current_period_end * 1000),
            });
            break;
          }

          case 'customer.subscription.deleted': {
            const sub = event.data.object;
            const tenantId = sub.metadata?.tenant_id;
            if (!tenantId) break;
            await upsertSubscription(tenantId, {
              plan: 'starter',
              status: 'canceled',
              stripe_customer_id: sub.customer,
              stripe_subscription_id: sub.id,
              current_period_start: null,
              current_period_end: null,
            });
            break;
          }
        }
      } catch (err) {
        console.error('[stripe webhook]', err.message);
      }

      res.json({ received: true });
    }
  );

  // Create Checkout Session
  app.post('/api/billing/checkout', authRequired, async (req, res) => {
    try {
      const stripe = getStripe();
      const { plan_id, yearly = false } = req.body || {};
      if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

      const { rows: planRows } = await query('SELECT * FROM billing_plans WHERE id=$1 AND active=true', [plan_id]);
      if (!planRows.length) return res.status(404).json({ error: 'Plan not found' });
      const plan = planRows[0];

      const priceId = yearly ? plan.stripe_price_id_yearly : plan.stripe_price_id;
      if (!priceId) return res.status(400).json({ error: 'This plan has no Stripe price configured. Contact support.' });

      const tenantId = req.auth.tenant_id;
      const { rows: tenantRows } = await query('SELECT * FROM tenants WHERE id=$1', [tenantId]);
      const tenant = tenantRows[0];

      const customerId = await getOrCreateStripeCustomer(
        stripe, tenantId, req.auth.email, tenant?.name || req.auth.email
      );

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: { metadata: { tenant_id: tenantId } },
        metadata: { tenant_id: tenantId },
        success_url: `${FRONTEND_URL}/billing?session_id={CHECKOUT_SESSION_ID}&success=1`,
        cancel_url: `${FRONTEND_URL}/pricing?canceled=1`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('[stripe checkout]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Create Customer Portal Session
  app.post('/api/billing/portal', authRequired, async (req, res) => {
    try {
      const stripe = getStripe();
      const tenantId = req.auth.tenant_id;
      const { rows } = await query(
        'SELECT stripe_customer_id FROM subscriptions WHERE tenant_id=$1 ORDER BY id DESC LIMIT 1',
        [tenantId]
      );
      const customerId = rows[0]?.stripe_customer_id;
      if (!customerId) return res.status(404).json({ error: 'No billing account found. Subscribe to a plan first.' });

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${FRONTEND_URL}/billing`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('[stripe portal]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Get current subscription status for the logged-in tenant
  app.get('/api/billing/subscription', authRequired, async (req, res) => {
    try {
      const tenantId = req.auth.tenant_id;
      const { rows } = await query(
        'SELECT plan, status, stripe_subscription_id, current_period_end FROM subscriptions WHERE tenant_id=$1 ORDER BY id DESC LIMIT 1',
        [tenantId]
      );
      const sub = rows[0] || null;
      const { rows: tenantRows } = await query('SELECT plan FROM tenants WHERE id=$1', [tenantId]);
      res.json({
        subscription: sub,
        plan: sub?.plan || tenantRows[0]?.plan || 'starter',
        status: sub?.status || 'none',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { setupStripeRoutes };
