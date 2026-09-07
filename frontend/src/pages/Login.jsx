import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';

const HERO_IMG =
  "https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80";

export default function Login() {
  const { login } = useAuth();
  const brand = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const appName = brand?.appName || 'Hardware Blocks';
  const logoUrl = brand?.logoUrl || '/logo.png';
  const primaryColor = brand?.primaryColor || '#EA8E0A';
  const headline = brand?.config?.loginHeadline || 'Welcome Back';
  const supportText = brand?.config?.loginSupportText || 'Sign in to manage your STEM academy.';

  // Surface SSO callback errors passed via ?error=
  useEffect(() => {
    const err = new URLSearchParams(location.search).get('error');
    if (err) toast.error(decodeURIComponent(err));
  }, [location.search]);

  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back!');
      window.location.href = `/editor.html?tenant_id=${user?.tenant_id || ''}`;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-pure-white text-on-surface">
      {/* Visual side */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container-highest overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${HERO_IMG}')` }} />
        <div className="absolute inset-0 bg-deep-navy/40" />
        <div className="relative z-20 flex flex-col justify-end px-stack-lg pb-stack-lg w-full">
          <div className="max-w-md">
            <h2 className="text-headline-xl text-pure-white mb-stack-md leading-tight drop-shadow-lg">
              Think Smart. Build Smart.
            </h2>
            <p className="text-body-lg text-pure-white/90 leading-relaxed max-w-sm">
              Access our comprehensive platform for STEM educators to manage curriculum and track student progress.
            </p>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="w-full lg:w-1/2 bg-pure-white flex flex-col items-center justify-center p-4 md:p-6 relative">
        <div className="w-full max-w-[420px] rounded-xl px-6 py-5 flex flex-col border border-[#E2E8F0] bg-pure-white shadow-sm">
          <div className="mb-4">
            <img src={logoUrl} alt={appName} className="h-8 w-auto mb-2 object-contain" />
            <h1 className="text-headline-md text-primary">{headline}</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {supportText}
            </p>
          </div>

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="email">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">alternate_email</span>
                </div>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="educator@school.edu" className="w-full pl-9 pr-3 py-2.5 bg-background border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-stem-orange focus:border-transparent transition-all" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="text-label-sm text-stem-orange hover:text-primary transition-colors">Forgot?</Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">lock_open</span>
                </div>
                <input id="password" type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-9 pr-9 py-2.5 bg-background border border-outline-variant rounded-lg text-body-sm focus:outline-none focus:ring-2 focus:ring-stem-orange focus:border-transparent transition-all" />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-outline hover:text-on-surface">
                  <span className="material-symbols-outlined text-[18px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 py-0.5 cursor-pointer">
              <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded border-outline-variant text-stem-orange focus:ring-stem-orange" />
              <span className="text-body-sm text-on-surface-variant select-none">Keep me signed in</span>
            </label>

            <button type="submit" disabled={loading} className="w-full text-pure-white text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60" style={{ backgroundColor: primaryColor }}>
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Signing in...</>
              ) : (
                <>Sign In <span className="material-symbols-outlined text-[18px]">school</span></>
              )}
            </button>

          </form>

          <div className="mt-4 pt-3 border-t border-outline-variant text-center">
            <p className="text-body-sm text-on-surface-variant">
              New organization?
              <Link to="/register" className="text-stem-orange font-bold hover:text-primary ml-1 transition-colors">Register</Link>
            </p>
          </div>
        </div>

        <div className="mt-3 flex justify-center gap-3 text-on-surface-variant text-label-sm">
          <a className="hover:text-primary transition-colors" href="#">Privacy</a>
          <span>•</span>
          <a className="hover:text-primary transition-colors" href="#">Support</a>
          <span>•</span>
          <a className="hover:text-primary transition-colors" href="#">Guidelines</a>
        </div>
      </div>
    </div>
  );
}
