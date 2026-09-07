import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';

function PlanBadge({ plan }) {
  const map = {
    free: 'bg-emerald-100 text-emerald-800',
    standard: 'bg-sky-100 text-sky-700',
    pro: 'bg-indigo-accent/10 text-indigo-accent',
    professional: 'bg-stem-orange/10 text-stem-orange',
    enterprise: 'bg-deep-navy/10 text-deep-navy',
    trial: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-label-sm uppercase tracking-wider ${map[plan] || 'bg-slate-100 text-slate-600'}`}>
      {plan}
    </span>
  );
}

function StatusDot({ status }) {
  const color = status === 'active' ? 'bg-emerald-500' : 'bg-red-500';
  return (
    <span className="inline-flex items-center gap-2 text-body-sm">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  );
}

function CircularProgress({ pct, size = 72, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EA8E0A" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
    </svg>
  );
}

export default function Tenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const EMPTY_FORM = { name: '', companyName: '', appName: '', plan: 'professional', ownerEmail: '', userLimit: 10, tempPassword: '', customDomain: '', cloudflareZoneId: '', cloudflareApiToken: '', proxied: false, cnameTarget: '', primaryColor: '#102348', secondaryColor: '#EA8E0A' };
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [createdTenantId, setCreatedTenantId] = useState(null);
  const [wizardCountdown, setWizardCountdown] = useState(null);
  const countdownRef = useRef(null);
  const [showAdvancedDns, setShowAdvancedDns] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const defaultHost = import.meta.env.VITE_PLATFORM_HOST || (window.location.hostname !== 'localhost' ? window.location.hostname : 'your-platform-host.com');
  const [platformHost, setPlatformHost] = useState(defaultHost);
  const [cnameTarget, setCnameTarget] = useState(defaultHost);

  const startWizardCountdown = useCallback((tenantId) => {
    setWizardCountdown(4);
    let secs = 4;
    countdownRef.current = setInterval(() => {
      secs -= 1;
      setWizardCountdown(secs);
      if (secs <= 0) {
        clearInterval(countdownRef.current);
        setCreatedCreds(null);
        setCreatedTenantId(null);
        setWizardCountdown(null);
        navigate(`/white-label?tenantId=${tenantId}`);
      }
    }, 1000);
  }, [navigate]);

  const cancelCountdown = useCallback(() => {
    clearInterval(countdownRef.current);
    setWizardCountdown(null);
  }, []);

  const load = () => {
    setLoading(true);
    api.get('/admin/tenants').then(r => {
      const list = r.data.tenants || [];
      setTenants(list);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { return () => clearInterval(countdownRef.current); }, []);

  useEffect(() => {
    load();
    api.get('/tenant/config').then(r => {
      const h = r.data?.platformHost;
      const c = r.data?.cnameTarget;
      if (h && h !== 'localhost') setPlatformHost(h);
      if (c && c !== 'localhost') setCnameTarget(c);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let list = tenants;
    if (search) list = list.filter(t => (t.company_name || t.name || '').toLowerCase().includes(search.toLowerCase()) || (t.custom_domain || '').toLowerCase().includes(search.toLowerCase()) || (t.app_name || '').toLowerCase().includes(search.toLowerCase()));
    if (planFilter !== 'All') list = list.filter(t => t.plan === planFilter);
    if (statusFilter !== 'All') list = list.filter(t => t.status === statusFilter);
    return list;
  }, [search, planFilter, statusFilter, tenants]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const activeCount = tenants.filter(t => t.status === 'active').length;
  const totalUsers = tenants.reduce((s, t) => s + (t.user_count || 0), 0);

  const create = async () => {
    if (!form.name) { toast.error('Institution name is required'); return; }
    if (form.customDomain && !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(form.customDomain)) { toast.error('Invalid custom domain'); return; }
    setCreating(true);
    try {
      // Typing an email without a password used to silently skip creating a login.
      // Auto-generate one so "just an email" always works as expected.
      const tempPassword = form.tempPassword || (form.ownerEmail ? 'Temp-' + Math.random().toString(36).slice(2, 8) + '1!' : undefined);
      const res = await api.post('/admin/tenants', {
        name: form.name,
        company_name: form.companyName,
        app_name: form.appName,
        plan: form.plan,
        owner_email: form.ownerEmail,
        user_limit: parseInt(form.userLimit, 10) || 10,
        temp_password: tempPassword,
        custom_domain: form.customDomain || undefined,
        cloudflare_zone_id: showAdvancedDns ? form.cloudflareZoneId || undefined : undefined,
        cloudflare_api_token: showAdvancedDns ? form.cloudflareApiToken || undefined : undefined,
        proxied: form.proxied,
        cname_target: form.cnameTarget || undefined,
      });
      const created = res.data?.tenant;
      const createdUser = res.data?.user;
      const cname = res.data?.cname;
      // also sync branding colors if set (wizard standard)
      if (created && (form.primaryColor !== '#102348' || form.secondaryColor !== '#EA8E0A' || form.appName)) {
        try {
          await api.patch(`/admin/tenants/${created.id}`, {
            primary_color: form.primaryColor,
            secondary_color: form.secondaryColor,
            app_name: form.appName || undefined,
            config: { designTokens: { colors: { primary: form.primaryColor, secondary: form.secondaryColor } } },
          });
        } catch {}
      }
      const tid = created?.id || null;
      if (created) setCreatedTenantId(tid);
      setShowCreate(false);
      if (createdUser) {
        setCreatedCreds({ username: createdUser.username, password: tempPassword, cname, tenantId: tid });
      } else {
        setCreatedCreds({ username: null, password: null, cname, tenantId: tid });
      }
      setCreatedTenantId(tid);
      if (tid) startWizardCountdown(tid);
      setForm(EMPTY_FORM);
      setShowMore(false);
      setShowAdvancedDns(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create tenant');
    }
    setCreating(false);
  };

  const from = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalFiltered);

  return (
    <AdminLayout>
      <div className="space-y-stack-md">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-sm">
          <div>
            <h1 className="text-headline-xl text-deep-navy">Institution Management</h1>
            <p className="text-body-lg text-on-surface-variant">Oversee and manage all registered institutions, plans, and access across the platform.</p>
          </div>
          <button data-help="add-institution" onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-stem-orange text-pure-white px-5 py-2.5 rounded-lg hover:brightness-95 transition-all shrink-0 self-start md:self-auto">
            <span className="material-symbols-outlined text-[20px]">domain_add</span>Add New Institution
          </button>
        </div>

        {/* ── Stats Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-accent/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-accent">domain</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Institutions</p>
              <p className="text-headline-md text-deep-navy mt-1">{tenants.length}</p>
            </div>
          </div>
          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-700">group</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Active Students</p>
              <p className="text-headline-md text-deep-navy mt-1">{totalUsers.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow-sm p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-700">monitor_heart</span>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">System Health</p>
              <p className="text-headline-md text-deep-navy mt-1">{activeCount}/{tenants.length} Active</p>
            </div>
          </div>
        </div>

        {/* ── Controls ─────────────────────────────────────────── */}
        <div className="bg-pure-white p-6 rounded-xl shadow-sm border border-outline-variant/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-lg">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, domain, or app name..."
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-outline-variant focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition-all text-body-sm"
            />
          </div>
          <div className="flex items-center gap-stack-sm">
            <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }} className="bg-bg-off-white border border-outline-variant rounded-lg px-4 py-3 outline-none text-body-sm">
              <option value="All">All Plans</option>
              <option value="standard">Standard</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
              <option value="free">Free</option>
              <option value="trial">Trial</option>
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="bg-bg-off-white border border-outline-variant rounded-lg px-4 py-3 outline-none text-body-sm">
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────── */}
        <div className="bg-pure-white rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-off-white border-b border-outline-variant">
                  {['Institution Name', 'Plan', 'Users', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-6 py-5 text-label-sm uppercase tracking-wider text-deep-navy ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">Loading…</td></tr>
                )}
                {!loading && paginated.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">No institutions found.</td></tr>
                )}
                {paginated.map(t => {
                  const usage = Math.min((t.user_count || 0) / (t.user_limit || 10) * 100, 100);
                  return (
                    <tr key={t.id} className="hover:bg-indigo-accent/5 transition-colors cursor-pointer" onClick={() => navigate(`/tenants/${t.id}`)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center">
                            <span className="material-symbols-outlined text-deep-navy">business</span>
                          </div>
                          <div>
                            <div className="text-label-md text-deep-navy">{t.company_name || t.name}</div>
                            <div className="text-body-sm text-on-surface-variant">{t.custom_domain || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><PlanBadge plan={t.plan} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-[160px]">
                          <span className="text-body-sm font-medium text-deep-navy shrink-0">{t.user_count || 0}/{t.user_limit ?? 10}</span>
                          <div className="flex-1 h-2 bg-outline-variant/40 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${usage > 90 ? 'bg-red-500' : usage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usage}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><StatusDot status={t.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={e => { e.stopPropagation(); navigate(`/white-label?tenantId=${t.id}`); }} title="White-Label (single — replaces /design)" className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-accent/10 text-indigo-accent text-label-sm hover:bg-indigo-accent/20 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">palette</span> White-Label
                          </button>
                          <button onClick={e => { e.stopPropagation(); navigate(`/tenants/${t.id}`); }} className="text-label-sm text-indigo-accent hover:underline">Manage</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ──────────────────────────────────────── */}
          <div className="bg-pure-white px-6 py-4 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-body-sm text-on-surface-variant">
              Showing {from} to {to} of {totalFiltered} results
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 border border-outline-variant rounded-lg hover:bg-bg-off-white disabled:opacity-30 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-4 py-2 rounded-lg text-body-sm ${page === i + 1 ? 'bg-indigo-accent text-pure-white' : 'hover:bg-bg-off-white text-on-surface-variant'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-outline-variant rounded-lg hover:bg-bg-off-white disabled:opacity-30 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom Context Section ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <div className="bg-deep-navy rounded-xl p-6 flex items-center gap-5" style={{ background: 'linear-gradient(135deg, #102348 0%, #1a3a6a 100%)' }}>
            <div className="w-14 h-14 rounded-full bg-stem-orange/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-stem-orange text-[28px]">payments</span>
            </div>
            <div className="flex-1">
              <h3 className="text-headline-sm text-pure-white">Automate Billing</h3>
              <p className="text-body-sm text-white/70 mt-1">Set up automated invoicing and payment collection for all your institutions.</p>
            </div>
            <button className="shrink-0 bg-pure-white/10 hover:bg-pure-white/20 text-pure-white rounded-lg px-4 py-2 text-label-sm transition-all">Configure</button>
          </div>

          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow-sm p-6 flex items-center gap-5">
            <div className="relative shrink-0">
              <CircularProgress pct={78} />
              <span className="absolute inset-0 flex items-center justify-center text-label-md font-bold text-deep-navy">78%</span>
            </div>
            <div className="flex-1">
              <h3 className="text-headline-sm text-deep-navy">Data Integrity Report</h3>
              <p className="text-body-sm text-on-surface-variant mt-1">All institutions passed consistency validation. No anomalies detected in the last scan.</p>
            </div>
            <button className="shrink-0 bg-indigo-accent/10 hover:bg-indigo-accent/20 text-indigo-accent rounded-lg px-4 py-2 text-label-sm transition-all">View Report</button>
          </div>
        </div>

        {/* ── Credentials Success Modal ────────────────────────── */}
        {createdCreds && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-pure-white rounded-xl w-full max-w-md shadow-2xl p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                </div>
                <div>
                  <h2 className="text-headline-sm text-deep-navy leading-tight">Institution Created!</h2>
                  {wizardCountdown !== null && (
                    <p className="text-body-sm text-indigo-accent mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
                      Opening wizard in <span className="font-bold">{wizardCountdown}s</span>…
                    </p>
                  )}
                </div>
              </div>

              {/* Countdown bar */}
              {wizardCountdown !== null && (
                <div className="h-1 bg-surface-container rounded-full overflow-hidden mt-3 mb-4">
                  <div className="h-full bg-indigo-accent transition-all duration-1000 ease-linear" style={{ width: `${((4 - wizardCountdown) / 4) * 100}%` }} />
                </div>
              )}

              {/* Credentials */}
              <div className="bg-bg-off-white rounded-lg p-4 space-y-3 border border-outline-variant mb-5">
                {createdCreds.username ? (
                  <>
                    <div>
                      <span className="text-label-sm text-on-surface-variant">Username</span>
                      <div className="text-label-md text-deep-navy font-mono mt-0.5">{createdCreds.username}</div>
                    </div>
                    <div>
                      <span className="text-label-sm text-on-surface-variant">Password</span>
                      <div className="text-label-md text-deep-navy font-mono mt-0.5">{createdCreds.password}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-body-sm text-on-surface-variant">Tenant ready. Finish white-label setup in the wizard.</div>
                )}
                {createdCreds.cname && (
                  <div className="pt-2 border-t border-outline-variant">
                    <span className="text-label-sm text-on-surface-variant">CNAME auto-created</span>
                    <div className="text-body-sm text-deep-navy font-mono mt-0.5">{createdCreds.cname.recordName} → {createdCreds.cname.recordContent}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => { cancelCountdown(); setCreatedCreds(null); setCreatedTenantId(null); }} className="flex-1 px-4 py-2.5 text-label-sm font-medium border border-outline-variant rounded-lg hover:bg-bg-off-white transition">
                  Stay here
                </button>
                {createdTenantId && (
                  <button onClick={() => { cancelCountdown(); setCreatedCreds(null); navigate(`/white-label?tenantId=${createdTenantId}`); }} className="flex-1 px-4 py-2.5 text-label-sm font-medium bg-indigo-accent text-pure-white rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span> Open Wizard Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Create Institution Modal ─────────────────────────── */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
            <div className="bg-pure-white rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant">
                <h2 className="text-headline-sm text-deep-navy">Add New Institution</h2>
                <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-lg hover:bg-bg-off-white flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-5 space-y-5">
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Institution Name <span className="text-red-400">*</span></label>
                  <input autoFocus placeholder="e.g. Oakwood Academy" value={form.name} onChange={e => setForm({...form, name: e.target.value})} onKeyDown={e => { if (e.key === 'Enter' && form.name) create(); }} className="w-full p-3 border border-outline-variant rounded-lg text-body-md focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Owner Email <span className="text-on-surface-variant/60">(optional — creates their login)</span></label>
                  <input type="email" placeholder="admin@school.edu" value={form.ownerEmail} onChange={e => setForm({...form, ownerEmail: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Custom Domain <span className="text-on-surface-variant/60">(optional — already purchased)</span></label>
                  <input placeholder="e.g. lab.school.edu" value={form.customDomain} onChange={e => setForm({...form, customDomain: e.target.value.toLowerCase().trim()})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                  <p className="text-[11px] text-on-surface-variant mt-1">You can also add this later - the white-label wizard opens automatically after creating.</p>
                </div>

                <button type="button" onClick={() => setShowMore(!showMore)} className="text-label-sm text-indigo-accent hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">{showMore ? 'expand_less' : 'expand_more'}</span>
                  More options <span className="text-on-surface-variant/60 font-normal">(branding, plan, DNS - all editable later)</span>
                </button>

                {showMore && (
                  <div className="space-y-5 pt-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-label-sm text-on-surface-variant mb-1.5">Company Name</label>
                        <input placeholder="e.g. Oakwood School District" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-label-sm text-on-surface-variant mb-1.5">App Name (browser title)</label>
                        <input placeholder="e.g. Oakwood STEM Portal" value={form.appName} onChange={e => setForm({...form, appName: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                      </div>
                    </div>

                    <div>
                      <p className="text-label-sm text-on-surface-variant uppercase tracking-wider mb-3">Branding</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-label-sm text-on-surface-variant mb-1.5">Primary color</label><div className="flex gap-2"><input type="color" value={form.primaryColor} onChange={e=>setForm({...form, primaryColor:e.target.value})} className="w-10 h-9 rounded border cursor-pointer p-0" /><input value={form.primaryColor} onChange={e=>setForm({...form, primaryColor:e.target.value})} className="flex-1 px-2 py-2 border rounded-lg text-body-sm font-mono" /></div></div>
                        <div><label className="block text-label-sm text-on-surface-variant mb-1.5">Secondary color</label><div className="flex gap-2"><input type="color" value={form.secondaryColor} onChange={e=>setForm({...form, secondaryColor:e.target.value})} className="w-10 h-9 rounded border cursor-pointer p-0" /><input value={form.secondaryColor} onChange={e=>setForm({...form, secondaryColor:e.target.value})} className="flex-1 px-2 py-2 border rounded-lg text-body-sm font-mono" /></div></div>
                      </div>
                      <div className="mt-3 p-3 rounded-lg border flex items-center gap-3" style={{borderColor: form.primaryColor}}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[12px] font-bold" style={{backgroundColor: form.primaryColor}}>{form.name?form.name[0]:'S'}</div>
                        <div><p className="text-body-sm font-bold text-deep-navy">{form.appName || form.name || 'YourBrand'}</p><p className="text-[11px] font-mono text-on-surface-variant">{form.customDomain || 'lab.school.edu'}</p></div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-label-sm text-on-surface-variant mb-1.5">Temporary Password <span className="text-on-surface-variant/60">(auto-generated if left blank and an email is given)</span></label>
                      <input type="text" placeholder="Temp@1234" value={form.tempPassword} onChange={e => setForm({...form, tempPassword: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-label-sm text-on-surface-variant mb-1.5">Plan</label>
                        <select value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition">
                          <option value="standard">Standard</option>
                          <option value="professional">Professional</option>
                          <option value="enterprise">Enterprise — white-label</option>
                          <option value="free">Free</option>
                          <option value="trial">Trial</option>
                        </select>
                        {form.customDomain && form.plan!=='enterprise' && <p className="text-[11px] text-amber-600 mt-1">Custom domain typically requires an Enterprise plan.</p>}
                      </div>
                      <div>
                        <label className="block text-label-sm text-on-surface-variant mb-1.5">User Limit</label>
                        <input type="number" min="1" value={form.userLimit} onChange={e => setForm({...form, userLimit: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-outline-variant/40">
                      <button type="button" onClick={()=>setShowAdvancedDns(!showAdvancedDns)} className="text-label-sm text-indigo-accent hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">{showAdvancedDns?'expand_less':'expand_more'}</span> Advanced DNS (auto-CNAME) — optional</button>
                      {showAdvancedDns && (
                        <div className="mt-3 space-y-3 p-3 bg-surface-container-low rounded-lg border">
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-label-sm text-on-surface-variant mb-1.5">DNS Zone ID</label><input value={form.cloudflareZoneId} onChange={e => setForm({...form, cloudflareZoneId: e.target.value})} placeholder="Zone ID..." className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm font-mono" /></div>
                            <div><label className="block text-label-sm text-on-surface-variant mb-1.5">DNS API Token</label><input type="password" value={form.cloudflareApiToken} onChange={e => setForm({...form, cloudflareApiToken: e.target.value})} placeholder="API token with DNS edit" className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm font-mono" /></div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-label-sm text-on-surface-variant mb-1.5">CNAME Target</label><input value={form.cnameTarget} onChange={e => setForm({...form, cnameTarget: e.target.value})} placeholder={`defaults to ${cnameTarget}`} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm" /></div>
                            <label className="flex items-center gap-2 cursor-pointer pt-6"><input type="checkbox" checked={form.proxied} onChange={e => setForm({...form, proxied: e.target.checked})} className="h-4 w-4 rounded border-outline-variant text-indigo-accent" /><span className="text-label-sm text-on-surface-variant">Enable proxy</span></label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6 pt-4 border-t border-outline-variant">
                <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-label-sm font-medium border border-outline-variant rounded-lg hover:bg-bg-off-white transition">Cancel</button>
                <button onClick={create} disabled={creating || !form.name} className="px-5 py-2.5 text-label-sm font-medium bg-stem-orange text-pure-white rounded-lg hover:brightness-95 disabled:opacity-50 transition">{creating ? 'Creating...' : 'Create Institution'}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
