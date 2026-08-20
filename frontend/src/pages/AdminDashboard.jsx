import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../utils/api';

const REPLENISH_BARS = [75, 50, 85, 60, 90, 70, 95, 80, 65, 55, 88, 72];
const CHURN_BARS = [25, 40, 15, 30, 10, 20, 5, 15, 25, 35, 12, 18];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function MetricCard({ icon, label, value, trend, trendLabel, trendUp }) {
  return (
    <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6 group-hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-indigo-accent/10 flex items-center justify-center text-indigo-accent group-hover:bg-indigo-accent group-hover:text-pure-white transition-all duration-300">
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-label-sm font-bold ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            <span className="material-symbols-outlined text-[14px]">{trendUp ? 'trending_up' : 'trending_down'}</span>
            {trend}%
          </div>
        )}
      </div>
      <p className="text-body-sm text-on-surface-variant mb-1">{label}</p>
      <p className="text-headline-lg text-deep-navy font-bold">{value}</p>
      {trendLabel && (
        <p className="text-label-sm text-on-surface-variant mt-1">{trendLabel}</p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/admin/audit', { params: { pageSize: 5 } }).then((r) => setRecent(r.data.logs || [])).catch(() => {});
  }, []);

  return (
    <AdminLayout mainClassName="px-0">
      <div className="space-y-stack-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-headline-lg text-deep-navy">Platform Overview</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Real-time telemetry and management for your SaaS infrastructure.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-3 border border-outline-variant/40 rounded-xl text-label-md text-deep-navy hover:bg-surface-container-low transition-all active:scale-[0.97]">
              <span className="material-symbols-outlined text-[18px]">description</span>
              Generate Report
            </button>
            <button className="flex items-center gap-2 px-5 py-3 bg-deep-navy text-pure-white rounded-xl text-label-md hover:brightness-125 transition-all active:scale-[0.97] shadow">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export Data
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-gutter">
          <MetricCard
            icon="business"
            label="Active Institutions"
            value={stats?.totalTenants ?? '—'}
            trend={12}
            trendUp
            trendLabel="vs last month"
          />
          <MetricCard
            icon="payments"
            label="MRR"
            value="$84,250"
            trend={8}
            trendUp
            trendLabel="vs last month"
          />
          <MetricCard
            icon="school"
            label="Total Students"
            value={stats?.totalUsers ?? '—'}
            trend={24}
            trendUp
            trendLabel="vs last month"
          />
          <MetricCard
            icon="experiment"
            label="Active Lab Sessions"
            value="1,847"
            trend={3}
            trendUp={false}
            trendLabel="vs last month"
          />
        </div>

        {/* Bento Grid - Second Row */}
        <div className="grid grid-cols-12 gap-gutter">
          {/* Subscription Health Chart */}
          <div className="col-span-12 lg:col-span-8 bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-headline-md text-deep-navy flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-accent">bar_chart</span>
                  Subscription Health
                </h3>
                <p className="text-body-sm text-on-surface-variant">Monthly renewals vs churn rate</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-label-sm">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-on-surface-variant">Renewals</span>
                </div>
                <div className="flex items-center gap-2 text-label-sm">
                  <span className="w-3 h-3 rounded-sm bg-red-400" />
                  <span className="text-on-surface-variant">Churn</span>
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 h-52">
              {REPLENISH_BARS.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex flex-col-reverse gap-1 h-full">
                    <div
                      className="w-full bg-red-300 rounded-t transition-all duration-500 hover:bg-red-400"
                      style={{ height: `${CHURN_BARS[i]}%` }}
                    />
                    <div
                      className="w-full bg-emerald-500 rounded-t transition-all duration-500 hover:bg-emerald-600"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                  <span className="text-label-sm text-on-surface-variant">{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Goal */}
          <div className="col-span-12 lg:col-span-4 bg-deep-navy rounded-xl shadow p-6 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-[0.04] group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
              <span className="material-symbols-outlined text-[160px]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-stem-orange/20 flex items-center justify-center text-stem-orange">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                </div>
                <div>
                  <h3 className="text-headline-sm text-pure-white font-bold">Growth Goal</h3>
                  <p className="text-body-sm text-pure-white/60">Q4 2025 Target</p>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-headline-xl text-pure-white font-bold">$120k</p>
                <p className="text-body-md text-pure-white/70 mt-1">
                  <span className="text-stem-orange font-bold">$84,250</span> / $120,000 MRR
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-label-sm text-pure-white/60">
                  <span>Progress</span>
                  <span>70%</span>
                </div>
                <div className="h-3 w-full bg-pure-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-stem-orange to-amber-400 rounded-full transition-all duration-700" style={{ width: '70%' }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-pure-white/10">
                <div>
                  <p className="text-headline-md text-pure-white font-bold">18</p>
                  <p className="text-label-sm text-pure-white/60">New this month</p>
                </div>
                <div>
                  <p className="text-headline-md text-pure-white font-bold">94%</p>
                  <p className="text-label-sm text-pure-white/60">Retention</p>
                </div>
                <div>
                  <p className="text-headline-md text-pure-white font-bold">4.8</p>
                  <p className="text-label-sm text-pure-white/60">Avg Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Grid - Third Row */}
        <div className="grid grid-cols-12 gap-gutter">
          {/* Infrastructure Status */}
          <div className="col-span-12 lg:col-span-5 bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-headline-md text-deep-navy flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-accent">dns</span>
                Infrastructure Status
              </h3>
              <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-label-sm font-bold px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl group hover:bg-indigo-accent/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-accent/10 flex items-center justify-center text-indigo-accent">
                    <span className="material-symbols-outlined text-[20px]">dns</span>
                  </div>
                  <div>
                    <p className="text-body-md text-deep-navy font-bold">Server Clusters</p>
                    <p className="text-label-sm text-on-surface-variant">4 clusters · 24 nodes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-body-sm text-green-600 font-bold">99.97%</span>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl group hover:bg-indigo-accent/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-stem-orange/10 flex items-center justify-center text-stem-orange">
                    <span className="material-symbols-outlined text-[20px]">storage</span>
                  </div>
                  <div>
                    <p className="text-body-md text-deep-navy font-bold">Database Latency</p>
                    <p className="text-label-sm text-on-surface-variant">PostgreSQL · 3 replicas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-body-sm text-stem-orange font-bold">12ms</span>
                  <span className="w-2 h-2 rounded-full bg-stem-orange" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl group hover:bg-indigo-accent/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-600">
                    <span className="material-symbols-outlined text-[20px]">cloud</span>
                  </div>
                  <div>
                    <p className="text-body-md text-deep-navy font-bold">CDN Distribution</p>
                    <p className="text-label-sm text-on-surface-variant">12 edge locations</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-body-sm text-green-600 font-bold">52ms</span>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl group hover:bg-indigo-accent/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                    <span className="material-symbols-outlined text-[20px]">api</span>
                  </div>
                  <div>
                    <p className="text-body-md text-deep-navy font-bold">API Gateway</p>
                    <p className="text-label-sm text-on-surface-variant">2.4k req/s avg</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-body-sm text-green-600 font-bold">187ms</span>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Tenant Activity */}
          <div className="col-span-12 lg:col-span-7 bg-pure-white rounded-xl border border-outline-variant/20 shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-headline-md text-deep-navy flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-accent">history</span>
                Recent Tenant Activity
              </h3>
              <button onClick={() => navigate('/audit')} className="text-label-sm text-indigo-accent font-bold hover:underline flex items-center gap-1">
                View All
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
            <div className="space-y-2">
              {recent.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] mb-3 opacity-40">history</span>
                  <p className="text-body-sm">No recent activity yet.</p>
                </div>
              )}
              {recent.map((log, i) => {
                const initials = (log.actor_name || 'SYS').slice(0, 2).toUpperCase();
                const colors = ['bg-indigo-accent', 'bg-stem-orange', 'bg-emerald-500', 'bg-rose-500', 'bg-cyan-600'];
                return (
                  <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-surface-container-low rounded-xl transition-all group cursor-pointer">
                    <div className={`w-10 h-10 rounded-xl ${colors[i % colors.length]} text-pure-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md text-deep-navy font-bold truncate">
                        {log.actor_name || 'System'}
                        <span className="font-normal text-on-surface-variant ml-1">
                          {log.action_type.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </p>
                      <p className="text-label-sm text-on-surface-variant/70">{timeAgo(log.created_at)}</p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-6 bg-pure-white rounded-xl border border-outline-variant/20 shadow">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>STEMOS SaaS</span>
              <span className="text-outline-variant mx-1">|</span>
              <span>v3.2.1</span>
            </div>
            <div className="flex items-center gap-2 text-label-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-700 font-bold">System Status: Healthy</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-deep-navy transition-colors">
              <span className="material-symbols-outlined text-[16px]">description</span>
              Changelog
            </button>
            <button className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-deep-navy transition-colors">
              <span className="material-symbols-outlined text-[16px]">support</span>
              Support
            </button>
            <button className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-deep-navy transition-colors">
              <span className="material-symbols-outlined text-[16px]">terminal</span>
              API
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
