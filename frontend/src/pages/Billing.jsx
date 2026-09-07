import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY'];
const STANDARD = [24, 28, 20, 32, 40];
const PRO = [16, 20, 24, 28, 32];
const ENTERPRISE = [10, 12, 16, 20, 24];

const BADGE_MAP = {
  standard: { bg: 'bg-surface-container', icon: 'school', iconBg: 'bg-surface-container text-indigo-accent' },
  professional: { bg: 'bg-stem-orange/10 text-stem-orange', icon: 'rocket_launch', iconBg: 'bg-stem-orange/10 text-stem-orange' },
  enterprise: { bg: 'bg-surface-container', icon: 'corporate_fare', iconBg: 'bg-surface-container text-primary' },
};

const INVOICES = [
  { id: 'INV-2024-882', institution: 'MIT Applied Science', amount: '$4,250.00', status: 'PAID', statusClass: 'bg-green-100 text-green-700' },
  { id: 'INV-2024-881', institution: 'Stanford Robotics Lab', amount: '$1,299.00', status: 'PAID', statusClass: 'bg-green-100 text-green-700' },
  { id: 'INV-2024-880', institution: 'Global STEM Initiative', amount: '$12,400.00', status: 'PENDING', statusClass: 'bg-amber-100 text-amber-700' },
];

function FeatureList({ features }) {
  const f = typeof features === 'string' ? JSON.parse(features) : (Array.isArray(features) ? features : []);
  return (
    <ul className="space-y-4 mb-8">
      {f.map((feat, i) => {
        const text = typeof feat === 'string' ? feat : feat.text;
        const included = typeof feat === 'string' ? true : (feat.included !== false);
        const bold = typeof feat === 'string' ? false : !!feat.bold;
        return (
          <li key={i} className={`flex items-center gap-2 text-body-sm ${bold ? 'font-bold text-deep-navy' : ''}`}>
            <span className={`material-symbols-outlined text-[20px] ${included ? 'text-indigo-accent' : 'text-outline-variant'}`}>
              {included ? 'check_circle' : 'cancel'}
            </span>
            {text}
          </li>
        );
      })}
    </ul>
  );
}

const EMPTY_FORM = { name: '', price: '', description: '', featuresStr: '', popular: false };

export default function Billing() {
  const [overageOn, setOverageOn] = useState(true);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currency, setCurrency] = useState('$');
  const [currencySaving, setCurrencySaving] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadSubscription = () => {
    api.get('/billing/subscription').then(r => setSubscription(r.data)).catch(() => {});
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/billing/portal');
      window.location.href = data.url;
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not open billing portal');
    }
    setPortalLoading(false);
  };

  const loadPlans = () => {
    setLoading(true);
    api.get('/admin/plans').then(r => setPlans(r.data.plans || [])).catch(() => {}).finally(() => setLoading(false));
  };

  const loadCurrency = () => {
    api.get('/content/pricing').then(r => {
      const c = r.data?.content?.currency;
      if (c) setCurrency(c);
    }).catch(() => {});
  };

  const updateCurrency = async (sym) => {
    setCurrencySaving(true);
    setCurrency(sym);
    try {
      await api.patch('/admin/content/pricing', { content: { currency: sym } });
      toast.success('Currency set to ' + sym);
    } catch (e) {
      toast.error('Failed to update currency');
      loadCurrency();
    }
    setCurrencySaving(false);
  };

  useEffect(() => { loadPlans(); loadCurrency(); loadSubscription(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setEditingId(plan.id);
    const features = (() => {
      try {
        const f = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
        return Array.isArray(f) ? f.map(x => typeof x === 'string' ? x : (x.text || '')).join('\n') : '';
      } catch { return ''; }
    })();
    setForm({
      name: plan.name || '',
      price: plan.price !== null && plan.price !== undefined ? String(plan.price) : '',
      description: plan.description || '',
      featuresStr: features,
      popular: !!plan.popular,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Plan name is required'); return; }
    setSaving(true);
    const features = form.featuresStr.split('\n').filter(Boolean).map(t => ({ text: t.trim(), included: true }));
    const payload = {
      name: form.name,
      price: form.price ? parseInt(form.price, 10) : null,
      description: form.description,
      features,
      popular: form.popular,
    };
    try {
      if (editingId) {
        await api.patch('/admin/plans/' + editingId, payload);
        toast.success('Plan updated');
      } else {
        await api.post('/admin/plans', payload);
        toast.success('Plan created');
      }
      setShowModal(false);
      loadPlans();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save plan');
    }
    setSaving(false);
  };

  const handleDeactivate = async (plan) => {
    try {
      await api.patch('/admin/plans/' + plan.id, { active: !plan.active });
      toast.success(plan.active ? 'Plan deactivated' : 'Plan activated');
      loadPlans();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update plan');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete('/admin/plans/' + confirmDelete.id);
      toast.success('Plan deleted');
      setConfirmDelete(null);
      loadPlans();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete plan');
    }
  };

  return (
    <AdminLayout>
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-headline-xl text-deep-navy leading-tight">Subscription & Billing</h1>
          <p className="text-on-surface-variant mt-2 text-body-md">Manage institutional access levels, monitor revenue streams, and configure overage policies.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-deep-navy text-pure-white rounded-lg text-label-md hover:opacity-90 transition-all">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export Report
        </button>
      </header>

      {/* Live Subscription Status */}
      {subscription && (
        <div className="mb-8 bg-pure-white rounded-xl border border-outline-variant/30 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Your Subscription</p>
            <div className="flex items-center gap-3">
              <span className="text-headline-md text-deep-navy capitalize">{subscription.plan || 'Starter'}</span>
              <span className={`px-2 py-0.5 rounded-full text-label-sm font-medium ${
                subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                subscription.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                subscription.status === 'past_due' ? 'bg-amber-100 text-amber-700' :
                subscription.status === 'canceled' ? 'bg-red-100 text-red-700' :
                'bg-surface-container text-on-surface-variant'
              }`}>
                {subscription.status || 'none'}
              </span>
            </div>
            {subscription.subscription?.current_period_end && (
              <p className="text-body-sm text-on-surface-variant mt-1">
                Renews {new Date(subscription.subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/pricing'}
              className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg text-label-md hover:bg-surface-container transition-all"
            >
              Change Plan
            </button>
            {subscription.subscription?.stripe_subscription_id && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="px-4 py-2 bg-indigo-accent text-pure-white rounded-lg text-label-md hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                {portalLoading ? 'Opening...' : 'Manage Billing'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Revenue Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mb-stack-lg">
        <div className="lg:col-span-2 bg-pure-white rounded-xl p-6 border border-outline-variant/30 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-headline-md text-deep-navy">Monthly Revenue Breakdown</h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><span className="w-3 h-3 bg-indigo-accent rounded-full" /> Standard</span>
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><span className="w-3 h-3 bg-stem-orange rounded-full" /> Professional</span>
              <span className="flex items-center gap-1 text-label-sm text-on-surface-variant"><span className="w-3 h-3 bg-deep-navy rounded-full" /> Enterprise</span>
            </div>
          </div>
          <div className="flex-1 w-full h-48 flex items-end gap-4 px-4 pb-2 border-b border-outline-variant">
            {MONTHS.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col justify-end gap-1">
                <div className="w-full bg-indigo-accent rounded-t-sm" style={{ height: `${STANDARD[i]}%` }} title={`Standard: $${STANDARD[i]}k`} />
                <div className="w-full bg-stem-orange rounded-t-sm" style={{ height: `${PRO[i]}%` }} title={`Professional: $${PRO[i]}k`} />
                <div className="w-full bg-deep-navy rounded-t-sm" style={{ height: `${ENTERPRISE[i]}%` }} title={`Enterprise: $${ENTERPRISE[i]}k`} />
                <span className="text-[10px] text-center mt-2 font-medium text-on-surface-variant">{m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-deep-navy text-pure-white rounded-xl p-8 relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <h4 className="text-label-md opacity-80 uppercase tracking-widest mb-2">Current MRR</h4>
              <div className="text-headline-xl">$142,500</div>
              <div className="flex items-center gap-2 mt-2 text-green-400">
                <span className="material-symbols-outlined text-[18px]">trending_up</span>
                <span className="text-label-md">12.4% vs last month</span>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-pure-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-body-sm opacity-70">Seat Utilization</span>
                <span className="font-bold">84%</span>
              </div>
              <div className="w-full bg-pure-white/20 h-2 rounded-full overflow-hidden">
                <div className="bg-stem-orange h-full w-[84%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Plan Settings */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-headline-md text-deep-navy">Global Plan Settings</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-pure-white rounded-lg border border-outline-variant">
            <span className="text-label-sm text-on-surface-variant">Currency:</span>
            {['$', '₹'].map(sym => (
              <button
                key={sym}
                onClick={() => updateCurrency(sym)}
                disabled={currencySaving}
                className={`px-3 py-1 rounded text-label-sm font-medium transition-all ${
                  currency === sym
                    ? 'bg-deep-navy text-pure-white'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {sym} {sym === '$' ? 'USD' : 'INR'}
              </button>
            ))}
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-6 py-2.5 bg-stem-orange text-pure-white rounded-lg text-label-md hover:opacity-90 transition-all shadow-md">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Create New Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-stack-lg">
        {loading && (
          <div className="col-span-full text-center py-10 text-on-surface-variant">Loading plans...</div>
        )}
        {!loading && plans.length === 0 && (
          <div className="col-span-full text-center py-10 text-on-surface-variant">No plans yet. Click "Create New Plan" to add one.</div>
        )}
        {plans.map((plan) => {
          const badge = BADGE_MAP[plan.id] || { bg: 'bg-surface-container', icon: 'credit_card', iconBg: 'bg-surface-container text-on-surface-variant' };
          return (
            <div key={plan.id} className={`bg-pure-white p-6 rounded-xl relative overflow-hidden ${plan.popular ? 'border-2 border-stem-orange shadow-lg shadow-stem-orange/5' : 'border border-outline-variant'} ${!plan.active ? 'opacity-50' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-stem-orange text-pure-white px-4 py-1 rounded-bl-xl text-label-sm">MOST POPULAR</div>
              )}
              {!plan.active && (
                <div className="absolute top-0 left-0 bg-outline-variant text-on-surface-variant px-4 py-1 rounded-br-xl text-label-sm">INACTIVE</div>
              )}
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-lg ${badge.iconBg}`}>
                  <span className="material-symbols-outlined">{badge.icon}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-label-sm ${badge.bg}`}>{plan.name}</span>
              </div>
              <h3 className="text-headline-md text-deep-navy mb-2">
                {plan.price !== null ? `${currency}${Number(plan.price).toLocaleString()}` : 'Custom'}
                {plan.price !== null && <span className="text-body-sm font-normal text-on-surface-variant">/mo</span>}
              </h3>
              <p className="text-body-sm text-on-surface-variant mb-6">{plan.description}</p>
              <FeatureList features={plan.features} />
              <div className="flex flex-col gap-2">
                <button onClick={() => openEdit(plan)} className={`w-full py-2 rounded-lg text-label-md transition-all ${plan.popular ? 'bg-stem-orange text-pure-white shadow-md hover:opacity-90' : 'bg-deep-navy text-pure-white hover:opacity-90'}`}>
                  Edit Plan
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleDeactivate(plan)} className="py-2 border border-outline-variant text-on-surface-variant rounded-lg text-label-sm hover:bg-surface-container transition-all">
                    {plan.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setConfirmDelete(plan)} className="py-2 border border-error text-error rounded-lg text-label-sm hover:bg-error-container transition-all">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-pure-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-md text-deep-navy">Recent Invoices</h3>
            <button className="text-indigo-accent text-label-md hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-bg-off-white text-on-surface-variant uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Institution</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-label-md text-deep-navy">{inv.id}</td>
                    <td className="px-6 py-4 text-body-sm">{inv.institution}</td>
                    <td className="px-6 py-4 font-bold text-deep-navy">{inv.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${inv.statusClass}`}>{inv.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="material-symbols-outlined text-on-surface-variant hover:text-indigo-accent">download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-pure-white p-6 rounded-xl border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-label-md text-deep-navy">Payment Method</h4>
              <button className="text-indigo-accent text-label-sm hover:underline">Manage</button>
            </div>
            <div className="flex items-center gap-4 p-4 bg-bg-off-white rounded-lg border border-outline-variant/30">
              <div className="w-12 h-8 bg-deep-navy rounded flex items-center justify-center text-pure-white font-bold text-[10px]">VISA</div>
              <div>
                <div className="text-label-md text-deep-navy">•••• 4242</div>
                <div className="text-[10px] text-on-surface-variant">Expires 12/26</div>
              </div>
            </div>
          </div>

          <div className="bg-pure-white p-6 rounded-xl border border-outline-variant shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-label-md text-deep-navy">Automatic Overages</h4>
              <button onClick={() => setOverageOn(!overageOn)} className={`relative w-12 h-6 rounded-full transition-colors ${overageOn ? 'bg-indigo-accent' : 'bg-outline-variant'}`}>
                <div className={`absolute w-4 h-4 bg-pure-white rounded-full top-1 transition-transform ${overageOn ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="text-body-sm text-on-surface-variant">Allow institutions to exceed their seat limit. Overages are billed at 1.5x the base seat rate at the end of the month.</p>
            <div className="mt-4 p-3 bg-surface-container rounded-lg flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span className="text-[11px] font-medium">Currently affecting 12 active tenants.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-pure-white rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant">
              <h2 className="text-headline-sm text-deep-navy">{editingId ? 'Edit Plan' : 'Create New Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-bg-off-white flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1.5">Plan Name <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Gold Plus" className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1.5">Monthly Price (cents) — leave blank for "Custom"</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="e.g. 1999" className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Brief description of this plan" className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition resize-none" />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1.5">Features <span className="text-stem-orange">(one per line)</span></label>
                <textarea value={form.featuresStr} onChange={e => setForm({...form, featuresStr: e.target.value})} rows={4} placeholder="Up to 250 seats&#10;Full Lab Simulations&#10;LMS Integration" className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.popular} onChange={e => setForm({...form, popular: e.target.checked})} className="w-4 h-4 rounded border-outline-variant text-indigo-accent focus:ring-indigo-accent" />
                <span className="text-label-sm text-on-surface-variant">Mark as "Most Popular"</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-4 border-t border-outline-variant">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-label-sm font-medium border border-outline-variant rounded-lg hover:bg-bg-off-white transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 text-label-sm font-medium bg-stem-orange text-pure-white rounded-lg hover:brightness-95 disabled:opacity-50 transition">{saving ? 'Saving...' : editingId ? 'Update Plan' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setConfirmDelete(null)}>
          <div className="bg-pure-white rounded-xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-error">warning</span>
              </div>
              <h2 className="text-headline-sm text-deep-navy">Delete Plan</h2>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-2">Are you sure you want to delete <strong>{confirmDelete.name}</strong>?</p>
            <p className="text-body-sm text-error mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-5 py-2.5 text-label-sm font-medium border border-outline-variant rounded-lg hover:bg-bg-off-white transition">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 text-label-sm font-medium bg-error text-pure-white rounded-lg hover:opacity-90 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
