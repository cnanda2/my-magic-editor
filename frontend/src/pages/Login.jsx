import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const HERO_IMG =
  "https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

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
      await login(email, password);
      toast.success('Welcome back!');
      // Redirect to the hardware editor.
      window.location.href = '/editor.html';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const sso = (provider) => {
    window.location.href = `/api/auth/${provider}`;
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
            <img src="/logo.png" alt="The STEM Educator" className="h-8 w-auto mb-2" />
            <h1 className="text-headline-md text-primary">Welcome Back</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Sign in to manage your STEM academy.
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

            <button type="submit" disabled={loading} className="w-full bg-stem-orange text-pure-white text-label-md py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60">
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Signing in...</>
              ) : (
                <>Sign In <span className="material-symbols-outlined text-[18px]">school</span></>
              )}
            </button>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-outline-variant" />
              <span className="mx-3 text-label-sm text-on-surface-variant uppercase tracking-widest bg-pure-white px-1">SSO</span>
              <div className="flex-grow border-t border-outline-variant" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => sso('google')} className="flex items-center justify-center gap-2 py-2.5 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="text-label-sm text-on-surface">Google</span>
              </button>
              <button type="button" onClick={() => sso('microsoft')} className="flex items-center justify-center gap-2 py-2.5 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 23 23">
                  <path d="M1 1h10v10H1z" fill="#f35325" /><path d="M12 1h10v10H12z" fill="#81bc06" />
                  <path d="M1 12h10v10H1z" fill="#05a6f0" /><path d="M12 12h10v10H12z" fill="#ffba08" />
                </svg>
                <span className="text-label-sm text-on-surface">Microsoft</span>
              </button>
            </div>
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
