import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WhiteLabelHelpVideo from './WhiteLabelHelpVideo';

const SUPER_ADMIN_STEPS = [
  {
    id: 'intro',
    title: 'White-Label in 3 minutes — single page',
    desc: 'Single wizard at /white-label (/design redirects there). I will walk you through creating an institution, picking a custom domain, branding, and going live. /tenants ↔ /white-label stay in sync.',
    target: null,
    action: null,
    cta: 'Start training →',
  },
  {
    id: 'create',
    title: 'Step 1 — Create Institution',
    desc: 'Go to /tenants → click "Add New Institution". Fill Tenant Name + App Name. Choose domain mode (wizard-standard).',
    target: '[data-help="add-institution"]',
    action: { label: 'Go to /tenants', to: '/tenants' },
    tip: 'Tip: Enter the custom domain you already own (e.g. lab.school.edu). DNS setup instructions are shown inline.',
  },
  {
    id: 'domain',
    title: 'Step 2 — Choose Domain',
    desc: 'Enter your custom domain (lab.school.edu) → add 1 CNAME → {host} at your DNS provider.',
    target: '[data-help="domain-mode"]',
    action: { label: 'Open wizard', to: '/white-label' },
    tip: 'Check availability before saving. Custom domains auto-upgrade to Enterprise.',
  },
  {
    id: 'branding',
    title: 'Step 3 — Branding',
    desc: 'Upload logo (PNG/SVG, 2MB), pick Primary/Secondary + App Name. Preview is live — also visible in /design.',
    target: '[data-help="branding"]',
    action: null,
    tip: 'Preset swatches + WCAG contrast check help you match school colors.',
  },
  {
    id: 'dns',
    title: 'Step 4 — DNS (1 record)',
    desc: 'Create CNAME lab.school.edu → {target} at your DNS provider (GoDaddy, Namecheap, etc.). Propagation takes 2–5 min.',
    target: '[data-help="cname-box"]',
    action: { label: 'Verify DNS', to: null, verify: true },
    tip: 'Propagation is 2–5 min. Click Verify in wizard or /design step 1.',
  },
  {
    id: 'sync',
    title: 'Step 5 — Everything is synced (single)',
    desc: '/tenants table and single White-Label wizard (/white-label — /design redirects there) edit the same DB row (custom_domain, logo_url, colors, config). Edit anywhere, see everywhere.',
    target: null,
    action: { label: 'Open White-Label', to: '/white-label' },
    tip: 'Try: edit at /white-label?tenantId=X then reload /tenants — same values. /design now redirects to same page.',
  },
  {
    id: 'done',
    title: 'You are live!',
    desc: 'Open https://{domain} — your white-label is active. Manage users at /tenants/:id. Need help? Re-open me anytime.',
    target: null,
    action: { label: 'Open my site', external: true },
    cta: 'Finish',
  },
];

const TENANT_ADMIN_STEPS = [
  {
    id: 'intro',
    title: 'White-Label for your school',
    desc: 'Go live on your own domain. I will guide you through /white-label (3 steps) — synced with /design.',
    target: null,
    cta: 'Start →',
  },
  {
    id: 'domain',
    title: 'Step 1 — Pick your domain',
    desc: 'Enter your custom domain (lab.yourschool.edu). Add 1 CNAME record at your DNS provider pointing to this platform.',
    target: '[data-help="domain-mode"]',
    action: { label: 'Open wizard', to: '/white-label' },
  },
  {
    id: 'branding',
    title: 'Step 2 — Branding',
    desc: 'Upload logo, set colors + app name. Preview updates live.',
    target: '[data-help="branding"]',
    action: null,
  },
  {
    id: 'verify',
    title: 'Step 3 — Verify & Go Live',
    desc: 'Click Verify. Once DNS propagates, open https://{domain}. Your login page will show your logo/headline.',
    target: '[data-help="cname-box"]',
    action: { label: 'Verify now', to: null, verify: true },
  },
  {
    id: 'done',
    title: 'Done!',
    desc: 'Your portal is live. Edit anytime at /white-label or /design — they stay in sync.',
    target: null,
    cta: 'Finish',
  },
];

export default function WhiteLabelHelpBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = user?.role === 'Super Admin';
  const steps = SUPER_ADMIN_STEPS;

  const [open, setOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const btnRef = useRef(null);

  // help stays closed by default — user clicks floating button to open (no auto-open)
  useEffect(() => {
    // previously auto-opened after 1200ms; now disabled per request: keep closed until user clicks
    // if (!isSuperAdmin) return;
    // const key = `wl-help-seen-${user?.id || 'anon'}`;
    // if (!localStorage.getItem(key) && (location.pathname.includes('tenants') || location.pathname.includes('white-label') || location.pathname.includes('design'))) {
    //   const t = setTimeout(()=> setOpen(true), 1200);
    //   return ()=> clearTimeout(t);
    // }
  }, [location.pathname, isSuperAdmin, user?.id]);

  const current = steps[idx] || steps[0];

  // highlight target
  useEffect(() => {
    if (!tourActive || !current?.target) { setHighlightRect(null); return; }
    const el = document.querySelector(current.target);
    if (!el) { setHighlightRect(null); return; }
    const rect = el.getBoundingClientRect();
    setHighlightRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [tourActive, idx, current?.target, open]);

  if (!isSuperAdmin) return null;

  const startTour = () => { setTourActive(true); setIdx(0); setOpen(true); localStorage.setItem(`wl-help-seen-${user?.id||'anon'}`, '1'); };
  const next = () => {
    if (idx < steps.length - 1) setIdx(i=>i+1);
    else { setTourActive(false); setIdx(0); setOpen(false); }
  };
  const prev = () => setIdx(i=> Math.max(0, i-1));
  const handleAction = () => {
    if (current.action?.to) navigate(current.action.to);
    if (current.action?.verify) {
      // trigger verify button if exists
      const btn = document.querySelector('[data-help="verify-btn"]');
      if (btn) btn.click();
    }
    if (current.action?.external) {
      const domain = document.querySelector('[data-help="domain-preview"]')?.textContent || '';
      if (domain) window.open(`https://${domain.trim()}`, '_blank');
    }
  };

  return (
    <>
      {/* Highlight overlay */}
      {tourActive && highlightRect && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] pointer-events-none" />
          <div className="fixed z-[61] rounded-xl border-2 border-indigo-accent shadow-xl pointer-events-none transition-all duration-200"
            style={{ top: highlightRect.top - 4, left: highlightRect.left - 4, width: highlightRect.width + 8, height: highlightRect.height + 8 }} />
        </>
      )}

      {/* Floating button */}
      <button
        ref={btnRef}
        onClick={()=> setOpen(o=>!o)}
        className="fixed bottom-6 right-6 z-[70] w-14 h-14 rounded-full bg-deep-navy text-white shadow-xl flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
        aria-label="White-label help"
      >
        <span className="material-symbols-outlined text-[26px]">{open ? 'close' : 'help'}</span>
        {!open && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white" />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[70] w-[360px] max-w-[92vw] bg-pure-white rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-deep-navy text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><span className="material-symbols-outlined">support_agent</span></div>
              <div>
                <p className="text-label-md font-bold leading-none">White-Label Bot</p>
                <p className="text-body-sm text-white/70 leading-none mt-0.5">Super Admin only</p>
              </div>
            </div>
            <button onClick={()=>setOpen(false)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">close</span></button>
          </div>

          {/* Progress */}
          {tourActive && (
            <div className="px-5 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-label-sm text-on-surface-variant">Step {idx+1} of {steps.length}</span>
                <span className="text-label-sm text-indigo-accent font-bold">{Math.round(((idx+1)/steps.length)*100)}%</span>
              </div>
              <div className="h-1.5 bg-outline-variant/20 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-accent transition-all" style={{width: `${((idx+1)/steps.length)*100}%`}} />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-5 py-5 flex-1 overflow-y-auto">
            {!tourActive ? (
              <div className="space-y-4">
                <h3 className="text-headline-sm text-deep-navy">Need help with white-label?</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  I will walk you through the full white-label setup — from <span className="font-bold">/tenants</span> to DNS to branding. Everything stays synced between <span className="font-mono">/tenants</span> and <span className="font-mono">/white-label</span> ( <span className="font-mono">/design</span> redirects there).
                </p>
                <div className="bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl p-3">
                  <p className="text-label-sm text-indigo-accent font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">info</span> What you will do</p>
                  <ul className="mt-2 space-y-1 text-body-sm text-on-surface-variant list-disc list-inside">
                    <li>Create / pick an institution</li>
                    <li>Enter your custom domain</li>
                    <li>Upload logo + colors</li>
                    <li>Add 1 CNAME & verify</li>
                  </ul>
                </div>
                <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3">
                  <p className="text-label-sm text-deep-navy font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">description</span> Help documents — all Super Admin tabs (HTML)</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button onClick={()=>navigate('/docs/super-admin')} className="py-2 px-3 bg-deep-navy text-white border border-deep-navy rounded-lg text-label-sm text-left flex items-center gap-1 col-span-2"><span className="material-symbols-outlined text-[16px]">menu_book</span> All Tabs — HTML hub</button>
                    <button onClick={()=>navigate('/docs/white-label')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">article</span> White-Label</button>
                    <button onClick={()=>navigate('/docs/tenants')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">domain</span> Tenants</button>
                    <button onClick={()=>navigate('/docs/dashboard')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">monitoring</span> Dashboard</button>
                    <button onClick={()=>navigate('/docs/users')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">group</span> Users</button>
                    <button onClick={()=>navigate('/docs/roles')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">security</span> Roles</button>
                    <button onClick={()=>navigate('/docs/audit')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">history</span> Audit</button>
                    <button onClick={()=>navigate('/docs/pricing')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">sell</span> Pricing</button>
                    <button onClick={()=>navigate('/docs/billing')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">payments</span> Billing</button>
                    <button onClick={()=>navigate('/docs/api')} className="py-2 px-3 bg-pure-white border border-outline-variant rounded-lg text-label-sm hover:border-indigo-accent text-left flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">api</span> API</button>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-2">Every Super Admin tab has HTML docs — also at <span className="font-mono">/docs/SUPER_ADMIN_GUIDE.html</span> (single HTML hub, Super Admin only).</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={startTour} className="py-3 bg-indigo-accent text-white rounded-xl font-bold hover:brightness-95 flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[18px]">play_arrow</span> Start tour</button>
                  <button onClick={()=>{ setOpen(false); navigate('/white-label'); }} className="py-3 border border-outline-variant rounded-xl font-bold text-deep-navy hover:bg-surface-container-low">Open wizard</button>
                </div>
                <button onClick={()=>setShowVideo(true)} className="w-full py-3 bg-deep-navy text-white rounded-xl font-bold hover:opacity-90 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">play_circle</span> Watch 2-min setup video (all steps)
                </button>
                <div className="flex gap-2">
                  <button onClick={()=>navigate('/tenants')} className="flex-1 py-2.5 border border-outline-variant rounded-lg text-label-sm hover:bg-surface-container-low">Go to /tenants</button>
                  <button onClick={()=>navigate('/white-label')} className="flex-1 py-2.5 border border-outline-variant rounded-lg text-label-sm hover:bg-surface-container-low bg-indigo-accent/10 text-indigo-accent">Go to White-Label</button>
                </div>
                <p className="text-center text-[11px] text-on-surface-variant">Super Admin only • Not visible to Tenant Admins • /design → /white-label (single)</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-headline-sm text-deep-navy">{current.title}</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">{current.desc.replace('{host}', window.location.hostname).replace('{target}', document.querySelector('[data-help="cname-target"]')?.textContent || window.location.hostname)}</p>
                {current.tip && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-body-sm text-amber-900"><span className="font-bold">💡</span> {current.tip}</div>}
                {current.action && (
                  <button onClick={handleAction} className="w-full py-2.5 bg-deep-navy text-white rounded-lg font-bold hover:opacity-90 flex items-center justify-center gap-1">
                    {current.action.label} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
                <button onClick={()=>setShowVideo(true)} className="w-full py-2.5 border border-outline-variant rounded-lg text-label-sm font-bold text-deep-navy hover:bg-surface-container-low flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">play_circle</span> Watch video for this step
                </button>
                {/* quick jump links during tour — single white-label */}
                <div className="flex gap-2 pt-2">
                  <button onClick={()=>navigate('/tenants')} className="text-label-sm text-indigo-accent hover:underline">/tenants</button>
                  <span className="text-outline">•</span>
                  <button onClick={()=>navigate('/white-label')} className="text-label-sm text-indigo-accent hover:underline">/white-label</button>
                  <span className="text-outline">•</span>
                  <span className="text-label-sm text-on-surface-variant">/design → /white-label</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-between">
            {!tourActive ? (
              <>
                <span className="text-body-sm text-on-surface-variant">Single White-Label • /tenants ↔ /white-label</span>
                <button onClick={()=>{ localStorage.setItem(`wl-help-seen-${user?.id||'anon'}`, '1'); setOpen(false); }} className="text-label-sm text-on-surface-variant hover:text-deep-navy">Dismiss</button>
              </>
            ) : (
              <>
                <button onClick={prev} disabled={idx===0} className="px-4 py-2 rounded-lg border border-outline-variant text-label-sm disabled:opacity-30 hover:bg-white">Back</button>
                <div className="flex gap-2">
                  <button onClick={()=>{setTourActive(false); setIdx(0);}} className="px-4 py-2 rounded-lg text-label-sm text-on-surface-variant hover:bg-white">Exit</button>
                  <button onClick={next} className="px-4 py-2 rounded-lg bg-stem-orange text-white text-label-sm font-bold hover:brightness-95">{idx===steps.length-1 ? 'Finish' : (current.cta || 'Next →')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <WhiteLabelHelpVideo open={showVideo} onClose={()=>setShowVideo(false)} />
    </>
  );
}
