import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../utils/api';

const STATUS_STYLE = {
  SUCCESS: 'text-secondary',
  BLOCKED: 'text-error',
  FAILURE: 'text-error',
  IN_PROGRESS: 'text-on-surface-variant',
};

const ACTION_STYLE = {
  PERMISSION_UPDATE: 'bg-indigo-accent/10 text-indigo-accent',
  LOGIN_ATTEMPT: 'bg-surface-container-highest text-on-surface-variant',
  AUTH_FAILURE: 'bg-error-container text-on-error-container',
  BACKUP_INITIATED: 'bg-stem-orange/10 text-stem-orange',
  USER_CREATED: 'bg-indigo-accent/10 text-indigo-accent',
  USER_UPDATED: 'bg-surface-container-highest text-on-surface-variant',
  USER_DELETED: 'bg-error-container text-on-error-container',
  ROLE_CREATED: 'bg-indigo-accent/10 text-indigo-accent',
};

const TIMELINE = [
  { color: 'bg-stem-orange', title: 'Critical Config Changed', desc: 'Global firewall settings updated by admin_jdoe.', time: '12 MINUTES AGO' },
  { color: 'bg-indigo-accent', title: 'New Admin Invited', desc: 'Robert Chen invited as "Security Auditor".', time: '2 HOURS AGO' },
  { color: 'bg-secondary', title: 'Monthly Data Export', desc: 'User activity records exported for compliance. SHA-256: e3b0c44…', time: '4 HOURS AGO' },
  { color: 'bg-outline', title: 'Automatic Update Check', desc: 'System components verified against registry.', time: '1 DAY AGO' },
];

function fmtTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    api.get('/admin/audit', { params: { page, pageSize } })
      .then((r) => {
        setLogs(r.data.logs);
        setSummary(r.data.summary);
        setTotal(r.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-stack-lg gap-4">
        <div>
          <h1 className="text-headline-lg text-deep-navy mb-2">Activity Audit Log</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            Monitor system integrity and administrative transparency. Detailed records of every significant event within The STEM Educator ecosystem.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-12 gap-gutter">
        <Card icon="login" color="indigo-accent/10" iconColor="text-indigo-accent" value={summary?.auth_count ?? '—'} label="User Authentications" trend="+12% vs last week" trendColor="text-secondary" />
        <Card icon="settings_suggest" color="stem-orange/10" iconColor="text-stem-orange" value={summary?.config_count ?? '—'} label="System Configuration Changes" trend="Stable" trendColor="text-on-surface-variant" />
        <Card icon="warning" color="error-container/20" iconColor="text-error" value={summary?.alerts_count ?? '—'} label="Security Alerts Flagged" trend="-4% reduction" trendColor="text-error" />
        <div className="col-span-12 md:col-span-3 bg-deep-navy rounded-xl p-6 shadow-md text-pure-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-label-md opacity-80 mb-2 uppercase tracking-widest">Compliance Health</div>
            <div className="flex items-end gap-2 mb-4">
              <div className="text-headline-lg leading-none">99.8%</div>
              <span className="material-symbols-outlined text-indigo-accent" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            <div className="w-full bg-pure-white/10 h-2 rounded-full mb-2"><div className="bg-stem-orange h-full rounded-full" style={{ width: '99.8%' }} /></div>
            <div className="text-label-sm opacity-70">Audited daily by System Guardian</div>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10">
            <span className="material-symbols-outlined text-[120px]">shield</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter mt-stack-lg">
        {/* Event log table */}
        <div className="col-span-12 lg:col-span-8 bg-pure-white rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-outline-variant flex items-center justify-between">
            <h2 className="text-headline-md text-deep-navy">Event Log</h2>
            <div className="flex gap-2">
              <button className="p-2 rounded-lg bg-surface-container-low text-indigo-accent"><span className="material-symbols-outlined">table_view</span></button>
              <button className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low"><span className="material-symbols-outlined">view_stream</span></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-off-white border-b border-outline-variant">
                  {['Timestamp', 'User Entity', 'Action Type', 'Status', ''].map((h) => (
                    <th key={h} className={`px-6 py-4 text-label-sm uppercase tracking-wider text-on-surface-variant ${h === '' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading && <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">Loading…</td></tr>}
                {!loading && logs.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">No log entries.</td></tr>}
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 text-body-sm text-on-surface">{fmtTs(log.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-[10px] text-deep-navy font-bold">
                          {(log.actor_name || 'SYS').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-label-md">{log.actor_name || 'SYSTEM_CORE'}</div>
                          <div className="text-[10px] text-on-surface-variant uppercase">{log.actor_role || 'Automated'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 font-label-sm rounded-lg ${ACTION_STYLE[log.action_type] || 'bg-surface-container-highest text-on-surface-variant'}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 font-label-sm ${STATUS_STYLE[log.status] || 'text-on-surface-variant'}`}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="material-symbols-outlined text-outline hover:text-deep-navy">info</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant bg-bg-off-white flex justify-between items-center">
            <span className="text-label-sm text-on-surface-variant">Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} logs</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1 px-3 border border-outline-variant rounded bg-pure-white disabled:opacity-50">Prev</button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="p-1 px-3 border border-outline-variant rounded bg-pure-white disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>

        {/* Security timeline */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-pure-white rounded-xl border border-outline-variant shadow-sm p-6">
            <h3 className="text-headline-md text-deep-navy mb-6">Security Timeline</h3>
            <div className="relative pl-10 space-y-8">
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-outline-variant" />
              {TIMELINE.map((t, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-10 top-0 w-10 h-10 flex items-center justify-center bg-pure-white z-10">
                    <span className={`w-3 h-3 rounded-full ${t.color} shadow-[0_0_0_4px_rgba(234,142,10,0.1)]`} />
                  </span>
                  <div className="font-label-md text-on-surface">{t.title}</div>
                  <p className="text-body-sm text-on-surface-variant mt-1">{t.desc}</p>
                  <span className="text-[10px] font-bold text-outline-variant mt-2 block">{t.time}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/users')} className="w-full mt-8 py-2 border-2 border-deep-navy/10 rounded-lg text-deep-navy font-label-md hover:bg-surface-container-low transition-colors">
              View Full History
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Card({ icon, color, iconColor, value, label, trend, trendColor }) {
  return (
    <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-pure-white rounded-xl p-6 border border-outline-variant shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className={`p-2 ${color} rounded-lg`}><span className={`material-symbols-outlined ${iconColor}`}>{icon}</span></span>
          <span className={`text-label-sm ${trendColor}`}>{trend}</span>
        </div>
        <div className="text-headline-md text-deep-navy">{value}</div>
        <div className="text-label-md text-on-surface-variant">{label}</div>
      </div>
    </div>
  );
}
