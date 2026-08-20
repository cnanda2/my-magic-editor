import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'user', full_name: '', department: '' });
  const [addingUser, setAddingUser] = useState(false);

  const load = () => {
    api.get(`/admin/tenants/${id}`).then(r => { setTenant(r.data.tenant); setUsers(r.data.users || []); }).catch(() => navigate('/tenants'));
  };

  useEffect(() => { load(); }, [id]);

  const update = async (field, value) => {
    setSaving(true);
    try { await api.patch(`/admin/tenants/${id}`, { [field]: value }); setTenant({ ...tenant, [field]: value }); } catch (e) { toast.error('Failed to update'); }
    setSaving(false);
  };

  const addUser = async () => {
    if (!userForm.username || !userForm.email || !userForm.password) { toast.error('Username, email and password required'); return; }
    setAddingUser(true);
    try {
      await api.post('/admin/users', { ...userForm, tenant_id: id });
      toast.success('User added');
      setShowAddUser(false);
      setUserForm({ username: '', email: '', password: '', role: 'user', full_name: '', department: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add user');
    }
    setAddingUser(false);
  };

  const deleteTenant = async () => {
    try {
      await api.delete(`/admin/tenants/${id}`);
      toast.success('Tenant deleted');
      navigate('/tenants');
    } catch (e) {
      toast.error('Failed to delete tenant');
    }
  };

  if (!tenant) return <AdminLayout><div className="flex items-center justify-center min-h-[60vh] text-on-surface-variant text-body-lg">Loading…</div></AdminLayout>;

  const usage = Math.min((users.length) / (tenant.user_limit || 10) * 100, 100);

  return (
    <AdminLayout>
      <div className="space-y-stack-md">

        <Link to="/tenants" className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-deep-navy transition-colors w-fit">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Institutions
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-stack-sm">
          <div>
            <h1 className="text-headline-lg text-deep-navy">{tenant.company_name || tenant.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={tenant.status} />
              <span className="text-body-sm text-on-surface-variant">ID: {tenant.id}</span>
            </div>
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={deleteTenant} className="flex items-center gap-1.5 bg-error text-pure-white px-4 py-2.5 rounded-lg text-label-sm hover:brightness-110 transition-all">
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                Confirm Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2.5 rounded-lg text-label-sm border border-outline-variant hover:bg-surface-container-low transition-all">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-error px-4 py-2.5 rounded-lg border border-error/40 hover:bg-error/10 transition-all text-label-sm shrink-0">
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
              Delete Institution
            </button>
          )}
        </div>

        <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-headline-sm text-deep-navy">User Usage</h2>
            <span className="text-label-md text-on-surface-variant">{users.length} / {tenant.user_limit ?? 10} users</span>
          </div>
          <div className="w-full h-3 bg-outline-variant/40 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${usage > 90 ? 'bg-error' : usage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${usage}%` }} />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-2">
            {usage > 90 ? 'Critical — near user limit' : usage > 70 ? 'Warning — approaching user limit' : 'Healthy — sufficient capacity'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow-sm p-6 space-y-4">
            <h2 className="text-headline-sm text-deep-navy">Branding</h2>
            <Field label="Company Name" value={tenant.company_name} onChange={v => update('company_name', v)} icon="business" />
            <Field label="App Name" value={tenant.app_name} onChange={v => update('app_name', v)} icon="app_registration" />
            <Field label="Subdomain" value={tenant.subdomain} onChange={v => update('subdomain', v)} icon="language" />
            <Field label="Custom Domain" value={tenant.custom_domain} onChange={v => update('custom_domain', v)} icon="public" />
            <Field label="Logo URL" value={tenant.logo_url} onChange={v => update('logo_url', v)} icon="image" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Primary Color" value={tenant.primary_color} onChange={v => update('primary_color', v)} type="color" icon="palette" />
              <Field label="Secondary Color" value={tenant.secondary_color} onChange={v => update('secondary_color', v)} type="color" icon="palette" />
            </div>
          </div>

          <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow-sm p-6 space-y-4">
            <h2 className="text-headline-sm text-deep-navy">Subscription</h2>
            <div className="space-y-1">
              <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Plan</label>
              <select value={tenant.plan || 'free'} onChange={e => update('plan', e.target.value)} className="w-full px-4 py-2.5 bg-pure-white border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all appearance-none">
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Status</label>
              <select value={tenant.status || 'active'} onChange={e => update('status', e.target.value)} className="w-full px-4 py-2.5 bg-pure-white border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all appearance-none">
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <Field label="Owner Email" value={tenant.owner_email} onChange={v => update('owner_email', v)} icon="mail" />
            <Field label="User Limit" value={String(tenant.user_limit ?? 10)} onChange={v => update('user_limit', parseInt(v, 10) || 10)} icon="group" />
            <div className="pt-2 border-t border-outline-variant/20 space-y-1">
              <div className="flex justify-between py-1.5">
                <span className="text-body-sm text-on-surface-variant">Tenant ID</span>
                <span className="text-label-md text-deep-navy font-mono">#{tenant.id}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-body-sm text-on-surface-variant">Created</span>
                <span className="text-label-md text-deep-navy">{tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-pure-white rounded-xl border border-outline-variant/20 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
            <h2 className="text-headline-sm text-deep-navy">Users <span className="text-on-surface-variant font-normal">({users.length})</span></h2>
            <button onClick={() => setShowAddUser(true)} className="flex items-center gap-1.5 bg-deep-navy text-pure-white px-4 py-2 rounded-lg text-label-sm hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Add User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-off-white border-b border-outline-variant">
                  <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Name</th>
                  <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Email</th>
                  <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Role</th>
                  <th className="px-6 py-4 text-label-sm uppercase tracking-wider text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-on-surface-variant text-body-sm">No users found for this institution.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-indigo-accent/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-deep-navy/10 flex items-center justify-center text-label-md text-deep-navy font-bold uppercase shrink-0">
                            {(u.full_name || u.username || u.email || '?')[0]}
                          </div>
                          <div>
                            <div className="text-body-md text-deep-navy font-medium">{u.full_name || u.username}</div>
                            <div className="text-body-sm text-on-surface-variant">@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-body-sm text-on-surface-variant">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 rounded-full text-label-sm bg-indigo-accent/10 text-indigo-accent uppercase tracking-wider">{u.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusDot status={u.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddUser && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowAddUser(false)}>
            <div className="bg-pure-white rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant shrink-0">
                <h2 className="text-headline-sm text-deep-navy">Add New User</h2>
                <button onClick={() => setShowAddUser(false)} className="w-8 h-8 rounded-lg hover:bg-bg-off-white flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant">close</span>
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Username <span className="text-error">*</span></label>
                  <input placeholder="e.g. jdoe" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Email <span className="text-error">*</span></label>
                  <input type="email" placeholder="e.g. jdoe@school.edu" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Password <span className="text-error">*</span></label>
                  <input type="password" placeholder="Min. 8 characters" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Full Name</label>
                  <input placeholder="e.g. John Doe" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Department</label>
                  <input placeholder="e.g. Science" value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-1.5">Role</label>
                  <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-2.5 border border-outline-variant rounded-lg text-body-sm focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition">
                    <option value="user">User</option>
                    <option value="Tenant Admin">Tenant Admin</option>
                    <option value="Lead Instructor">Lead Instructor</option>
                    <option value="Lab Tech">Lab Tech</option>
                    <option value="Guest Lecturer">Guest Lecturer</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6 pt-4 border-t border-outline-variant shrink-0">
                <button onClick={() => setShowAddUser(false)} className="px-5 py-2.5 text-label-sm font-medium border border-outline-variant rounded-lg hover:bg-bg-off-white transition">Cancel</button>
                <button onClick={addUser} disabled={addingUser} className="px-5 py-2.5 text-label-sm font-medium bg-deep-navy text-pure-white rounded-lg hover:brightness-110 disabled:opacity-50 transition">{addingUser ? 'Adding...' : 'Add User'}</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, icon, type = 'text' }) {
  return (
    <div className="space-y-1">
      <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</label>
      <div className="relative">
        {icon && type !== 'color' && (
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[20px] text-outline">{icon}</span>
          </span>
        )}
        {type === 'color' ? (
          <div className="flex items-center gap-3">
            <input type="color" value={value || '#6366F1'} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer p-0.5" />
            <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="flex-1 px-3 py-2.5 border border-outline-variant rounded-lg text-body-sm font-mono focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all" placeholder="#HEX" />
          </div>
        ) : (
          <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className={`w-full px-3 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-stem-orange/40 focus:border-stem-orange transition-all ${icon ? 'pl-10' : ''}`} />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm uppercase tracking-wider ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {status || 'unknown'}
    </span>
  );
}

function StatusDot({ status }) {
  const active = status === 'active';
  return (
    <span className="inline-flex items-center gap-2 text-body-sm">
      <span className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {active ? 'Active' : 'Disabled'}
    </span>
  );
}
