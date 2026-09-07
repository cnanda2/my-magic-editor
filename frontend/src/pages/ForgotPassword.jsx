import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

const LAB_IMG =
  "https://lh3.googleusercontent.com/aida/AP1WRLtt3OHzf3ryW1B1gMTrhDULcPtjG-D2rvw24EkneFBaetCFqdGpBPPZju2wn8jodnWheMHaF3pknqzYRgV-dv2tTeRgQtfeQSpoFNfBw0ayD88yHPT9BVp4X5OfYWAY1mLiB6kc-ioYDOf9AKoNbLZCAQiaNSQXf7ChBSD95lNX7ORc205xQyzazQDbjCbQe2XcTMYw4f_DmvzXdgF1XN4f0j4axv-vRZt_kAaMqhdC6HKecLPEPsGWzlsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Endpoint is best-effort; we always show success to avoid email enumeration.
      await api.post('/auth/forgot-password', { email }).catch(() => {});
      setSent(true);
      toast.success('Reset link sent successfully.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left branding */}
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden items-center justify-center p-margin-desktop">
        <div className="absolute inset-0">
          <img alt="Robotics Lab" className="w-full h-full object-cover" src={LAB_IMG} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(16,35,72,0.85) 0%, rgba(16,35,72,0.7) 100%)' }} />
        </div>
        <div className="relative z-10 max-w-xl text-pure-white space-y-stack-md px-8">
          <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-xl inline-block border border-white/20">
            <img src="/logo.png" alt="Platform Logo" className="h-8 w-auto" />
          </div>
          <h1 className="text-headline-xl leading-tight">Empowering the next generation of innovators.</h1>
          <p className="text-body-lg opacity-90 leading-relaxed">
            Access high-level pedagogy tools and complex scientific modules designed for the modern classroom.
            Restore your journey of discovery today.
          </p>
        </div>
      </section>

      {/* Right form */}
      <section className="flex-1 flex flex-col bg-pure-white justify-center px-margin-mobile md:px-margin-desktop py-12">
        <div className="max-w-md w-full mx-auto space-y-stack-sm mb-stack-md">
          <Link to="/login" className="inline-flex items-center text-on-surface-variant hover:text-stem-orange transition-colors group">
            <span className="material-symbols-outlined mr-2">arrow_back</span>
            <span className="text-label-md">Back to Login</span>
          </Link>
          <h2 className="text-headline-lg text-deep-navy pt-4">Reset your password</h2>
          <p className="text-body-md text-on-surface-variant">
            Enter your registered institutional email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form className="max-w-md w-full mx-auto space-y-stack-md" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-label-sm text-on-surface-variant uppercase tracking-wider" htmlFor="email">
              Institutional Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="educator@institution.edu"
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-stem-orange focus:ring-2 focus:ring-stem-orange/20 transition-all"
              />
            </div>
            <p className="text-body-sm text-on-surface-variant flex items-center gap-2 mt-2">
              <span className="material-symbols-outlined text-sm">info</span>
              Check your institutional spam folder if you don't receive it.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || sent}
            className="w-full bg-stem-orange text-pure-white py-4 rounded-lg text-label-md uppercase tracking-widest font-bold hover:brightness-95 active:scale-95 transition-all ambient-shadow disabled:opacity-60"
          >
            {loading ? 'Sending…' : sent ? 'Link Sent!' : 'Send Reset Link'}
          </button>
        </form>

        <div className="max-w-md w-full mx-auto mt-stack-lg pt-stack-md border-t border-surface-container">
          <p className="text-body-sm text-on-surface-variant text-center">
            Having trouble? <a className="text-indigo-accent font-bold hover:underline" href="#">Contact Institutional IT Support</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
