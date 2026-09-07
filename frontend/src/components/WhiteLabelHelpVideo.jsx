import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const CHAPTERS = [
  { t: 0, title: 'White-Label Overview', desc: 'White-label = your domain + your branding, same codebase. 3 steps, synced across /tenants, /white-label, /design.', mock: 'intro' },
  { t: 5, title: 'Step 1 — Create Institution', desc: 'At /tenants → Add New Institution: name, app name, enter your custom domain.', mock: 'tenants' },
  { t: 22, title: 'Step 2 — Domain', desc: 'Enter your custom domain (lab.school.edu). Add 1 CNAME record pointing to this platform host.', mock: 'domain' },
  { t: 42, title: 'Step 3 — Branding', desc: 'Upload logo (2MB), pick colors, preset swatches, WCAG check. Preview live.', mock: 'branding' },
  { t: 62, title: 'Step 4 — DNS', desc: 'Add 1 CNAME record at your DNS provider. SSL via your host or proxy. Propagation 2–5 min.', mock: 'dns' },
  { t: 82, title: 'Step 5 — Verify & Go Live', desc: 'Click Verify → DNS check. Then open https://{domain}. Synced everywhere.', mock: 'verify' },
];

export default function WhiteLabelHelpVideo({ open, onClose }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const duration = 95; // seconds
  const rafRef = useRef(null);
  const lastTickRef = useRef(null);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setTime(prev => {
        const next = prev + dt;
        if (next >= duration) { setPlaying(false); return duration; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  useEffect(() => { if (!open) { setPlaying(false); setTime(0); } }, [open]);

  if (!isSuperAdmin) return null;
  if (!open) return null;

  const chapter = [...CHAPTERS].reverse().find(c => time >= c.t) || CHAPTERS[0];
  const progress = (time / duration) * 100;

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setTime(pct * duration);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-pure-white rounded-2xl shadow-2xl w-full max-w-[880px] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="bg-deep-navy text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center material-symbols-outlined">play_circle</span>
            <div>
              <p className="text-label-md font-bold leading-none">White-Label Setup — 2 min video</p>
              <p className="text-body-sm text-white/70 leading-none mt-1">Super Admin only • All steps • Synced wizard</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">close</span></button>
        </div>

        {/* Video area — synthetic video player super admin only */}
        <div className="relative bg-[#0b1220] aspect-video flex flex-col">
          {/* Mock screen */}
          <div className="flex-1 flex items-center justify-center p-6">
            {chapter.mock === 'intro' && (
              <div className="w-full max-w-xl bg-white rounded-xl p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-accent flex items-center justify-center text-white material-symbols-outlined">rocket_launch</div>
                <h3 className="text-headline-sm text-deep-navy mt-3">Your domain. Your branding.</h3>
                <p className="text-body-sm text-on-surface-variant mt-2">1 domain + 1 branding → live on your domain. Synced: /tenants ↔ /white-label ↔ /design</p>
                <div className="mt-4 flex justify-center gap-2 text-label-sm"><span className="px-3 py-1 rounded-full bg-indigo-accent/10 text-indigo-accent">/tenants</span><span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">/white-label</span><span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700">/design</span></div>
              </div>
            )}
            {chapter.mock === 'tenants' && (
              <div className="w-full max-w-xl bg-white rounded-xl p-5 text-left">
                <p className="text-label-sm text-indigo-accent font-bold">/tenants → Add New Institution</p>
                <div className="mt-3 space-y-2">
                  <div className="h-8 bg-surface-container rounded flex items-center px-3 text-body-sm">Oakwood Academy</div>
                  <div className="h-8 bg-surface-container rounded flex items-center px-3 text-body-sm text-on-surface-variant">lab.school.edu</div>
                </div>
              </div>
            )}
            {chapter.mock === 'domain' && (
              <div className="w-full max-w-xl bg-white rounded-xl p-5">
                <p className="text-label-sm font-bold text-deep-navy">CNAME lab.school.edu → your-platform-host.com</p>
                <code className="block mt-3 bg-deep-navy text-white px-3 py-2 rounded-lg font-mono text-body-sm">CNAME lab.school.edu → your-platform-host.com</code>
                <p className="text-body-sm text-on-surface-variant mt-2">Add 1 CNAME record at your DNS provider pointing to the platform host. SSL handled by your host.</p>
              </div>
            )}
            {chapter.mock === 'branding' && (
              <div className="w-full max-w-xl bg-white rounded-xl p-5 flex gap-4">
                <div className="flex-1"><p className="text-label-sm font-bold">Logo</p><div className="mt-2 h-20 border-2 border-dashed rounded-xl flex items-center justify-center text-body-sm text-on-surface-variant">Drag logo</div></div>
                <div className="flex-1"><p className="text-label-sm font-bold">Colors</p><div className="mt-2 flex gap-2"><div className="w-8 h-8 rounded bg-[#102348]"/><div className="flex-1 h-8 border rounded px-2 flex items-center font-mono text-body-sm">#102348</div></div><div className="mt-2 text-body-sm text-emerald-600">WCAG AA ✓ 4.8:1</div></div>
              </div>
            )}
            {chapter.mock === 'dns' && (
              <div className="w-full max-w-xl bg-indigo-accent/10 border border-indigo-accent/20 rounded-xl p-5">
                <p className="text-label-sm font-bold text-indigo-accent flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">dns</span> Add at your DNS provider (GoDaddy, Namecheap, etc.)</p>
                <p className="text-body-sm text-deep-navy mt-2">Type: CNAME &nbsp; Host: lab &nbsp; Value: your-platform-host.com &nbsp; TTL: 3600</p>
                <p className="text-body-sm text-on-surface-variant mt-1">Enable proxied (orange cloud) for auto SSL.</p>
              </div>
            )}
            {chapter.mock === 'verify' && (
              <div className="w-full max-w-xl bg-white rounded-xl p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center"><span className="material-symbols-outlined text-emerald-600">verified</span></div>
                <h3 className="text-headline-sm text-deep-navy mt-3">Verified ✓ — You are live!</h3>
                <p className="text-body-sm text-on-surface-variant">https://lab.school.edu → your white-label portal</p>
                <p className="text-body-sm text-indigo-accent mt-2">Synced across all 3 pages</p>
              </div>
            )}
          </div>

          {/* Chapter label */}
          <div className="absolute bottom-[56px] left-4 right-4 bg-black/60 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-white text-deep-navy flex items-center justify-center text-label-sm font-bold">{CHAPTERS.indexOf(chapter)+1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-label-sm text-white font-bold truncate">{chapter.title}</p>
              <p className="text-body-sm text-white/70 truncate">{chapter.desc}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-4 py-3 flex items-center gap-3">
            <button onClick={()=> setPlaying(p=>!p)} className="w-9 h-9 rounded-full bg-white text-deep-navy flex items-center justify-center hover:brightness-95">
              <span className="material-symbols-outlined text-[20px]">{playing ? 'pause' : 'play_arrow'}</span>
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer" onClick={seek}>
                <div className="h-full bg-stem-orange" style={{width: `${progress}%`}} />
              </div>
              <div className="flex justify-between mt-1 text-body-sm text-white/70 font-mono text-[11px]"><span>{Math.floor(time/60)}:{String(Math.floor(time%60)).padStart(2,'0')}</span><span>1:35</span></div>
            </div>
            <span className="text-body-sm text-white/70 hidden sm:block">Super Admin only</span>
          </div>
        </div>

        {/* Chapters */}
        <div className="px-5 py-4 flex gap-2 overflow-x-auto border-t border-outline-variant/20">
          {CHAPTERS.map((c,i)=> (
            <button key={c.t} onClick={()=> setTime(c.t)} className={`shrink-0 px-3 py-2 rounded-lg border text-left ${chapter.t===c.t ? 'bg-indigo-accent text-white border-indigo-accent' : 'bg-surface-container-low border-outline-variant/20 hover:border-indigo-accent/30'}`}>
              <p className="text-label-sm font-bold leading-none">{i+1}. {c.title.split('—')[0].trim()}</p>
              <p className="text-[11px] opacity-70 leading-none mt-1">{c.t}s</p>
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <span className="text-label-sm text-on-surface-variant">Help docs:</span>
            <a href="/docs/white-label" target="_blank" rel="noreferrer" className="text-label-sm text-indigo-accent hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">article</span> White-Label</a>
            <span className="text-outline">•</span>
            <a href="/docs/api" target="_blank" rel="noreferrer" className="text-label-sm text-indigo-accent hover:underline">API</a>
            <span className="text-outline">•</span>
            <a href="/docs/deployment" target="_blank" rel="noreferrer" className="text-label-sm text-indigo-accent hover:underline">Deployment</a>
            <span className="text-outline">•</span>
            <a href="/docs/WHITE_LABEL.md" target="_blank" rel="noreferrer" className="text-label-sm text-indigo-accent hover:underline">Raw MD</a>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-body-sm text-on-surface-variant">Use bot for interactive tour, or watch this 95s overview.</span>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-deep-navy text-white text-label-sm font-bold">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
