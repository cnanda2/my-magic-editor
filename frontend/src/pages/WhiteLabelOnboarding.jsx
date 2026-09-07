import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function WhiteLabelOnboarding() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [searchParams] = useSearchParams();
  const tenantIdParam = searchParams.get('tenantId') || searchParams.get('tenant') || searchParams.get('id');
  const [step, setStep] = useState(1);
  const defaultHost = import.meta.env.VITE_PLATFORM_HOST || (window.location.hostname !== 'localhost' ? window.location.hostname : '');
  const [platformHost, setPlatformHost] = useState(defaultHost);
  const [cnameTarget, setCnameTarget] = useState(defaultHost);
  const [customDomain, setCustomDomain] = useState('');
  const [appName, setAppName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#102348');
  const [secondaryColor, setSecondaryColor] = useState('#EA8E0A');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef(null);
  const [tenant, setTenant] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [allTenants, setAllTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(tenantIdParam || '');
  const fileRef = useRef(null);

  const loadTenantIntoForm = (t) => {
    if (!t) return;
    setTenant(t);
    setAppName(t.app_name || t.name || '');
    setLogoUrl(t.logo_url || '');
    // Always reset every field to the newly-selected tenant's actual values (falling
    // back to the default when unset) - leaving a stale value from whichever tenant
    // was previously loaded risks saving it onto the WRONG tenant.
    setPrimaryColor(t.primary_color || '#102348');
    setSecondaryColor(t.secondary_color || '#EA8E0A');
    setCustomDomain(t.custom_domain || '');
  };

  useEffect(() => {
    (async () => {
      try {
        const cfg = await api.get('/tenant/config');
        const ph = cfg.data?.platformHost;
        const ct = cfg.data?.cnameTarget || ph;
        if (ph && ph !== 'localhost') setPlatformHost(ph);
        if (ct && ct !== 'localhost') setCnameTarget(ct);
        if (!isSuperAdmin) {
          const r = await api.get('/tenant/settings');
          loadTenantIntoForm(r.data.tenant);
        } else {
          // super admin: load tenant list and optionally selected tenant
          const r = await api.get('/admin/tenants');
          const list = r.data.tenants || [];
          setAllTenants(list);
          const targetId = tenantIdParam || (list[0]?.id || '');
          if (targetId) {
            setSelectedTenantId(targetId);
            try {
              const tr = await api.get(`/admin/tenants/${targetId}`);
              loadTenantIntoForm(tr.data.tenant);
            } catch {}
          }
        }
      } catch {}
    })();
  }, [isSuperAdmin, tenantIdParam]);

  const checkAvailability = async () => {
    const domain = customDomain;
    if (!domain) return;
    try {
      const q = `domain=${encodeURIComponent(domain)}`;
      const { data } = await api.get(`/tenant/check-availability?${q}`);
      setAvailability(data);
      if (data.available) toast.success('Domain available!');
      else toast.error(data.reason || 'Already taken');
    } catch (e) { toast.error(e.response?.data?.error || 'Check failed'); }
  };

  const handleLogo = (e) => {
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Only images');
    if (file.size > 2*1024*1024) return toast.error('Max 2MB');
    setLogoFile(file);
    const r = new FileReader();
    r.onload = ev => setLogoPreview(ev.target.result);
    r.readAsDataURL(file);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startCnamePolling = (domain) => {
    stopPolling();
    setPollCount(0);
    setVerifying(true);
    setVerified(null);

    let attempts = 0;
    const MAX = 24; // 2 minutes at 5s intervals

    const check = async () => {
      try {
        const { data } = await api.get('/tenant/verify-domain', { params: { domain } });
        attempts++;
        setPollCount(attempts);
        if (data.verified) {
          setVerified(true);
          setVerifying(false);
          stopPolling();
          toast.success('CNAME verified — DNS is live!');
        } else if (attempts >= MAX) {
          setVerified(false);
          setVerifying(false);
          stopPolling();
          toast.error(`DNS not found after ${MAX} checks. Double-check your CNAME record.`);
        }
      } catch {
        attempts++;
        if (attempts >= MAX) { stopPolling(); setVerifying(false); }
      }
    };

    check(); // immediate first check
    pollRef.current = setInterval(check, 5000);
  };

  // cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  const handleVerify = () => {
    const domain = customDomain;
    if (!domain) return toast.error('Enter domain first');
    startCnamePolling(domain);
  };

  const handleSuperAdminTenantChange = async (id) => {
    setSelectedTenantId(id);
    // A pending logo file / verification status belongs to whichever tenant was
    // previously loaded - carrying it over risks uploading it to the wrong tenant.
    setLogoFile(null);
    setLogoPreview(null);
    setVerified(null);
    setAvailability(null);
    try {
      const r = await api.get(`/admin/tenants/${id}`);
      loadTenantIntoForm(r.data.tenant);
      // update URL without reload
      window.history.replaceState(null, '', `/white-label?tenantId=${id}`);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let resolvedLogo = logoUrl;
      if (logoFile) {
        const form = new FormData();
        form.append('logo', logoFile);
        // super admin editing specific tenant uses admin endpoint
        if (isSuperAdmin && selectedTenantId) {
          const { data } = await api.post(`/admin/tenants/${selectedTenantId}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
          resolvedLogo = data.url;
        } else {
          const { data } = await api.post('/tenant/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
          resolvedLogo = data.url;
        }
        setLogoUrl(resolvedLogo);
      }
      // super admin: PATCH /admin/tenants/:id (syncs with /tenants table)
      if (isSuperAdmin && selectedTenantId) {
        const designTokens = { colors: { primary: primaryColor, secondary: secondaryColor } };
        await api.patch(`/admin/tenants/${selectedTenantId}`, {
          app_name: appName || undefined,
          logo_url: resolvedLogo || undefined,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          custom_domain: customDomain || null,
          config: { designTokens, customDomain: customDomain || null, appName },
        });
        toast.success('White-label saved for ' + (tenant?.company_name || tenant?.name || selectedTenantId));
        setVerified(true);
        setStep(3);
      } else {
        const payload = {
          appName: appName || undefined,
          primaryColor,
          secondaryColor,
          logoUrl: resolvedLogo || undefined,
        };
        if (customDomain) payload.customDomain = customDomain;
        const { data } = await api.post('/tenant/white-label/setup', payload);
        toast.success('White-label activated! ' + (data.dnsInstruction?.instructions || ''));
        setStep(3);
        if (customDomain) {
          setTimeout(() => startCnamePolling(customDomain), 500);
        } else {
          setVerified(true);
        }
        window.location.reload();
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Setup failed');
    }
    setSaving(false);
  };

  const fullDomainPreview = customDomain || 'lab.yourschool.edu';

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-headline-lg text-deep-navy">White-Label Setup</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Go live on your own domain in 3 steps — custom domain, your branding, fully managed.</p>
        </div>

        {/* Tenant picker for Super Admin - syncs with /tenants */}
        {isSuperAdmin && (
          <div className="bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <p className="text-label-md text-deep-navy font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">domain</span> Editing tenant (synced with /tenants)</p>
              <p className="text-body-sm text-on-surface-variant">Changes here immediately sync to the Tenants table.</p>
            </div>
            <select value={selectedTenantId} onChange={e=>handleSuperAdminTenantChange(e.target.value)} className="min-w-[220px] px-3 py-2.5 bg-pure-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-indigo-accent/20 outline-none">
              {allTenants.map(t=> <option key={t.id} value={t.id}>{t.company_name||t.name} — {t.custom_domain || '(no domain)'} ({t.plan})</option>)}
            </select>
          </div>
        )}

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-label-md font-bold ${step>=n? 'bg-indigo-accent text-white':'bg-surface-container text-on-surface-variant'} `}>{n}</div>
              <div className={`text-label-md ${step>=n?'text-deep-navy font-bold':'text-on-surface-variant'}`}>{n===1?'Domain':n===2?'Branding':'Go Live'}</div>
              {n<3 && <div className={`flex-1 h-1 mx-2 rounded ${step>n?'bg-indigo-accent':'bg-outline-variant/30'}`} />}
            </div>
          ))}
        </div>

        {step===1 && (
          <div data-help="domain-mode" className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 space-y-6">
            <h2 className="text-headline-sm text-deep-navy">Your custom domain</h2>
            <div>
              <label className="text-label-md text-deep-navy block mb-2">Domain (already purchased)</label>
              <div className="flex gap-2">
                <input value={customDomain} onChange={e=>setCustomDomain(e.target.value.toLowerCase().trim())} placeholder="lab.oakwood.edu" className="flex-1 px-3 py-3 border border-outline-variant/50 rounded-lg text-body-md focus:ring-2 focus:ring-indigo-accent/30 focus:outline-none" />
                <button onClick={checkAvailability} className="px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-lg text-label-md hover:bg-surface-container">Check</button>
              </div>
              {availability && <p className={`text-body-sm mt-2 ${availability.available?'text-green-600':'text-red-600'}`}>{availability.available?'Available ✓':'Taken — try another'}</p>}
            </div>
            <div data-help="cname-box" className="p-4 bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl">
              <p className="text-body-sm text-deep-navy font-bold mb-1">DNS — add 1 CNAME at your DNS provider:</p>
              <code className="block bg-deep-navy text-white px-3 py-2 rounded-lg font-mono text-body-sm mt-2">CNAME {customDomain || 'lab.oakwood.edu'} → <span data-help="cname-target">{cnameTarget || 'your-platform-host.com'}</span></code>
              <p className="text-body-sm text-on-surface-variant mt-2">Propagation ~2–5 min. Works with GoDaddy, Namecheap, Google Domains, or any DNS provider.</p>
            </div>
            <div className="flex justify-end">
              <button onClick={()=>setStep(2)} disabled={!customDomain} className="px-6 py-3 bg-stem-orange text-white rounded-xl font-bold disabled:opacity-40 hover:brightness-95">Next: Branding →</button>
            </div>
          </div>
        )}

        {step===2 && (
          <div data-help="branding" className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 space-y-6">
            <h2 className="text-headline-sm text-deep-navy">Branding</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-label-md text-deep-navy block mb-2">App name (browser title)</label>
                <input value={appName} onChange={e=>setAppName(e.target.value)} placeholder="Oakwood STEM Lab" className="w-full px-3 py-3 border border-outline-variant/50 rounded-lg text-body-md focus:ring-2 focus:ring-indigo-accent/30 focus:outline-none" />
              </div>
              <div>
                <label className="text-label-md text-deep-navy block mb-2">Logo (optional)</label>
                <div onDrop={e=>{e.preventDefault(); handleLogo(e)}} onDragOver={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-outline-variant/50 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-accent">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                  {logoPreview ? <img src={logoPreview} alt="preview" className="h-12 mx-auto" /> : logoUrl ? <img src={logoUrl} alt="logo" className="h-12 mx-auto" /> : <span className="text-body-sm text-on-surface-variant">Click or drag logo (PNG/SVG, 2MB)</span>}
                </div>
              </div>
              <div>
                <label className="text-label-md text-deep-navy block mb-2">Primary color</label>
                <div className="flex gap-2"><input type="color" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} className="w-12 h-10 rounded border" /><input value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} className="flex-1 px-2 py-2 border rounded font-mono" /></div>
              </div>
              <div>
                <label className="text-label-md text-deep-navy block mb-2">Secondary color</label>
                <div className="flex gap-2"><input type="color" value={secondaryColor} onChange={e=>setSecondaryColor(e.target.value)} className="w-12 h-10 rounded border" /><input value={secondaryColor} onChange={e=>setSecondaryColor(e.target.value)} className="flex-1 px-2 py-2 border rounded font-mono" /></div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-surface-container-low border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{backgroundColor: primaryColor}}>{appName? appName[0].toUpperCase():'S'}</div>
              <div><p className="text-body-md font-bold text-deep-navy">{appName || 'YourBrand'}</p><p data-help="domain-preview" className="text-body-sm text-on-surface-variant">{fullDomainPreview}</p></div>
              <button className="ml-auto px-4 py-2 rounded-lg text-white text-label-md" style={{backgroundColor: primaryColor}}>Preview</button>
            </div>
            <div className="flex justify-between">
              <button onClick={()=>setStep(1)} className="px-6 py-3 border border-outline-variant/50 rounded-xl text-label-md">← Back</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-stem-orange text-white rounded-xl font-bold disabled:opacity-50">{saving?'Saving...':'Save & Verify →'}</button>
            </div>
          </div>
        )}

        {step===3 && (
          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center"><span className="material-symbols-outlined text-green-600 text-[32px]">verified</span></div>
            <h2 className="text-headline-md text-deep-navy">You're live!</h2>
            <p className="text-body-md text-on-surface-variant">Your white-label is active at <span className="font-mono text-deep-navy font-bold">https://{fullDomainPreview}</span></p>
            {customDomain && <div className="bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl p-4 text-left">
              <p className="text-body-sm font-bold text-deep-navy">Final step (if not proxied):</p>
              <p className="text-body-sm text-on-surface-variant mt-1">Ensure <code className="bg-deep-navy/10 px-1 rounded font-mono">{customDomain} → {cnameTarget || 'your-platform-host.com'}</code> is set. Then verify:</p>
              <button data-help="verify-btn" onClick={handleVerify} disabled={verifying} className="mt-3 px-4 py-2 bg-indigo-accent text-white rounded-lg text-label-md disabled:opacity-50 flex items-center gap-2">
                {verifying ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Checking DNS... ({pollCount}/24)
                  </>
                ) : verified ? 'Verified ✓' : 'Verify DNS (auto-polls)'}
              </button>
              {verifying && <p className="text-body-sm text-on-surface-variant mt-2">Checking every 5 s — up to 2 minutes. Leave this tab open.</p>}
            </div>}
            <div className="flex justify-center gap-3 pt-4">
              <a href={`https://${fullDomainPreview}`} target="_blank" rel="noreferrer" className="px-6 py-3 bg-deep-navy text-white rounded-xl font-bold">Open my site</a>
              <button onClick={()=>setStep(2)} className="px-6 py-3 border border-outline-variant/50 rounded-xl text-label-md">Edit branding</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
