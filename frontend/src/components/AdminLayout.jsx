import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import WhiteLabelHelpBot from './WhiteLabelHelpBot';
import superAdminLogo from '../assets/logo/logo.png';

function initials(user) {
  const src = user?.full_name || user?.username || user?.email || '';
  return src.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || 'U';
}

export default function AdminLayout({ children, mainClassName = '' }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'Super Admin';
  const isTenantAdmin = user?.role === 'Tenant Admin';
  const canBrand = isSuperAdmin || isTenantAdmin;
  const [tenantInfo, setTenantInfo] = useState(null);

  useEffect(() => {
    // Fetch for Super Admin too - their tenant_id points at the platform's own
    // instance tenant row, so this is how they get a configurable logo/branding
    // instead of the hardcoded default.
    if (user) {
      api.get('/tenant/settings').then(r => setTenantInfo(r.data.tenant)).catch(() => {});
    }
  }, [user, isSuperAdmin]);

  const SIDEBAR = [
    { to: '/dashboard', icon: 'monitoring', label: 'Global Metrics' },
    ...(isAdmin ? [
      { to: '/users', icon: 'group', label: 'User Directory' },
      { to: '/roles', icon: 'security', label: 'Role Manager' },
      { to: '/audit', icon: 'history', label: 'System Logs' },
    ] : []),
    ...(isSuperAdmin ? [
      { to: '/tenants', icon: 'domain', label: 'Tenants' },
      { to: '/white-label', icon: 'palette', label: 'White-Label' },
      { to: '/pricing', icon: 'sell', label: 'Pricing Plans' },
      { to: '/billing', icon: 'payments', label: 'Revenue' },
    ] : []),
    { to: `/editor.html?tenant_id=${user?.tenant_id || ''}`, icon: 'code', label: 'Block Editor', external: true },
    { to: '/settings', icon: 'settings', label: 'Settings' },
  ];

  const TOPNAV = [
    { to: '/dashboard', label: 'Dashboard' },
    ...(isAdmin ? [
      { to: '/users', label: 'Users' },
      { to: '/roles', label: 'Roles' },
      { to: '/audit', label: 'Audit' },
    ] : []),
    ...(isSuperAdmin ? [
      { to: '/tenants', label: 'Institutions' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/white-label', label: 'White-Label' },
      { to: '/billing', label: 'Billing' },
    ] : []),
    { to: `/editor.html?tenant_id=${user?.tenant_id || ''}`, label: 'Editor', external: true },
  ];

  return (
    <div className="bg-bg-off-white text-on-surface min-h-screen">
      <header className="w-full top-0 sticky z-50 bg-pure-white shadow-[0_4px_12px_rgba(16,35,72,0.12)]">
        <div className="flex justify-between items-center px-margin-desktop py-4 max-w-container-max mx-auto">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              {tenantInfo?.logo_url ? (
                <img src={tenantInfo.logo_url} alt="" className="w-9 h-9 rounded-lg object-contain" />
              ) : isSuperAdmin ? (
                <img src={superAdminLogo} alt="" className="w-9 h-9 rounded-lg object-contain" />
              ) : (
                <div className="w-9 h-9 bg-deep-navy rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-pure-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>science</span>
                </div>
              )}
            </Link>
            <nav className="hidden lg:flex items-center gap-6">
              {TOPNAV.map((n) =>
                n.external ? (
                  <a
                    key={n.to}
                    href={n.to}
                    className="text-on-surface-variant text-body-md hover:text-stem-orange transition-colors"
                  >
                    {n.label}
                  </a>
                ) : (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={({ isActive }) =>
                      isActive
                        ? 'text-stem-orange font-bold border-b-2 border-stem-orange pb-1 text-body-md'
                        : 'text-on-surface-variant text-body-md hover:text-stem-orange transition-colors'
                    }
                  >
                    {n.label}
                  </NavLink>
                )
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-on-surface-variant hover:text-stem-orange transition-colors">notifications</button>
            <button className="material-symbols-outlined text-on-surface-variant hover:text-stem-orange transition-colors">settings</button>
            <div className="relative group">
              <button className="w-10 h-10 rounded-full border-2 border-indigo-accent overflow-hidden bg-deep-navy text-pure-white flex items-center justify-center font-bold text-sm">
                {initials(user)}
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-pure-white border border-outline-variant rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="px-4 py-3 border-b border-outline-variant">
                  <div className="text-label-md text-deep-navy truncate">{user?.full_name || user?.username}</div>
                  <div className="text-body-sm text-on-surface-variant truncate">{user?.email}</div>
                </div>
                <button onClick={logout} className="w-full text-left px-4 py-3 text-body-sm text-error hover:bg-surface-container-low flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">logout</span> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-container-max mx-auto min-h-[calc(100vh-80px)]">
        <aside className="h-[calc(100vh-80px)] sticky left-0 w-80 bg-pure-white shadow-[4px_0_12px_rgba(16,35,72,0.12)] hidden md:flex flex-col py-8 gap-stack-md z-40">
          <div className="px-6 mb-8">
            <div className="flex items-center gap-3">
              {tenantInfo?.logo_url ? (
                <img src={tenantInfo.logo_url} alt="" className="w-10 h-10 rounded-lg object-contain shrink-0" />
              ) : isSuperAdmin ? (
                <img src={superAdminLogo} alt="" className="w-10 h-10 rounded-lg object-contain shrink-0" />
              ) : (
                <div className="w-10 h-10 bg-indigo-accent/10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-indigo-accent">business</span>
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-headline-md font-bold text-deep-navy truncate">
                  {isSuperAdmin ? 'Super Admin' : (tenantInfo?.company_name || tenantInfo?.name || 'Admin')}
                </h2>
                <p className="text-label-sm text-on-surface-variant/70 uppercase tracking-wider truncate">
                  {isSuperAdmin ? 'Global Control Plane' : (tenantInfo?.app_name || 'Administration')}
                </p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {SIDEBAR.map((s) =>
              s.external ? (
                <a
                  key={s.to}
                  href={s.to}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all active:translate-x-0.5 duration-150 text-on-surface-variant hover:bg-indigo-accent/5 hover:text-indigo-accent"
                >
                  <span className="material-symbols-outlined">{s.icon}</span>
                  <span className="text-label-md">{s.label}</span>
                </a>
              ) : (
                <NavLink
                  key={s.to}
                  to={s.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all active:translate-x-0.5 duration-150 ${
                      isActive
                        ? 'bg-indigo-accent/10 text-indigo-accent font-bold border-r-4 border-indigo-accent'
                        : 'text-on-surface-variant hover:bg-indigo-accent/5 hover:text-indigo-accent'
                    }`
                  }
                >
                  <span className="material-symbols-outlined">{s.icon}</span>
                  <span className="text-label-md">{s.label}</span>
                </NavLink>
              )
            )}
          </nav>
          <div className="px-4 mt-auto space-y-4">
            <Link to="/tenants" className="w-full bg-stem-orange text-pure-white font-bold py-3 px-4 rounded-lg hover:brightness-90 transition-all active:scale-95 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              Provision Tenant
            </Link>
            <div className="pt-4 border-t border-outline-variant/30 space-y-1">
              {isSuperAdmin ? (
                <Link to="/docs/white-label" className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-indigo-accent transition-all">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  <span className="text-label-md">Documentation</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-indigo-accent/10 text-indigo-accent">Super Admin</span>
                </Link>
              ) : (
                <span className="flex items-center gap-3 px-4 py-2 text-on-surface-variant/40 cursor-not-allowed opacity-60" title="Documentation — Super Admin only">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  <span className="text-label-md">Documentation</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">Locked</span>
                </span>
              )}
              <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-indigo-accent transition-all" href="#">
                <span className="material-symbols-outlined text-[18px]">help</span>
                <span className="text-label-md">Support</span>
              </a>
            </div>
          </div>
        </aside>

        <main className={`flex-1 flex flex-col min-w-0 ${mainClassName}`}>
          <div className="flex-1 px-margin-desktop py-stack-md max-w-container-max mx-auto w-full">
            {children}
          </div>

          <footer className="w-full py-8 mt-stack-lg border-t border-outline-variant/30 bg-bg-off-white">
            <div className="flex flex-col md:flex-row justify-between items-center px-margin-desktop max-w-container-max mx-auto gap-4">
              <div className="flex items-center gap-2">
                <span className="text-label-sm uppercase tracking-widest text-deep-navy">STEMOS SaaS</span>
                <span className="text-on-surface-variant text-body-sm">| © 2024 All rights reserved.</span>
              </div>
              <div className="flex gap-6">
                <a className="text-body-sm text-on-surface-variant hover:text-stem-orange underline transition-all" href="#">Privacy Policy</a>
                <a className="text-body-sm text-on-surface-variant hover:text-stem-orange underline transition-all" href="#">Terms of Service</a>
                <a className="text-body-sm text-on-surface-variant hover:text-stem-orange underline transition-all" href="#">Security Compliance</a>
                <a className="text-body-sm text-on-surface-variant hover:text-stem-orange underline transition-all" href="#">API Status</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
      {/* Super Admin only: White-label help bot + video — not visible to Tenant Admin / others */}
      {isSuperAdmin && <WhiteLabelHelpBot />}
    </div>
  );
}
