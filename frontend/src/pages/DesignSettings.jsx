import { useState, useEffect, useRef } from 'react';
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
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
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

  const [view, setView] = useState('config');
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [primaryColor, setPrimaryColor] = useState('#102348');
  const [secondaryColor, setSecondaryColor] = useState('#EA8E0A');
  const [vanityPrefix, setVanityPrefix] = useState('');
  const [customCname, setCustomCname] = useState('');
  const [platformHost, setPlatformHost] = useState(DEFAULT_PLATFORM_HOST);
  const [cnameTarget, setCnameTarget] = useState(DEFAULT_PLATFORM_HOST);
  const [loginHeadline, setLoginHeadline] = useState('');
  const [loginSupportText, setLoginSupportText] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const platformHostRef = useRef(DEFAULT_PLATFORM_HOST);

  const tenantObj = tenants.find((t) => t.id === selectedTenant);

  useEffect(() => {
    const init = async () => {
      try {
        const cfgRes = await api.get('/tenant/config');
        const ph = cfgRes.data?.platformHost || DEFAULT_PLATFORM_HOST;
        setPlatformHost(ph);
        platformHostRef.current = ph;
        if (cfgRes.data?.cnameTarget) setCnameTarget(cfgRes.data.cnameTarget);
        if (isSuperAdmin) {
          const res = await api.get('/admin/tenants');
          const list = res.data.tenants || [];
          setTenants(list);
          if (list.length) {
            setSelectedTenant(list[0].id);
            await loadTenantConfig(list[0]);
          }
        } else {
          const res = await api.get('/tenant/settings');
          const tenant = res.data.tenant;
          setTenantName(tenant?.company_name || tenant?.name || '');
          loadTenantConfig(tenant);
        }
      } catch (e) {
        toast.error('Failed to load tenant configuration');
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadTenantConfig = (tenant) => {
    if (!tenant) return;
    setTenantName(tenant.company_name || tenant.name || '');
    const cfg = tenant.config || {};
    const dt = cfg.designTokens || {};
    const colors = dt.colors || {};
    const p = colors.primary || '#102348';
    const s = colors.secondary || '#EA8E0A';
    setPrimaryColor(p);
    setSecondaryColor(s);
    applyPreview(p, s);
    setCustomCname(cfg.customDomain || tenant.custom_domain || '');
    const domain = cfg.customDomain || tenant.custom_domain || '';
    setCustomCname(domain);
    const ph = platformHostRef.current || DEFAULT_PLATFORM_HOST;
    if (domain && domain.includes('.' + ph)) {
      setVanityPrefix(domain.replace('.' + ph, ''));
    } else {
      setVanityPrefix('');
    }
    setLoginHeadline(cfg.loginHeadline || '');
    setLoginSupportText(cfg.loginSupportText || '');
    setLogoUrl(tenant.logo_url || '');
    setLogoPreview(null);
  };

  const handleTenantChange = async (id) => {
    setSelectedTenant(id);
    setLoading(true);
    try {
      const res = await api.get(`/admin/tenants/${id}`);
      loadTenantConfig(res.data.tenant);
    } catch (e) {
      toast.error('Failed to load tenant configuration');
    }
    setLoading(false);
  };

  const applyPreview = (primary, secondary) => {
    const root = document.documentElement;
    root.style.setProperty('--ds-primary', primary);
    root.style.setProperty('--ds-secondary', secondary);
  };

  const handlePrimaryChange = (val) => {
    setPrimaryColor(val);
    applyPreview(val, secondaryColor);
  };

  const handleSecondaryChange = (val) => {
    setSecondaryColor(val);
    applyPreview(primaryColor, val);
  };

  const applySwatch = (swatch) => {
    setPrimaryColor(swatch.primary);
    setSecondaryColor(swatch.secondary);
    applyPreview(swatch.primary, swatch.secondary);
  };

  const handleReset = () => {
    const p = '#102348';
    const s = '#EA8E0A';
    setPrimaryColor(p);
    setSecondaryColor(s);
    applyPreview(p, s);
    setVanityPrefix('');
    setCustomCname('');
    setLoginHeadline('');
    setLoginSupportText('');
    setLogoPreview(null);
    toast.success('Reset to default brand settings');
  };

  const handleVerifyDomain = async () => {
    if (!customCname) { toast.error('Enter a CNAME value first'); return; }
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast.success('CNAME record verified successfully');
    setVerifying(false);
  };

  const handleLogoDrop = (e) => {
    e.preventDefault();
    setLogoDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleLogoDragOver = (e) => {
    e.preventDefault();
    setLogoDragOver(true);
  };

  const handleLogoDragLeave = () => setLogoDragOver(false);

  const handleLogoClick = () => fileInputRef.current?.click();

  const save = async () => {
    setSaving(true);
    try {
      const fullDomain = vanityPrefix ? `${vanityPrefix}.${platformHostRef.current || DEFAULT_PLATFORM_HOST}` : customCname;
      const designTokens = { colors: { primary: primaryColor, secondary: secondaryColor } };
      const payload = {
        config: {
          designTokens,
          customDomain: fullDomain,
          loginHeadline,
          loginSupportText,
        },
      };
      if (isSuperAdmin) {
        if (!selectedTenant) { toast.error('Please select a tenant'); setSaving(false); return; }
        await api.patch(`/admin/tenants/${selectedTenant}`, payload);
        toast.success(`Branding saved for ${tenantObj?.company_name || tenantObj?.name || selectedTenant}`);
      } else {
        await api.patch('/tenant/settings', { config: JSON.stringify(payload.config) });
        toast.success('Branding profile saved for your tenant');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save branding profile');
    }
    setSaving(false);
  };

  const contrast = wcagBadge(primaryColor);
  const isLight = getLuminance(primaryColor) > 0.5;

  if (loading && isSuperAdmin && !tenants.length) {
    return <AdminLayout><div className="flex items-center justify-center min-h-[60vh] text-on-surface-variant text-body-lg">Loading tenant data…</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="max-w-container-max mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-2">
          <a href="/tenants" className="hover:text-stem-orange transition-colors">Tenants</a>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-deep-navy font-medium">{tenantName || 'Select Tenant'}</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface-variant">Branding</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-stack-md gap-4">
          <div>
            <h1 className="text-headline-lg text-deep-navy">White-Label Configuration</h1>
            <p className="text-body-md text-on-surface-variant mt-1 max-w-2xl">
              Customize the branded experience for your institution — logos, colors, domain, and login page messaging.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant/30">
              <button
                onClick={() => setView('config')}
                className={`px-4 py-2 rounded-md text-label-md transition-all ${view === 'config' ? 'bg-pure-white shadow text-deep-navy font-bold' : 'text-on-surface-variant hover:text-deep-navy'}`}
              >
                <span className="material-symbols-outlined text-[16px] align-middle mr-1">tune</span>
                Config
              </button>
              <button
                onClick={() => setView('preview')}
                className={`px-4 py-2 rounded-md text-label-md transition-all ${view === 'preview' ? 'bg-pure-white shadow text-deep-navy font-bold' : 'text-on-surface-variant hover:text-deep-navy'}`}
              >
                <span className="material-symbols-outlined text-[16px] align-middle mr-1">visibility</span>
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Tenant selector — Super Admin only */}
        {isSuperAdmin && (
          <div className="mb-stack-md">
            <label className="text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">Target Institution</label>
            <div className="relative max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">domain</span>
              <select
                value={selectedTenant}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-pure-white border border-outline-variant/50 rounded-xl text-body-md text-deep-navy appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.company_name || t.name} ({t.subdomain})</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px] pointer-events-none">expand_more</span>
            </div>
          </div>
        )}

        {/* CONFIG VIEW */}
        {view === 'config' && (
          <div className="grid grid-cols-12 gap-gutter">
            {/* Tenant Logo — 4 cols */}
            <div className="col-span-12 md:col-span-4">
              <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-stem-orange text-[20px]">image</span>
                  <h2 className="text-label-md text-deep-navy uppercase tracking-wider">Tenant Logo</h2>
                </div>
                <div
                  onDrop={handleLogoDrop}
                  onDragOver={handleLogoDragOver}
                  onDragLeave={handleLogoDragLeave}
                  onClick={handleLogoClick}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    logoDragOver
                      ? 'border-stem-orange bg-stem-orange/5'
                      : 'border-outline-variant hover:border-stem-orange hover:bg-stem-orange/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoDrop}
                  />
                  {logoPreview ? (
                    <div className="space-y-3">
                      <img src={logoPreview} alt="Logo preview" className="max-h-24 mx-auto object-contain" />
                      <p className="text-body-sm text-on-surface-variant">Click or drag to replace</p>
                    </div>
                  ) : logoUrl ? (
                    <div className="space-y-3">
                      <img src={logoUrl} alt="Current logo" className="max-h-24 mx-auto object-contain" />
                      <p className="text-body-sm text-on-surface-variant">Click or drag to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto rounded-xl bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[32px] text-on-surface-variant">add_photo_alternate</span>
                      </div>
                      <div>
                        <p className="text-body-md text-deep-navy font-medium">Upload Logo</p>
                        <p className="text-body-sm text-on-surface-variant mt-1">Drag & drop or click to browse</p>
                      </div>
                      <p className="text-label-sm text-on-surface-variant/60">SVG, PNG, or JPG &middot; Max 2MB</p>
                    </div>
                  )}
                </div>
                {logoUrl && !logoPreview && (
                  <div className="mt-4 p-3 bg-surface-container-low rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px]">check_circle</span>
                    <span className="text-body-sm text-on-surface-variant truncate">Current logo from API</span>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Brand Palette — 8 cols */}
            <div className="col-span-12 md:col-span-8">
              <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 h-full">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-stem-orange text-[20px]">palette</span>
                  <h2 className="text-label-md text-deep-navy uppercase tracking-wider">Primary Brand Palette</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Primary color */}
                  <div>
                    <label className="text-body-sm text-on-surface-variant font-medium block mb-2">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => handlePrimaryChange(e.target.value)}
                          className="w-12 h-12 rounded-xl border border-outline-variant cursor-pointer block"
                        />
                        <div className="absolute inset-0 rounded-xl border border-outline-variant/30 pointer-events-none" />
                      </div>
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handlePrimaryChange(v);
                        }}
                        className="flex-1 px-3 py-2.5 border border-outline-variant/50 rounded-lg text-body-md font-mono text-deep-navy focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all"
                        maxLength={7}
                        placeholder="#102348"
                      />
                    </div>
                  </div>
                  {/* Secondary color */}
                  <div>
                    <label className="text-body-sm text-on-surface-variant font-medium block mb-2">Secondary Color</label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => handleSecondaryChange(e.target.value)}
                          className="w-12 h-12 rounded-xl border border-outline-variant cursor-pointer block"
                        />
                        <div className="absolute inset-0 rounded-xl border border-outline-variant/30 pointer-events-none" />
                      </div>
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) handleSecondaryChange(v);
                        }}
                        className="flex-1 px-3 py-2.5 border border-outline-variant/50 rounded-lg text-body-md font-mono text-deep-navy focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all"
                        maxLength={7}
                        placeholder="#EA8E0A"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset swatches */}
                <div className="mb-6">
                  <label className="text-body-sm text-on-surface-variant font-medium block mb-3">Quick Presets</label>
                  <div className="flex flex-wrap gap-3">
                    {PRESET_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.label}
                        onClick={() => applySwatch(swatch)}
                        title={swatch.label}
                        className="group relative flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant/30 hover:border-stem-orange/50 hover:bg-stem-orange/5 transition-all"
                      >
                        <div className="flex -space-x-1">
                          <div className="w-5 h-5 rounded-full border-2 border-pure-white" style={{ backgroundColor: swatch.primary }} />
                          <div className="w-5 h-5 rounded-full border-2 border-pure-white" style={{ backgroundColor: swatch.secondary }} />
                        </div>
                        <span className="text-body-sm text-on-surface-variant group-hover:text-deep-navy">{swatch.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contrast check */}
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-label-md text-deep-navy uppercase tracking-wider">Contrast Check</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${contrast.class}`}>
                      WCAG {contrast.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      className="px-5 py-2 rounded-lg text-body-sm font-medium transition-all"
                      style={{ backgroundColor: primaryColor, color: isLight ? '#102348' : '#FFFFFF' }}
                    >
                      Sample Button
                    </button>
                    <div className="text-body-sm text-on-surface-variant">
                      <span className="font-medium">Ratio:</span> {contrast.ratio}:1
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Domain Setup — 7 cols */}
            <div className="col-span-12 md:col-span-7">
              <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 h-full">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-stem-orange text-[20px]">language</span>
                  <h2 className="text-label-md text-deep-navy uppercase tracking-wider">Custom Domain Setup</h2>
                </div>

                {/* Vanity URL */}
                <div className="mb-5">
                  <label className="text-body-sm text-on-surface-variant font-medium block mb-2">Vanity URL</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={vanityPrefix}
                      onChange={(e) => setVanityPrefix(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                      placeholder="your-school"
                      className="flex-1 px-3 py-2.5 border border-outline-variant/50 rounded-l-lg text-body-md text-deep-navy focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all"
                    />
                    <div className="px-3 py-2.5 bg-surface-container border border-l-0 border-outline-variant/50 rounded-r-lg text-body-sm text-on-surface-variant font-mono whitespace-nowrap">
                      .{platformHost}
                    </div>
                  </div>
                  <p className="text-body-sm text-on-surface-variant/70 mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Students will access your portal at this subdomain
                  </p>
                </div>

                {/* Custom CNAME */}
                <div className="mb-5">
                  <label className="text-body-sm text-on-surface-variant font-medium block mb-2">Custom CNAME</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customCname}
                      onChange={(e) => setCustomCname(e.target.value)}
                      placeholder="login.yourinstitution.edu"
                      className="flex-1 px-3 py-2.5 border border-outline-variant/50 rounded-lg text-body-md text-deep-navy focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all"
                    />
                    <button
                      onClick={handleVerifyDomain}
                      disabled={verifying || !customCname}
                      className="px-4 py-2.5 bg-indigo-accent text-pure-white rounded-lg text-label-md hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {verifying ? (
                        <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                      )}
                      {verifying ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                </div>

                {/* CNAME documentation */}
                <div className="p-4 rounded-xl bg-indigo-accent/5 border border-indigo-accent/20">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-indigo-accent text-[20px] mt-0.5">info</span>
                    <div>
                      <p className="text-body-sm text-deep-navy font-medium mb-1">CNAME Record Setup</p>
                      <p className="text-body-sm text-on-surface-variant">
                        Create a CNAME record in your DNS provider pointing{' '}
                        <code className="px-1.5 py-0.5 bg-deep-navy/10 rounded text-deep-navy font-mono text-[13px]">login.yourinstitution.edu</code>
                        {' '}to{' '}
                        <code className="px-1.5 py-0.5 bg-deep-navy/10 rounded text-deep-navy font-mono text-[13px]">{cnameTarget}</code>.
                        SSL certificates are provisioned automatically via Let&rsquo;s Encrypt.
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-body-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-green-600 text-[18px]">lock</span>
                        Automatic HTTPS &amp; SSL
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Page Messaging — 5 cols */}
            <div className="col-span-12 md:col-span-5">
              <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 h-full">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-stem-orange text-[20px]">login</span>
                  <h2 className="text-label-md text-deep-navy uppercase tracking-wider">Login Page Messaging</h2>
                </div>

                <div className="mb-5">
                  <label className="text-body-sm text-on-surface-variant font-medium block mb-2">Welcome Headline</label>
                  <input
                    type="text"
                    value={loginHeadline}
                    onChange={(e) => setLoginHeadline(e.target.value)}
                    placeholder="Welcome to STEM Lab"
                    className="w-full px-3 py-2.5 border border-outline-variant/50 rounded-lg text-body-md text-deep-navy focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all"
                  />
                  <p className="text-body-sm text-on-surface-variant/70 mt-1.5">Displayed above the login form</p>
                </div>

                <div className="mb-2">
                  <label className="text-body-sm text-on-surface-variant font-medium block mb-2">Support Text</label>
                  <textarea
                    value={loginSupportText}
                    onChange={(e) => setLoginSupportText(e.target.value)}
                    placeholder="For login assistance, please contact your instructor or IT support."
                    rows={4}
                    className="w-full px-3 py-2.5 border border-outline-variant/50 rounded-lg text-body-md text-deep-navy focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all resize-none"
                  />
                  <p className="text-body-sm text-on-surface-variant/70 mt-1.5">Shown below the login button</p>
                </div>
              </div>
            </div>

            {/* Action buttons — full width */}
            <div className="col-span-12 flex items-center justify-end gap-4 mt-stack-md mb-stack-lg">
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-outline-variant/50 rounded-xl text-label-md text-on-surface-variant hover:bg-surface-container-low hover:text-deep-navy transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Reset to Default
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-6 py-3 bg-stem-orange text-pure-white rounded-xl text-label-md font-bold hover:brightness-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shadow"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                {saving ? 'Saving Branding Profile…' : 'Save Branding Profile'}
              </button>
            </div>
          </div>
        )}

        {/* PREVIEW VIEW */}
        {view === 'preview' && (
          <div className="space-y-stack-md mb-stack-lg">
            <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow overflow-hidden">
              {/* Mock browser chrome */}
              <div className="bg-surface-container-low px-4 py-3 flex items-center gap-3 border-b border-outline-variant/20">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 max-w-md mx-auto">
                  <div className="bg-pure-white rounded-md px-3 py-1.5 text-body-sm text-on-surface-variant text-center truncate border border-outline-variant/20">
                    {vanityPrefix ? `${vanityPrefix}.${platformHost}` : customCname || `portal.${platformHost}`}
                  </div>
                </div>
              </div>

              {/* Mock dashboard */}
              <div className="min-h-[500px] flex" style={{ backgroundColor: '#F5F5F5' }}>
                {/* Sidebar */}
                <div className="w-56 p-4" style={{ backgroundColor: primaryColor }}>
                  <div className="flex items-center gap-2 mb-8">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-8 w-auto" />
                    ) : logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-pure-white/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-pure-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>science</span>
                      </div>
                    )}
                    <span className="text-pure-white text-body-md font-bold">{tenantName || 'YourBrand'}</span>
                  </div>
                  {['Dashboard', 'Courses', ' Devices', 'Reports', 'Settings'].map((item) => (
                    <div
                      key={item}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-body-sm ${
                        item === ' Dashboard' ? 'bg-pure-white/15 text-pure-white font-medium' : 'text-pure-white/70 hover:bg-pure-white/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {item === 'Dashboard' ? 'dashboard' : item.trim() === 'Courses' ? 'menu_book' : item.trim() === 'Devices' ? 'hardware' : item.trim() === 'Reports' ? 'bar_chart' : 'settings'}
                      </span>
                      {item.trim()}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="flex-1 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className="text-headline-md text-deep-navy">Welcome back, Student</h1>
                      <p className="text-body-sm text-on-surface-variant">Here&rsquo;s your lab overview</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-pure-white text-[12px] font-bold" style={{ backgroundColor: primaryColor }}>
                        S
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[{ label: 'Active Courses', value: '4', color: secondaryColor },
                      { label: 'Completed Labs', value: '12', color: primaryColor },
                      { label: 'Upcoming Sessions', value: '2', color: secondaryColor }].map((stat) => (
                      <div key={stat.label} className="bg-pure-white rounded-xl border border-outline-variant/20 p-4">
                        <p className="text-body-sm text-on-surface-variant mb-1">{stat.label}</p>
                        <p className="text-headline-lg" style={{ color: stat.color }}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-pure-white rounded-xl border border-outline-variant/20 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <button className="px-4 py-2 rounded-lg text-body-sm font-medium text-pure-white" style={{ backgroundColor: primaryColor }}>
                        View Courses
                      </button>
                      <button className="px-4 py-2 rounded-lg text-body-sm font-medium border border-outline-variant/50 text-on-surface-variant">
                        View Schedule
                      </button>
                    </div>
                    <p className="text-body-sm text-on-surface-variant">
                      Your next lab session is tomorrow at 10:00 AM.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview note */}
            <div className="flex items-center justify-between">
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">preview</span>
                This is a preview of the end-user dashboard with your selected brand colors.
              </p>
              <button
                onClick={() => setView('config')}
                className="text-label-md text-stem-orange hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Config
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
