import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';

function FeaturesList({ features, popular }) {
  const list = Array.isArray(features) ? features : [];
  return (
    <ul className="space-y-4 mb-8 flex-grow">
      {list.map((f, i) => {
        const text = typeof f === 'string' ? f : (f.text || '');
        const included = typeof f === 'string' ? true : (f.included !== false);
        return (
          <li key={i} className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-[20px] ${included ? (popular ? 'text-stem-orange' : 'text-indigo-accent') : 'text-outline-variant'}`}
              style={included ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {included ? 'check_circle' : 'cancel'}
            </span>
            <span className={`text-body-md ${f.bold ? 'font-bold' : ''} ${!included ? 'text-on-surface-variant/50 line-through' : ''}`}>{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function PricingCard({ plan, yearly, currency }) {
  const ref = useRef(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.remove('opacity-0', 'translate-y-4');
        el.classList.add('opacity-100', 'translate-y-0');
        observer.unobserve(el);
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSubscribe = async () => {
    if (plan.price === 0) return; // free plan — nothing to do
    if (plan.price === null) { window.location.href = 'mailto:sales@example.com'; return; }
    setCheckoutLoading(true);
    try {
      const { data } = await api.post('/billing/checkout', { plan_id: plan.id, yearly });
      window.location.href = data.url;
    } catch (e) {
      const msg = e.response?.data?.error || 'Could not start checkout';
      toast.error(msg);
    }
    setCheckoutLoading(false);
  };

  const price = plan.price === null || plan.price === undefined ? null : Number(plan.price);

  return (
    <div
      ref={ref}
      className={`bg-pure-white rounded-xl shadow-[0_4px_12px_rgba(16,35,72,0.12)] p-8 flex flex-col border transition-all duration-700 opacity-0 translate-y-4 ${
        plan.popular
          ? 'border-2 border-stem-orange relative transform md:scale-105 z-10'
          : 'border border-outline-variant/20 hover:scale-[1.02]'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-stem-orange text-pure-white px-4 py-1 rounded-full text-label-sm uppercase tracking-wider">
          Best Value
        </div>
      )}
      <div className="mb-8">
        <h3 className="text-headline-md text-deep-navy mb-2">{plan.name}</h3>
        <p className="text-body-sm text-on-surface-variant mb-6">{plan.description}</p>
        <div className="flex items-baseline gap-1">
          {price !== null && price !== undefined ? (
            <>
              <span className="text-headline-xl text-deep-navy">{currency}{yearly && price > 0 ? Math.round(price * 0.8) : price}</span>
              <span className="text-label-md text-on-surface-variant">/month</span>
            </>
          ) : (
            <span className="text-headline-xl text-deep-navy">Custom</span>
          )}
        </div>
      </div>
      <FeaturesList features={plan.features} popular={plan.popular} />
      <button
        onClick={handleSubscribe}
        disabled={checkoutLoading || price === 0}
        className={`w-full py-3 rounded-lg text-label-md font-medium transition-all ${
          price === 0
            ? 'bg-surface-container text-on-surface-variant cursor-default'
            : plan.popular
            ? 'bg-stem-orange text-pure-white hover:brightness-90 disabled:opacity-50'
            : 'bg-deep-navy text-pure-white hover:opacity-90 disabled:opacity-50'
        }`}
      >
        {checkoutLoading ? 'Redirecting...' :
          price === 0 ? 'Current Free Plan' :
          price === null ? 'Contact Sales' :
          `Get ${plan.name}`}
      </button>
    </div>
  );
}

function EditableField({ value, onChange, multiline }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => { setVal(value); }, [value]);

  if (!editing) {
    return (
      <div className="group relative cursor-pointer" onClick={() => setEditing(true)}>
        <div className={multiline ? '' : ''}>{value || <span className="text-outline-variant italic">Click to edit...</span>}</div>
        <span className="absolute top-0 right-0 material-symbols-outlined text-[16px] text-indigo-accent opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
      </div>
    );
  }

  const save = () => { onChange(val); setEditing(false); };
  const cancel = () => { setVal(value); setEditing(false); };

  return (
    <div className="flex gap-2">
      {multiline ? (
        <textarea value={val} onChange={e => setVal(e.target.value)} className="flex-1 p-2 border border-indigo-accent rounded text-body-sm outline-none resize-none" rows={2} autoFocus />
      ) : (
        <input value={val} onChange={e => setVal(e.target.value)} className="flex-1 p-2 border border-indigo-accent rounded text-body-sm outline-none" autoFocus />
      )}
      <button onClick={save} className="material-symbols-outlined text-[20px] text-emerald-600 hover:text-emerald-800">check</button>
      <button onClick={cancel} className="material-symbols-outlined text-[20px] text-error hover:opacity-80">close</button>
    </div>
  );
}

function FaqItem({ faq, editMode, onUpdate }) {
  const [open, setOpen] = useState(false);
  if (editMode) {
    return (
      <div className="bg-pure-white rounded-lg p-6 border border-indigo-accent/30 shadow-sm">
        <div className="mb-2">
          <label className="text-label-sm text-on-surface-variant mb-1 block">Question</label>
          <input value={faq.q} onChange={e => onUpdate('q', e.target.value)} className="w-full p-2 border border-outline-variant rounded text-body-sm" />
        </div>
        <div>
          <label className="text-label-sm text-on-surface-variant mb-1 block">Answer</label>
          <textarea value={faq.a} onChange={e => onUpdate('a', e.target.value)} className="w-full p-2 border border-outline-variant rounded text-body-sm resize-none" rows={2} />
        </div>
      </div>
    );
  }
  return (
    <div
      className="bg-pure-white rounded-lg p-6 border border-outline-variant/10 shadow-sm cursor-pointer group hover:bg-surface-container-low transition-all"
      onClick={() => setOpen(!open)}
    >
      <div className="flex justify-between items-center">
        <h4 className="text-body-lg text-deep-navy font-bold">{faq.q}</h4>
        <span className={`material-symbols-outlined text-on-surface-variant group-hover:text-stem-orange transition-all ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </div>
      {open && <div className="mt-4 text-body-md text-on-surface-variant border-t border-outline-variant/10 pt-4">{faq.a}</div>}
    </div>
  );
}

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [plans, setPlans] = useState([]);
  const [content, setContent] = useState({ hero: { title: '', subtitle: '' }, compare: [], faqs: [], trust: [], currency: '$' });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/plans').then(r => setPlans(r.data.plans || [])).catch(() => {});
    api.get('/content/pricing').then(r => setContent(r.data.content || content)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const updateContent = (path, value) => {
    setContent(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = copy;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  const updateFaq = (idx, field, value) => {
    setContent(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.faqs[idx][field] = value;
      return copy;
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await api.patch('/admin/content/pricing', { content });
      toast.success('Pricing page content saved');
      setEditMode(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <AdminLayout>
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-headline-xl text-deep-navy leading-tight">Pricing Page Content</h1>
          <p className="text-on-surface-variant mt-2 text-body-md">Manage the public pricing page — hero text, plans, comparison table, and FAQs.</p>
        </div>
        <div className="flex items-center gap-3">
          {editMode ? (
            <>
              <button onClick={() => { setEditMode(false); load(); }} className="px-5 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg text-label-md hover:bg-surface-container transition-all">
                Discard
              </button>
              <button onClick={saveAll} disabled={saving} className="px-5 py-2.5 bg-stem-orange text-pure-white rounded-lg text-label-md hover:brightness-90 disabled:opacity-50 transition-all">
                {saving ? 'Saving...' : 'Publish Changes'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => window.open('/pricing', '_blank')} className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant text-on-surface-variant rounded-lg text-label-md hover:bg-surface-container transition-all">
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Live Preview
              </button>
              <button onClick={() => setEditMode(true)} className="flex items-center gap-2 px-5 py-2.5 bg-deep-navy text-pure-white rounded-lg text-label-md hover:opacity-90 transition-all">
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Content
              </button>
            </>
          )}
        </div>
      </header>

      {/* Plans info banner */}
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-8 flex items-center gap-3 text-body-sm">
        <span className="material-symbols-outlined text-[20px]">info</span>
        <span>Plan cards and feature comparison are automatically synced from <strong>Subscription &amp; Billing &rarr; Global Plan Settings</strong>. Only hero text, FAQs, trust logos, and currency are editable below.</span>
      </div>

      {/* Toggle */}
      {plans.some(p => p.price > 0) && (
        <div className="flex justify-center items-center gap-4 mb-stack-lg">
          <span className={`text-label-md ${!yearly ? 'text-on-surface' : 'text-on-surface-variant'}`}>Monthly</span>
          <button onClick={() => setYearly(!yearly)} className="relative w-14 h-8 bg-deep-navy rounded-full p-1 transition-all">
            <div className={`w-6 h-6 bg-pure-white rounded-full shadow-sm transition-transform duration-300 ${yearly ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-label-md ${yearly ? 'text-on-surface' : 'text-on-surface-variant'}`}>Yearly</span>
          <span className="bg-secondary-fixed text-on-secondary-fixed text-label-sm px-2 py-1 rounded-full">Save 20%</span>
        </div>
      )}

      {/* Currency Toggle (edit mode) */}
      {editMode && (
        <div className="mb-6 flex items-center justify-center gap-4 p-4 bg-pure-white rounded-xl border border-outline-variant shadow-sm">
          <span className="text-label-sm text-on-surface-variant">Display Currency:</span>
          {['$', '₹'].map(c => (
            <button
              key={c}
              onClick={() => updateContent('currency', c)}
              className={`px-5 py-2 rounded-lg text-label-md transition-all ${content.currency === c ? 'bg-deep-navy text-pure-white' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
            >
              {c} {c === '$' ? 'USD' : 'INR'}
            </button>
          ))}
        </div>
      )}

      {/* Hero Section */}
      <div className={`mb-stack-lg text-center space-y-4 p-6 rounded-xl ${editMode ? 'border-2 border-dashed border-indigo-accent/40 bg-indigo-accent/5' : ''}`}>
        {editMode ? (
          <>
            <div className="max-w-2xl mx-auto">
              <EditableField value={content.hero.title} onChange={v => updateContent('hero.title', v)} />
            </div>
            <div className="max-w-2xl mx-auto">
              <EditableField value={content.hero.subtitle} onChange={v => updateContent('hero.subtitle', v)} multiline />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-headline-xl text-deep-navy">{content.hero.title}</h1>
            <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">{content.hero.subtitle}</p>
          </>
        )}
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter items-stretch mb-stack-lg">
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} yearly={yearly} currency={content.currency || '$'} />
        ))}
      </div>

      {/* Feature Comparison (auto-synced with billing_plans) */}
      <section className="mb-stack-lg p-6 rounded-xl">
        <h2 className="text-headline-lg text-deep-navy text-center mb-stack-md">Compare All Features</h2>
        {content.compare && content.compare.length > 0 && (() => {
          const planCols = Object.keys(content.compare[0]).filter(k => k !== 'feature');
          return (
            <div className="bg-pure-white rounded-xl shadow-[0_4px_12px_rgba(16,35,72,0.12)] overflow-hidden border border-outline-variant/10">
              <table className="w-full border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="text-left p-6 text-label-md text-deep-navy border-b border-outline-variant/20 w-1/4">Feature</th>
                    {planCols.map((col, ci) => (
                      <th key={col} className={`text-center p-6 text-label-md border-b border-outline-variant/20 ${ci === 1 ? 'text-stem-orange' : 'text-on-surface-variant'}`}>
                        {plans.find(p => p.id === col)?.name || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {content.compare.map((row, i) => (
                    <tr key={i}>
                      <td className="p-6 text-body-md text-deep-navy">{row.feature}</td>
                      {planCols.map(col => (
                        <td key={col} className="text-center p-6 text-on-surface-variant">
                          {row[col] === true
                            ? <span className="material-symbols-outlined text-stem-orange" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                            : <span className="material-symbols-outlined text-outline">remove</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </section>

      {/* FAQs */}
      <section className={`max-w-3xl mx-auto mb-stack-lg p-6 rounded-xl ${editMode ? 'border-2 border-dashed border-indigo-accent/40 bg-indigo-accent/5' : ''}`}>
        <h2 className="text-headline-lg text-deep-navy text-center mb-stack-md">Frequently Asked Questions</h2>
        {editMode && (
          <div className="mb-4 flex gap-2">
            <button onClick={() => updateContent('faqs', [...content.faqs, { q: 'New question?', a: 'Answer here.' }])} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-accent/10 text-indigo-accent rounded text-label-sm hover:bg-indigo-accent/20">
              <span className="material-symbols-outlined text-[16px]">add</span> Add FAQ
            </button>
          </div>
        )}
        <div className="space-y-4">
          {content.faqs.map((faq, i) => (
            <div key={i} className="relative">
              {editMode && (
                <button onClick={() => {
                  const copy = [...content.faqs];
                  copy.splice(i, 1);
                  updateContent('faqs', copy);
                }} className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-error text-pure-white rounded-full flex items-center justify-center text-[12px] hover:opacity-80">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
              <FaqItem faq={faq} editMode={editMode} onUpdate={(field, value) => updateFaq(i, field, value)} />
            </div>
          ))}
        </div>
      </section>

      {/* Trust logos */}
      <section className={`mb-stack-lg py-stack-lg border-t border-outline-variant/20 p-6 rounded-xl ${editMode ? 'border-2 border-dashed border-indigo-accent/40' : ''}`}>
        <p className="text-center text-label-md text-on-surface-variant uppercase tracking-[0.2em] mb-stack-md">Trusted by Leading Institutions</p>
        <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-40">
          {(content.trust || []).map((name, i) => (
            <div key={i} className="h-10 w-32 bg-on-surface-variant/20 rounded flex items-center justify-center font-bold text-lg">{name}</div>
          ))}
        </div>
      </section>
    </AdminLayout>
  );
}
