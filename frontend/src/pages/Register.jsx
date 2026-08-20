import { useState } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Allow pre-selecting a role, e.g. /register?role=Student (from "Add Student")
  const presetRole = searchParams.get('role') || 'user';
  const isStudent = presetRole === 'Student';
  const [form, setForm] = useState({ full_name: '', email: '', institution: '', password: '' });
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agree) return toast.error('Please accept the Terms of Service');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      // username derived from email local-part
      const username = form.email.split('@')[0];
      await register({
        username,
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        institution: form.institution,
        role: presetRole,
      });
      toast.success(isStudent ? 'Student account created!' : 'Welcome aboard!');
      navigate('/users', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const field = (id, label, icon, type = 'text', placeholder = '') => (
    <div className="space-y-1">
      <label className="text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-outline pointer-events-none">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <input
          id={id}
          type={type}
          required
          value={form[id]}
          onChange={update(id)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-surface text-body-md border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-stem-orange focus:border-transparent transition-all"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8f9ff]">
      <main className="w-full max-w-[1000px] grid lg:grid-cols-2 bg-pure-white rounded-xl border border-outline-variant shadow-xl overflow-hidden">
        {/* Left visual */}
        <section className="relative hidden lg:flex flex-col justify-between p-stack-lg bg-deep-navy text-white overflow-hidden">
          <div className="z-10">
            <div className="bg-white/10 backdrop-blur-sm px-5 py-3 rounded-xl inline-block border border-white/20 mb-stack-lg">
              <img src="/logo.png" alt="The STEM Educator" className="h-8 w-auto" />
            </div>
            <h2 className="text-headline-xl leading-tight mt-stack-lg">
              Empowering the next<br />generation of <span className="text-stem-orange">innovators.</span>
            </h2>
            <p className="text-body-lg text-slate-300 mt-stack-md max-w-sm">
              Access premium STEM curriculum, lab management tools, and educator resources designed for modern classrooms.
            </p>
          </div>
          <div className="z-10 border-t border-white/10 pt-stack-md">
            <div className="flex gap-1 text-stem-orange mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              ))}
            </div>
            <p className="text-body-sm italic text-slate-200">
              "The curriculum quality and lab tracking features have transformed our science department."
            </p>
            <p className="text-label-md mt-1">— Head of Science, Oakwood Academy</p>
          </div>
        </section>

        {/* Right form */}
        <section className="p-8 lg:p-12 flex flex-col justify-center bg-white">
          <header className="mb-stack-lg">
            <h1 className="text-headline-md text-deep-navy mb-1">
              {isStudent ? 'Add Student' : 'Create your account'}
            </h1>
            <p className="text-body-md text-on-surface-variant">
              {isStudent
                ? 'Create a new student account for The STEM Educator platform.'
                : 'Join our community of over 10,000 STEM educators.'}
            </p>
          </header>

          <form className="space-y-stack-md" onSubmit={handleSubmit}>
            {field('full_name', 'Full Name', 'person', 'text', 'Enter your full name')}
            {field('email', 'Institutional Email', 'mail', 'email', 'name@school.edu')}
            {field('institution', 'Institution / School', 'account_balance', 'text', 'Enter your school name')}

            <div className="space-y-1">
              <label className="text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </span>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-surface text-body-md border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-stem-orange focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-deep-navy"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <p className="text-[10px] text-on-surface-variant/70 mt-1">At least 8 characters with letters, numbers, and symbols.</p>
            </div>

            <div className="flex items-start gap-3 py-2">
              <input
                id="terms"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-outline-variant text-stem-orange focus:ring-stem-orange cursor-pointer"
              />
              <label className="text-body-sm text-on-surface-variant" htmlFor="terms">
                I agree to the <a className="text-stem-orange font-semibold hover:underline" href="#">Terms of Service</a> and{' '}
                <a className="text-stem-orange font-semibold hover:underline" href="#">Privacy Policy</a>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-stem-orange hover:brightness-95 text-white text-headline-sm rounded-lg shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <><span className="material-symbols-outlined animate-spin">progress_activity</span> Setting up profile…</>
              ) : (
                <>Create Account <span className="material-symbols-outlined text-[20px]">arrow_forward</span></>
              )}
            </button>
          </form>

          <footer className="mt-stack-lg pt-stack-md border-t border-outline-variant/30 text-center">
            <p className="text-body-md text-on-surface-variant">
              Already an educator with us?{' '}
              <Link to="/login" className="text-deep-navy font-bold hover:text-stem-orange transition-colors underline underline-offset-4 decoration-2 decoration-outline-variant">
                Sign in to Dashboard
              </Link>
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
