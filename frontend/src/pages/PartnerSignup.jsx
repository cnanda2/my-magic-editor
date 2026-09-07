/**
 * Public self-serve partner signup — custom domain only.
 * Flow: account details → own domain + CNAME instruction → pick plan → create tenant → Stripe checkout
 * Route: /partner-signup (no auth required)
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { setToken } from '../utils/api';
import toast from 'react-hot-toast';

const STEPS = ['Account', 'Domain', 'Plan'];
const PLATFORM_HOST = window.location.hostname;

function PasswordStrength({ password }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-500', 'bg-amber-400', 'bg-lime-500', 'bg-green-500'];
  if (!password) return null;
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= score ? colors[score] : 'bg-outline-variant/30'}`} />
        ))}
      </div>
      <span className="text-label-sm text-on-surface-variant">{labels[score]}</span>
    </div>
  );
}

function isValidDomain(val) {
  if (!val) return false;
  const clean = val.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
  if (clean.length > 253) return false;
  const parts = clean.split('.');
  if (parts.length < 2) return false;
  return parts.every(p => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(p));
}

export default function PartnerSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 0 — account
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Step 1 — domain
  const [customDomain, setCustomDomain] = useState('');
  const [domainError, setDomainError] = useState('');

  // Step 2 — plan
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    api.get('/plans')
      .then(r => {
        const paid = (r.data.plans || []).filter(p => p.active && p.price !== 0);
        setPlans(paid);
        if (paid.length) setSelectedPlan(paid.find(p => p.popular) || paid[0]);
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  const validateDomain = (val) => {
    const clean = (val || '').trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];
    if (!clean) return 'Domain is required';
    if (!isValidDomain(clean)) return 'Enter a valid domain (e.g. lab.yourschool.edu)';
    return '';
  };

  const handleNext = () => {
    if (step === 0) {
      if (!companyName.trim()) return toast.error('Organisation name is required');
      if (!email.includes('@')) return toast.error('Enter a valid email');
      if (password.length < 8) return toast.error('Password must be at least 8 characters');
    }
    if (step === 1) {
      const err = validateDomain(customDomain);
      if (err) { setDomainError(err); return; }
      setDomainError('');
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!selectedPlan && plans.length > 0) return toast.error('Select a plan');
    setSubmitting(true);
    try {
      const cleanDomain = customDomain.trim().toLowerCase()
        .replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];

      // 1. Create tenant + Tenant Admin account
      await api.post('/tenants/register', {
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
        password,
        appName: companyName.trim(),
        customDomain: cleanDomain,
      });

      // 2. Auto-login
      const { data: loginData } = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      setToken(loginData.token);

      // 3. Stripe Checkout if plan has a price ID
      if (selectedPlan && (selectedPlan.stripe_price_id || (yearly && selectedPlan.stripe_price_id_yearly))) {
        const { data: checkoutData } = await api.post('/billing/checkout', {
          plan_id: selectedPlan.id,
          yearly,
        });
        window.location.href = checkoutData.url;
        return;
      }

      // 4. No Stripe price configured yet → go straight to white-label setup
      toast.success('Account created! Set up your branding now.');
      navigate('/white-label');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Signup failed — please try again');
    }
    setSubmitting(false);
  };

  const cleanDomainPreview = customDomain
    ? customDomain.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0]
    : 'lab.yourschool.edu';

  return (
    <div className="min-h-screen bg-bg-off-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-headline-lg text-deep-navy">Start your white-label</h1>
          <p className="text-body-md text-on-surface-variant mt-2">
            Your own branded platform on your domain, ready in minutes.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-label-sm font-bold shrink-0 ${
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-indigo-accent text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {i < step
                    ? <span className="material-symbols-outlined text-[14px]">check</span>
                    : i + 1}
                </div>
                <span className={`text-label-sm hidden sm:block ${i === step ? 'text-deep-navy font-bold' : 'text-on-surface-variant'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-green-500' : 'bg-outline-variant/30'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-pure-white rounded-2xl shadow-[0_4px_24px_rgba(16,35,72,0.10)] border border-outline-variant/20 p-8">

          {/* ── Step 0: Account ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-headline-sm text-deep-navy">Create your account</h2>
              <div>
                <label className="text-label-md text-on-surface-variant block mb-1.5">Organisation / School name</label>
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Oakwood Academy"
                  autoFocus
                  className="w-full px-4 py-3 border border-outline-variant/50 rounded-xl text-body-md focus:ring-2 focus:ring-indigo-accent/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-label-md text-on-surface-variant block mb-1.5">Work email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@oakwood.edu"
                  className="w-full px-4 py-3 border border-outline-variant/50 rounded-xl text-body-md focus:ring-2 focus:ring-indigo-accent/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-label-md text-on-surface-variant block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-3 border border-outline-variant/50 rounded-xl text-body-md focus:ring-2 focus:ring-indigo-accent/30 focus:outline-none pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-3 material-symbols-outlined text-[20px] text-on-surface-variant"
                  >
                    {showPass ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>
            </div>
          )}

          {/* ── Step 1: Domain ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-headline-sm text-deep-navy">Your domain</h2>
              <p className="text-body-md text-on-surface-variant">
                Enter the domain you own where your branded platform will live.
              </p>

              <div>
                <label className="text-label-md text-on-surface-variant block mb-1.5">Custom domain</label>
                <input
                  value={customDomain}
                  onChange={e => { setCustomDomain(e.target.value); setDomainError(''); }}
                  placeholder="lab.oakwood.edu"
                  autoFocus
                  className={`w-full px-4 py-3 border rounded-xl text-body-md focus:ring-2 focus:ring-indigo-accent/30 focus:outline-none ${
                    domainError ? 'border-error' : 'border-outline-variant/50'
                  }`}
                />
                {domainError && (
                  <p className="text-body-sm text-error mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {domainError}
                  </p>
                )}
              </div>

              {/* CNAME instruction */}
              <div className="p-4 bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl space-y-2">
                <p className="text-label-sm font-bold text-deep-navy flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">dns</span>
                  Add this DNS record at your provider
                </p>
                <div className="bg-deep-navy text-white rounded-lg px-4 py-3 font-mono text-body-sm">
                  <span className="text-indigo-300">CNAME</span>{' '}
                  <span className="text-white">{cleanDomainPreview}</span>{' '}
                  <span className="text-indigo-300">→</span>{' '}
                  <span className="text-stem-orange">{PLATFORM_HOST}</span>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  Works with any DNS provider — GoDaddy, Namecheap, Google Domains, or others.
                  Propagation takes 2–10 minutes after you add it.
                </p>
              </div>

              {/* Live preview */}
              <div className="p-3 bg-surface-container-low rounded-xl flex items-center gap-3 border border-outline-variant/10">
                <div className="w-8 h-8 rounded-lg bg-indigo-accent/10 flex items-center justify-center text-indigo-accent font-bold text-label-md">
                  {companyName[0]?.toUpperCase() || 'Y'}
                </div>
                <div>
                  <p className="text-body-sm font-bold text-deep-navy">{companyName || 'Your Brand'}</p>
                  <p className="text-body-sm text-on-surface-variant font-mono">{cleanDomainPreview}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Plan ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="text-headline-sm text-deep-navy">Choose a plan</h2>
                <button
                  onClick={() => setYearly(v => !v)}
                  className={`px-3 py-1.5 rounded-full text-label-sm font-bold border transition-all ${
                    yearly ? 'bg-stem-orange text-white border-stem-orange' : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  {yearly ? 'Yearly (−20%)' : 'Switch to yearly'}
                </button>
              </div>

              {plansLoading ? (
                <div className="text-center py-8 text-on-surface-variant">Loading plans...</div>
              ) : plans.length === 0 ? (
                <div className="p-4 bg-surface-container-low rounded-xl text-center text-body-sm text-on-surface-variant">
                  No paid plans configured yet — you'll be set up and can choose a plan from your dashboard.
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map(plan => {
                    const price = plan.price !== null ? Number(plan.price) : null;
                    const display = yearly && price > 0 ? Math.round(price * 0.8) : price;
                    const selected = selectedPlan?.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          selected ? 'border-indigo-accent bg-indigo-accent/5' : 'border-outline-variant/20 hover:border-outline-variant/50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-indigo-accent' : 'border-outline-variant'}`}>
                              {selected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-accent" />}
                            </div>
                            <div>
                              <p className="text-label-md font-bold text-deep-navy">{plan.name}
                                {plan.popular && <span className="ml-2 px-2 py-0.5 bg-stem-orange text-white text-label-sm rounded-full font-normal">Popular</span>}
                              </p>
                              <p className="text-body-sm text-on-surface-variant mt-0.5">{plan.description}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-headline-sm text-deep-navy font-bold">
                              {price === null ? 'Custom' : `$${display}`}
                            </p>
                            {price !== null && (
                              <p className="text-body-sm text-on-surface-variant">/mo{yearly ? ' billed yearly' : ''}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  <p className="text-body-sm text-on-surface-variant text-center pt-1">
                    You'll be taken to Stripe to complete payment. Cancel anytime.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div className={`flex mt-8 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 border border-outline-variant/50 rounded-xl text-label-md hover:bg-surface-container"
              >
                ← Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-deep-navy text-white rounded-xl text-label-md font-bold hover:opacity-90"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 bg-stem-orange text-white rounded-xl text-label-md font-bold hover:brightness-90 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {submitting ? 'Creating account...' : plans.length === 0 ? 'Create account →' : 'Create account & pay →'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-body-sm text-on-surface-variant mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-accent font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
