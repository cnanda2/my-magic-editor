import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';

const SUPER_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'monitoring', to: '/dashboard' },
  { id: 'users', label: 'Users', icon: 'group', to: '/users' },
  { id: 'roles', label: 'Roles', icon: 'security', to: '/roles' },
  { id: 'audit', label: 'Audit', icon: 'history', to: '/audit' },
  { id: 'tenants', label: 'Tenants', icon: 'domain', to: '/tenants' },
  { id: 'white-label', label: 'White-Label', icon: 'palette', to: '/white-label' },
  { id: 'pricing', label: 'Pricing', icon: 'sell', to: '/pricing' },
  { id: 'billing', label: 'Billing', icon: 'payments', to: '/billing' },
  { id: 'settings', label: 'Settings', icon: 'settings', to: '/settings' },
];

const DOCS = {
  'white-label': { file: '/docs/WHITE_LABEL.md', title: 'White-Label', desc: 'Domain, branding, DNS — single wizard ( /design → /white-label )' },
  'dashboard': { file: '/docs/DASHBOARD.md', title: 'Dashboard', desc: 'Global Metrics — Super Admin' },
  'users': { file: '/docs/USERS.md', title: 'Users', desc: 'User Directory' },
  'roles': { file: '/docs/ROLES.md', title: 'Roles', desc: 'Role Manager' },
  'audit': { file: '/docs/AUDIT.md', title: 'Audit', desc: 'System Logs' },
  'tenants': { file: '/docs/TENANTS_DOC.md', title: 'Tenants', desc: 'Institution Management — wizard-standard' },
  'pricing': { file: '/docs/PRICING.md', title: 'Pricing', desc: 'Pricing Plans' },
  'billing': { file: '/docs/BILLING.md', title: 'Billing', desc: 'Revenue' },
  'settings': { file: '/docs/SETTINGS.md', title: 'Settings', desc: 'Global & tenant settings' },
  'api': { file: '/docs/API.md', title: 'API', desc: 'REST & Socket.io' },
  'deployment': { file: '/docs/DEPLOYMENT.md', title: 'Deployment', desc: 'Env, platform host, DB' },
  'installation': { file: '/docs/INSTALLATION.md', title: 'Installation', desc: 'Local dev setup' },
  'super-admin': { file: '/docs/SUPER_ADMIN_GUIDE.html', title: 'All Tabs (HTML)', desc: 'Single HTML hub for every Super Admin tab', isHtml: true },
};

export default function Documentation() {
  const { id } = useParams();
  const key = id || 'super-admin';
  const meta = DOCS[key] || DOCS['white-label'];
  const [md, setMd] = useState('Loading…');
  const [err, setErr] = useState(null);
  const isHtml = meta.isHtml;

  useEffect(() => {
    if (isHtml) return;
    fetch(meta.file)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.text(); })
      .then(setMd)
      .catch(e => setErr(e.message));
  }, [meta.file, isHtml]);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-4">
          <Link to="/tenants" className="hover:text-stem-orange">Tenants</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-deep-navy font-bold">Documentation</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface-variant">{meta.title}</span>
        </nav>

        <div className="bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl p-3 mb-6 flex flex-wrap items-center gap-2 text-body-sm">
          <span className="material-symbols-outlined text-indigo-accent text-[18px]">verified</span>
          <span className="text-deep-navy font-bold">Super Admin only</span>
          <span className="text-on-surface-variant">All tabs have HTML docs — synced wizard: /tenants ↔ /white-label ↔ /design</span>
          <a href="/docs/SUPER_ADMIN_GUIDE.html" target="_blank" rel="noreferrer" className="ml-auto px-3 py-1.5 bg-deep-navy text-white rounded-lg text-label-sm font-bold">Open HTML hub</a>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link to="/docs/super-admin" className={`px-3 py-1.5 rounded-full text-label-sm border ${key==='super-admin' ? 'bg-deep-navy text-white border-deep-navy' : 'bg-pure-white border-outline-variant text-on-surface-variant hover:border-indigo-accent'}`}>All Tabs (HTML)</Link>
          {SUPER_TABS.map(t=> (
            <Link key={t.id} to={`/docs/${t.id}`} className={`px-2.5 py-1.5 rounded-full text-label-sm border flex items-center gap-1 ${key===t.id ? 'bg-indigo-accent text-white border-indigo-accent' : 'bg-pure-white border-outline-variant text-on-surface-variant hover:border-indigo-accent'}`}>
              <span className="material-symbols-outlined text-[14px]">{t.icon}</span> {t.label}
            </Link>
          ))}
          <div className="w-px h-6 bg-outline-variant self-center mx-1" />
          {['white-label','api','deployment','installation'].map(k=> {
            const v = DOCS[k];
            return <Link key={k} to={`/docs/${k}`} className={`px-2.5 py-1.5 rounded-full text-label-sm border ${key===k ? 'bg-deep-navy text-white border-deep-navy' : 'bg-pure-white border-outline-variant text-on-surface-variant hover:border-indigo-accent'}`}>{v.title}</Link>
          })}
        </div>

        {isHtml ? (
          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow overflow-hidden">
            <div className="bg-deep-navy text-white px-4 py-2 flex items-center justify-between">
              <span className="text-label-sm font-bold">All Tabs — HTML view (Super Admin)</span>
              <a href="/docs/SUPER_ADMIN_GUIDE.html" target="_blank" rel="noreferrer" className="text-body-sm text-white/80 hover:text-white underline">Open full HTML</a>
            </div>
            <iframe src="/docs/SUPER_ADMIN_GUIDE.html" title="Super Admin Guide" className="w-full h-[75vh] border-0" />
          </div>
        ) : (
        <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-headline-md text-deep-navy">{meta.title}</h1>
              <p className="text-body-sm text-on-surface-variant mt-1">{meta.desc} — Super Admin only help, linked from bot & video.</p>
            </div>
            {SUPER_TABS.find(t=>t.id===key) && <Link to={SUPER_TABS.find(t=>t.id===key).to} className="shrink-0 px-3 py-1.5 bg-indigo-accent text-white rounded-lg text-label-sm font-bold">Go to tab</Link>}
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/20">
            {err ? (
              <div className="text-body-sm text-red-600">Failed to load {meta.file}: {err}. Try opening <a className="underline text-indigo-accent" href={meta.file} target="_blank" rel="noreferrer">{meta.file}</a> directly.</div>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-body-sm leading-relaxed font-mono text-deep-navy bg-surface-container-low rounded-lg p-4 overflow-auto max-h-[70vh]">
                {md}
              </pre>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/white-label" className="px-4 py-2 rounded-lg bg-indigo-accent text-white text-label-sm font-bold">Open wizard</Link>
            <Link to="/tenants" className="px-4 py-2 rounded-lg border border-outline-variant text-label-sm">Go to /tenants</Link>
            <a href={meta.file} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-outline-variant text-label-sm">View raw MD</a>
            <a href="/docs/SUPER_ADMIN_GUIDE.html" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-outline-variant text-label-sm">All tabs HTML</a>
          </div>
        </div>
        )}
      </div>
    </AdminLayout>
  );
}
