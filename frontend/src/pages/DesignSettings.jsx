import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const DEFAULT_PLATFORM_HOST = window.location.hostname || 'localhost';

const PRESET_SWATCHES = [
  { primary: '#102348', secondary: '#EA8E0A', label: 'Default' },
  { primary: '#1B4332', secondary: '#52B788', label: 'Forest' },
  { primary: '#1A1A2E', secondary: '#E94560', label: 'Midnight' },
  { primary: '#0D47A1', secondary: '#FF6F00', label: 'Ocean' },
  { primary: '#4A148C', secondary: '#FFAB00', label: 'Royal' },
  { primary: '#2E7D32', secondary: '#FF6F00', label: 'Meadow' },
  { primary: '#3E2723', secondary: '#FF8A65', label: 'Earth' },
  { primary: '#0D1B2A', secondary: '#778DA9', label: 'Slate' },
];

function getLuminance(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const f = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1); const l2 = getLuminance(hex2);
  return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
}
function wcagBadge(hex) {
  const ratio = contrastRatio(hex, '#FFFFFF');
  if (ratio >= 7) return { label: 'AAA', class: 'bg-green-600 text-white', ratio: ratio.toFixed(1) };
  if (ratio >= 4.5) return { label: 'AA', class: 'bg-green-500 text-white', ratio: ratio.toFixed(1) };
  if (ratio >= 3) return { label: 'AA Large', class: 'bg-yellow-500 text-white', ratio: ratio.toFixed(1) };
  return { label: 'FAIL', class: 'bg-red-500 text-white', ratio: ratio.toFixed(1) };
}

export default function DesignSettings() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [searchParams] = useSearchParams();
  const tenantIdParam = searchParams.get('tenantId') || searchParams.get('tenant') || '';

  // wizard-standard state — synced with WhiteLabelOnboarding + /tenants
  const [step, setStep] = useState(1); // 1 domain, 2 branding, 3 preview/go-live
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(tenantIdParam || '');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(null);
  const [availability, setAvailability] = useState(null);

  const [domainMode, setDomainMode] = useState('subdomain'); // wizard standard: subdomain | custom
  const [vanityPrefix, setVanityPrefix] = useState('');
  const [customCname, setCustomCname] = useState('');
  const [platformHost, setPlatformHost] = useState(DEFAULT_PLATFORM_HOST);
  const [cnameTarget, setCnameTarget] = useState(DEFAULT_PLATFORM_HOST);
  const platformHostRef = useRef(DEFAULT_PLATFORM_HOST);

  const [primaryColor, setPrimaryColor] = useState('#102348');
  const [secondaryColor, setSecondaryColor] = useState('#EA8E0A');
  const [loginHeadline, setLoginHeadline] = useState('');
  const [loginSupportText, setLoginSupportText] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const tenantObj = tenants.find((t) => t.id === selectedTenant);

  useEffect(() => {
    const init = async () => {
      try {
        const cfgRes = await api.get('/tenant/config');
        const ph = cfgRes.data?.platformHost || DEFAULT_PLATFORM_HOST;
        setPlatformHost(ph); platformHostRef.current = ph;
        if (cfgRes.data?.cnameTarget) setCnameTarget(cfgRes.data.cnameTarget);
        if (isSuperAdmin) {
          const res = await api.get('/admin/tenants');
          const list = res.data.tenants || [];
          setTenants(list);
          const targetId = tenantIdParam || list[0]?.id || '';
          if (targetId) {
            setSelectedTenant(targetId);
            const tr = await api.get(`/admin/tenants/${targetId}`);
            loadTenantConfig(tr.data.tenant);
          }
        } else {
          const res = await api.get('/tenant/settings');
          const t = res.data.tenant;
          setTenantName(t?.company_name || t?.name || '');
          loadTenantConfig(t);
        }
      } catch (e) { toast.error('Failed to load tenant configuration'); }
      setLoading(false);
    };
    init();
  }, [tenantIdParam]);

  const loadTenantConfig = (tenant) => {
    if (!tenant) return;
    setTenantName(tenant.company_name || tenant.name || '');
    const cfg = tenant.config || {};
    const dt = cfg.designTokens || {};
    const colors = dt.colors || {};
    setPrimaryColor(colors.primary || tenant.primary_color || '#102348');
    setSecondaryColor(colors.secondary || tenant.secondary_color || '#EA8E0A');
    applyPreview(colors.primary || tenant.primary_color || '#102348', colors.secondary || tenant.secondary_color || '#EA8E0A');
    const domain = cfg.customDomain || tenant.custom_domain || '';
    if (domain && domain.includes('.')) {
      // wizard standard: if domain equals subdomain.platformHost treat as subdomain mode
      const ph = platformHostRef.current;
      if (domain.endsWith('.' + ph)) {
        setDomainMode('subdomain');
        setVanityPrefix(domain.replace('.' + ph, ''));
        setCustomCname('');
      } else {
        setDomainMode('custom');
        setCustomCname(domain);
        setVanityPrefix('');
      }
    } else if (tenant.subdomain) {
      setDomainMode('subdomain');
      setVanityPrefix(tenant.subdomain);
      setCustomCname('');
    }
    setLoginHeadline(cfg.loginHeadline || '');
    setLoginSupportText(cfg.loginSupportText || '');
    setLogoUrl(tenant.logo_url || '');
    setLogoPreview(null); setLogoFile(null);
  };

  const handleTenantChange = async (id) => {
    setSelectedTenant(id);
    window.history.replaceState(null, '', `/design?tenantId=${id}`);
    setLoading(true);
    try {
      const res = await api.get(`/admin/tenants/${id}`);
      loadTenantConfig(res.data.tenant);
    } catch { toast.error('Failed to load tenant'); }
    setLoading(false);
  };

  const applyPreview = (p, s) => {
    const root = document.documentElement;
    root.style.setProperty('--ds-primary', p);
    root.style.setProperty('--ds-secondary', s);
    root.style.setProperty('--brand-primary', p);
    root.style.setProperty('--brand-secondary', s);
  };
  const handlePrimaryChange = (v) => { setPrimaryColor(v); applyPreview(v, secondaryColor); };
  const handleSecondaryChange = (v) => { setSecondaryColor(v); applyPreview(primaryColor, v); };
  const applySwatch = (s) => { setPrimaryColor(s.primary); setSecondaryColor(s.secondary); applyPreview(s.primary, s.secondary); };

  const checkAvailability = async () => {
    const domain = domainMode === 'custom' ? customCname : vanityPrefix;
    if (!domain) return toast.error('Enter domain first');
    try {
      const q = domainMode === 'custom' ? `domain=${encodeURIComponent(domain)}` : `subdomain=${encodeURIComponent(domain)}`;
      const { data } = await api.get(`/tenant/check-availability?${q}`);
      setAvailability(data);
      if (data.available) toast.success(domainMode==='custom'?'Domain available ✓':'Subdomain available ✓');
      else toast.error(data.reason || 'Already taken');
    } catch (e) { toast.error(e.response?.data?.error || 'Check failed'); }
  };

  const handleVerifyDomain = async () => {
    const fullDomain = domainMode === 'custom' ? customCname : (vanityPrefix ? `${vanityPrefix}.${platformHostRef.current}` : '');
    if (!fullDomain) return toast.error('Enter a domain first');
    setVerifying(true);
    try {
      const { data } = await api.get('/tenant/verify-domain', { params: { domain: fullDomain } });
      setVerified(data.verified);
      if (data.verified) toast.success(data.message);
      else toast.error(data.message);
    } catch (e) { toast.error(e.response?.data?.error || 'Verify failed'); setVerified(false); }
    setVerifying(false);
  };

  const handleLogoDrop = (e) => {
    e.preventDefault(); setLogoDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Only images');
    if (file.size > 2*1024*1024) return toast.error('Max 2MB');
    setLogoFile(file);
    const r = new FileReader(); r.onload = ev => setLogoPreview(ev.target.result); r.readAsDataURL(file);
  };
  const handleLogoDragOver = (e) => { e.preventDefault(); setLogoDragOver(true); };
  const handleLogoDragLeave = () => setLogoDragOver(false);
  const handleLogoClick = () => fileInputRef.current?.click();

  const save = async () => {
    setSaving(true);
    try {
      let resolvedLogoUrl = logoUrl;
      if (logoFile) {
        const form = new FormData(); form.append('logo', logoFile);
        if (isSuperAdmin && selectedTenant) {
          const { data } = await api.post(`/admin/tenants/${selectedTenant}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
          resolvedLogoUrl = data.url;
        } else {
          const { data } = await api.post('/tenant/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
          resolvedLogoUrl = data.url;
        }
        setLogoUrl(resolvedLogoUrl); setLogoPreview(null); setLogoFile(null);
      }
      const fullDomain = domainMode === 'custom' ? customCname : (vanityPrefix ? `${vanityPrefix}.${platformHostRef.current}` : '');
      const designTokens = { colors: { primary: primaryColor, secondary: secondaryColor } };
      const configPayload = { designTokens, customDomain: fullDomain || null, loginHeadline, loginSupportText };

      if (isSuperAdmin) {
        if (!selectedTenant) return toast.error('Select a tenant');
        // synced with /tenants table + wizard endpoint
        await api.patch(`/admin/tenants/${selectedTenant}`, {
          logo_url: resolvedLogoUrl || undefined,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          custom_domain: domainMode==='custom' ? (fullDomain || null) : null,
          subdomain: domainMode==='subdomain' ? (vanityPrefix || undefined) : undefined,
          config: configPayload,
        });
        toast.success(`Branding synced for ${tenantObj?.company_name || selectedTenant} — also visible at /white-label?tenantId=${selectedTenant} and /tenants`);
      } else {
        // tenant self-serve: use white-label/setup which syncs same columns
        await api.post('/tenant/white-label/setup', {
          customDomain: domainMode==='custom'? fullDomain: undefined,
          subdomain: domainMode==='subdomain'? vanityPrefix: undefined,
          appName: tenantName || undefined,
          primaryColor, secondaryColor, logoUrl: resolvedLogoUrl || undefined,
        });
        // also save loginHeadline via tenant/settings for backward compat
        await api.patch('/tenant/settings', { config: configPayload }).catch(()=>{});
        toast.success('Branding synced — visible at /white-label and /tenants');
      }
      applyPreview(primaryColor, secondaryColor);
      setVerified(null);
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    setSaving(false);
  };

  const handleReset = () => {
    const p='#102348', s='#EA8E0A';
    setPrimaryColor(p); setSecondaryColor(s); applyPreview(p,s);
    setVanityPrefix(''); setCustomCname(''); setLoginHeadline(''); setLoginSupportText(''); setLogoPreview(null); setLogoFile(null);
    toast.success('Reset to wizard defaults');
  };

  const contrast = wcagBadge(primaryColor);
  const isLight = getLuminance(primaryColor) > 0.5;
  const fullPreviewDomain = domainMode==='custom' ? (customCname || 'lab.yourschool.edu') : (vanityPrefix ? `${vanityPrefix}.${platformHost}` : `portal.${platformHost}`);

  if (loading && isSuperAdmin && !tenants.length) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[60vh] text-on-surface-variant">Loading tenant data…</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="max-w-container-max mx-auto">
        {/* Breadcrumb — links to wizard */}
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-2">
          <a href="/tenants" className="hover:text-stem-orange">Tenants</a>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-deep-navy font-medium">{tenantName || 'Select Tenant'}</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface-variant">Branding</span>
          <Link to={selectedTenant ? `/white-label?tenantId=${selectedTenant}` : '/white-label'} className="ml-auto text-indigo-accent hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">rocket_launch</span> Open wizard</Link>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <h1 className="text-headline-lg text-deep-navy">White-Label Configuration</h1>
            <p className="text-body-md text-on-surface-variant mt-1 max-w-2xl">Wizard-standard: Domain → Branding → Go Live. Synced with <Link to="/white-label" className="text-indigo-accent underline">/white-label</Link> and <Link to="/tenants" className="text-indigo-accent underline">/tenants</Link>.</p>
          </div>
        </div>

        {/* SuperAdmin tenant picker — synced */}
        {isSuperAdmin && (
          <div className="bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div><p className="text-label-md text-deep-navy font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">domain</span> Editing tenant (synced)</p><p className="text-body-sm text-on-surface-variant">Changes here appear instantly in /tenants and /white-label?tenantId={selectedTenant}</p></div>
            <select value={selectedTenant} onChange={e=>handleTenantChange(e.target.value)} className="min-w-[260px] px-3 py-2.5 bg-pure-white border border-outline-variant rounded-lg text-body-sm">
              {tenants.map(t=> <option key={t.id} value={t.id}>{t.company_name||t.name} — {t.custom_domain || `${t.subdomain}.${platformHost}`} ({t.plan})</option>)}
            </select>
          </div>
        )}

        {/* Wizard stepper */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(n=> (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-label-md font-bold ${step>=n?'bg-indigo-accent text-white':'bg-surface-container text-on-surface-variant'}`}>{n}</div>
              <div className={`text-label-md ${step>=n?'text-deep-navy font-bold':'text-on-surface-variant'}`}>{n===1?'Domain':n===2?'Branding':'Preview'}</div>
              {n<3 && <div className={`flex-1 h-1 mx-2 rounded ${step>n?'bg-indigo-accent':'bg-outline-variant/30'}`} />}
            </div>
          ))}
        </div>

        {step===1 && (
          <div data-help="domain-mode" className="grid grid-cols-12 gap-gutter">
            <div className="col-span-12 md:col-span-7">
              <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6">
                <h2 className="text-label-md text-deep-navy uppercase tracking-wider flex items-center gap-2 mb-6"><span className="material-symbols-outlined text-stem-orange">language</span> Domain — wizard standard</h2>
                <div className="flex gap-3 mb-6">
                  <button onClick={()=>setDomainMode('subdomain')} className={`flex-1 py-3 rounded-xl border-2 text-label-md font-bold ${domainMode==='subdomain'?'border-indigo-accent bg-indigo-accent/10 text-indigo-accent':'border-outline-variant/30 text-on-surface-variant'}`}>Subdomain<br/><span className="text-body-sm font-normal">your-school.{platformHost}</span></button>
                  <button onClick={()=>setDomainMode('custom')} className={`flex-1 py-3 rounded-xl border-2 text-label-md font-bold ${domainMode==='custom'?'border-indigo-accent bg-indigo-accent/10 text-indigo-accent':'border-outline-variant/30 text-on-surface-variant'}`}>Own domain<br/><span className="text-body-sm font-normal">lab.yourschool.edu</span></button>
                </div>
                {domainMode==='subdomain' ? (
                  <div>
                    <label className="text-body-sm font-medium text-on-surface-variant block mb-2">Vanity URL</label>
                    <div className="flex items-center">
                      <input value={vanityPrefix} onChange={e=>setVanityPrefix(e.target.value.replace(/[^a-zA-Z0-9-]/g,''))} placeholder="your-school" className="flex-1 px-3 py-2.5 border border-outline-variant/50 rounded-l-lg text-body-md focus:ring-2 focus:ring-indigo-accent/30 outline-none" />
                      <div className="px-3 py-2.5 bg-surface-container border border-l-0 border-outline-variant/50 rounded-r-lg text-body-sm font-mono">.{platformHost}</div>
                      <button onClick={checkAvailability} className="ml-2 px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-label-md">Check</button>
                    </div>
                    <p className="text-body-sm text-on-surface-variant/70 mt-2">Instant — no DNS. Your site: <span className="font-mono text-deep-navy">https://{fullPreviewDomain}</span></p>
                  </div>
                ) : (
                  <div>
                    <label className="text-body-sm font-medium text-on-surface-variant block mb-2">Custom CNAME (already purchased)</label>
                    <div className="flex gap-2">
                      <input value={customCname} onChange={e=>setCustomCname(e.target.value.toLowerCase().trim())} placeholder="lab.yourschool.edu" className="flex-1 px-3 py-2.5 border border-outline-variant/50 rounded-lg text-body-md focus:ring-2 focus:ring-indigo-accent/30 outline-none" />
                      <button onClick={checkAvailability} className="px-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-label-md">Check</button>
                      <button onClick={handleVerifyDomain} disabled={verifying || !customCname} className="px-4 py-2.5 bg-indigo-accent text-white rounded-lg text-label-md disabled:opacity-50 flex items-center gap-1">{verifying?<span className="material-symbols-outlined animate-spin text-[18px]">sync</span>:<span className="material-symbols-outlined text-[18px]">verified</span>} Verify</button>
                    </div>
                    {availability && <p className={`text-body-sm mt-2 ${availability.available?'text-green-600':'text-red-600'}`}>{availability.available?'Available ✓':'Taken'}</p>}
                  </div>
                )}
                <div data-help="cname-box" className="mt-6 p-4 rounded-xl bg-indigo-accent/5 border border-indigo-accent/20">
                  <p className="text-body-sm font-medium text-deep-navy mb-1">CNAME Record Setup</p>
                  <p className="text-body-sm text-on-surface-variant">Create <code data-help="domain-preview" className="px-1.5 py-0.5 bg-deep-navy/10 rounded font-mono text-[13px]">{domainMode==='custom'?(customCname||'lab.yourschool.edu'):fullPreviewDomain}</code> → <code data-help="cname-target" className="px-1.5 py-0.5 bg-deep-navy/10 rounded font-mono text-[13px]">{cnameTarget}</code>. {domainMode==='custom'?'Enable SSL/HTTPS at your DNS provider or hosting panel.':''}</p>
                </div>
                <div className="flex justify-end mt-6"><button onClick={()=>setStep(2)} className="px-6 py-3 bg-stem-orange text-white rounded-xl font-bold hover:brightness-95">Next: Branding →</button></div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-5">
              <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6">
                <h2 className="text-label-md text-deep-navy uppercase tracking-wider flex items-center gap-2 mb-6"><span className="material-symbols-outlined text-stem-orange">palette</span> Quick preview</h2>
                <div className="flex items-center gap-3 p-4 rounded-xl border" style={{borderColor: primaryColor}}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{backgroundColor: primaryColor}}>{tenantName? tenantName[0]:'S'}</div>
                  <div><p className="font-bold text-deep-navy">{tenantName||'YourBrand'}</p><p className="text-body-sm font-mono text-on-surface-variant">{fullPreviewDomain}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step===2 && (
          <div data-help="branding" className="grid grid-cols-12 gap-gutter">
            <div className="col-span-12 md:col-span-4">
              <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 h-full">
                <h2 className="text-label-md text-deep-navy uppercase tracking-wider flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-stem-orange">image</span> Tenant Logo</h2>
                <div onDrop={handleLogoDrop} onDragOver={handleLogoDragOver} onDragLeave={handleLogoDragLeave} onClick={handleLogoClick} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${logoDragOver?'border-stem-orange bg-stem-orange/5':'border-outline-variant hover:border-stem-orange'}`}>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoDrop} />
                  {logoPreview ? <div><img src={logoPreview} alt="preview" className="max-h-24 mx-auto" /><p className="text-body-sm text-on-surface-variant mt-2">Click to replace</p></div> : logoUrl ? <div><img src={logoUrl} alt="logo" className="max-h-24 mx-auto" /><p className="text-body-sm text-on-surface-variant mt-2">Click to replace</p></div> : <div><div className="w-16 h-16 mx-auto rounded-xl bg-surface-container flex items-center justify-center"><span className="material-symbols-outlined text-[32px]">add_photo_alternate</span></div><p className="text-body-md font-medium mt-3">Upload Logo</p><p className="text-body-sm text-on-surface-variant">PNG/SVG, 2MB</p></div>}
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-8">
              <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6">
                <h2 className="text-label-md text-deep-navy uppercase tracking-wider flex items-center gap-2 mb-6"><span className="material-symbols-outlined text-stem-orange">palette</span> Brand Palette — synced</h2>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div><label className="text-body-sm font-medium block mb-2">Primary</label><div className="flex gap-3"><input type="color" value={primaryColor} onChange={e=>handlePrimaryChange(e.target.value)} className="w-12 h-12 rounded-xl border cursor-pointer" /><input value={primaryColor} onChange={e=>e.target.value.match(/^#[0-9A-Fa-f]{0,6}$/) && handlePrimaryChange(e.target.value)} className="flex-1 px-3 py-2.5 border rounded-lg font-mono" /></div></div>
                  <div><label className="text-body-sm font-medium block mb-2">Secondary</label><div className="flex gap-3"><input type="color" value={secondaryColor} onChange={e=>handleSecondaryChange(e.target.value)} className="w-12 h-12 rounded-xl border cursor-pointer" /><input value={secondaryColor} onChange={e=>e.target.value.match(/^#[0-9A-Fa-f]{0,6}$/) && handleSecondaryChange(e.target.value)} className="flex-1 px-3 py-2.5 border rounded-lg font-mono" /></div></div>
                </div>
                <div className="flex flex-wrap gap-3 mb-6">
                  {PRESET_SWATCHES.map(s=> <button key={s.label} onClick={()=>applySwatch(s)} className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:border-stem-orange"><div className="flex -space-x-1"><div className="w-5 h-5 rounded-full border-2 border-white" style={{backgroundColor:s.primary}}/><div className="w-5 h-5 rounded-full border-2 border-white" style={{backgroundColor:s.secondary}}/></div><span className="text-body-sm">{s.label}</span></button>)}
                </div>
                <div className="p-4 rounded-xl bg-surface-container-low border flex items-center justify-between mb-6">
                  <span className="text-label-md uppercase">Contrast</span><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${contrast.class}`}>WCAG {contrast.label} {contrast.ratio}:1</span>
                  <button className="px-5 py-2 rounded-lg text-white text-body-sm" style={{backgroundColor:primaryColor, color:isLight?'#102348':'#fff'}}>Sample Button</button>
                </div>
                <div className="space-y-4">
                  <div><label className="text-body-sm font-medium block mb-2">Welcome Headline (login)</label><input value={loginHeadline} onChange={e=>setLoginHeadline(e.target.value)} placeholder="Welcome to STEM Lab" className="w-full px-3 py-2.5 border rounded-lg" /></div>
                  <div><label className="text-body-sm font-medium block mb-2">Support Text</label><textarea value={loginSupportText} onChange={e=>setLoginSupportText(e.target.value)} rows={3} placeholder="Contact your instructor..." className="w-full px-3 py-2.5 border rounded-lg resize-none" /></div>
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={()=>setStep(1)} className="px-6 py-3 border rounded-xl text-label-md">← Domain</button>
                  <div className="flex gap-3">
                    <button onClick={()=>setStep(3)} className="px-6 py-3 border rounded-xl text-label-md">Preview →</button>
                    <button onClick={save} disabled={saving} className="px-6 py-3 bg-stem-orange text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">save</span>{saving?'Saving…':'Save & Sync'}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step===3 && (
          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow overflow-hidden">
            <div className="bg-surface-container-low px-4 py-3 flex items-center gap-3 border-b">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400"/><div className="w-3 h-3 rounded-full bg-yellow-400"/><div className="w-3 h-3 rounded-full bg-green-400"/></div>
              <div className="flex-1 max-w-md mx-auto bg-white rounded-md px-3 py-1.5 text-body-sm text-center border">{fullPreviewDomain}</div>
              <button onClick={handleVerifyDomain} disabled={verifying} className="px-3 py-1.5 bg-indigo-accent text-white rounded-lg text-body-sm disabled:opacity-50 flex items-center gap-1">{verifying?<span className="material-symbols-outlined animate-spin text-[16px]">sync</span>:<span className="material-symbols-outlined text-[16px]">verified</span>} Verify</button>
            </div>
            <div className="min-h-[420px] flex">
              <div className="w-56 p-4" style={{backgroundColor: primaryColor}}>
                <div className="flex items-center gap-2 mb-8">{logoPreview ? <img src={logoPreview} alt="logo" className="h-8"/> : logoUrl ? <img src={logoUrl} alt="logo" className="h-8"/> : <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><span className="material-symbols-outlined text-white">science</span></div>}<span className="text-white font-bold">{tenantName||'YourBrand'}</span></div>
                {['Dashboard','Courses','Devices','Reports','Settings'].map(i=> <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-white/80 text-body-sm"><span className="material-symbols-outlined text-[18px]">dashboard</span>{i}</div>)}
              </div>
              <div className="flex-1 p-6 bg-[#F5F5F5]">
                <h1 className="text-headline-md text-deep-navy">{loginHeadline || 'Welcome back, Student'}</h1>
                <p className="text-body-sm text-on-surface-variant">{loginSupportText || 'Here is your lab overview'}</p>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[{label:'Active Courses', value:'4', color:secondaryColor},{label:'Completed', value:'12', color:primaryColor},{label:'Upcoming', value:'2', color:secondaryColor}].map(s=> <div key={s.label} className="bg-white rounded-xl border p-4"><p className="text-body-sm text-on-surface-variant">{s.label}</p><p className="text-headline-lg" style={{color:s.color}}>{s.value}</p></div>)}
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={()=>setStep(2)} className="px-6 py-3 border rounded-xl text-label-md">← Back to branding</button>
                  <button onClick={save} disabled={saving} className="px-6 py-3 bg-stem-orange text-white rounded-xl font-bold disabled:opacity-50">{saving?'Saving…':'Save & Sync to /tenants'}</button>
                  <Link to={selectedTenant? `/tenants/${selectedTenant}`:'/tenants'} className="px-6 py-3 bg-deep-navy text-white rounded-xl font-bold text-center">View in Tenants</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={handleReset} className="px-6 py-3 border rounded-xl text-label-md flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">restart_alt</span> Reset</button>
          {step!==3 && <button onClick={()=>setStep(3)} className="px-6 py-3 border rounded-xl text-label-md">Preview →</button>}
        </div>
      </div>
    </AdminLayout>
  );
}
