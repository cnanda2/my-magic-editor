import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ALL_ROLES = ['Lead Instructor', 'Lab Tech', 'Guest Lecturer', 'Student'];
const ADMIN_ROLES = ['admin', 'System Admin', 'Super Admin'];
const STATUSES = ['active', 'pending', 'on_leave', 'suspended', 'disabled'];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isSuper = authUser?.role === 'Super Admin';
  const ROLES = isSuper ? [...ALL_ROLES, ...ADMIN_ROLES] : ALL_ROLES;
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/users/${id}`)
      .then((r) => { setUser(r.data.user); setForm(r.data.user); })
      .catch((e) => toast.error(e.response?.data?.error || 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        username: form.username,
        role: form.role,
        department: form.department,
        institution: form.institution,
        status: form.status,
      };
      if (form.password) payload.password = form.password;
      const { data } = await api.patch(`/admin/users/${id}`, payload);
      setUser(data.user);
      setForm(data.user);
      setForm((f) => ({ ...f, password: '' }));
      toast.success('User updated');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      navigate('/users');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center gap-3 text-deep-navy py-20">
          <span className="material-symbols-outlined animate-spin text-stem-orange">progress_activity</span>
          Loading user…
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="py-20 text-center">
          <p className="text-on-surface-variant mb-4">User not found.</p>
          <Link to="/users" className="text-stem-orange font-bold hover:underline">Back to directory</Link>
        </div>
      </AdminLayout>
    );
  }

  const avatar = user.avatar_url
    ? <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
    : <div className="w-16 h-16 rounded-full bg-deep-navy text-pure-white flex items-center justify-center text-xl font-bold">{(user.full_name || user.username).slice(0, 2).toUpperCase()}</div>;

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-stack-md">
        <button onClick={() => navigate('/users')} className="flex items-center text-on-surface-variant hover:text-stem-orange transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-label-md ml-1">Back to Directory</span>
        </button>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Profile card + form */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-pure-white rounded-xl border border-outline-variant ambient-shadow p-6">
            <div className="flex items-center gap-4 mb-stack-md">
              {avatar}
              <div>
                <h1 className="text-headline-md text-deep-navy">{(form.full_name || form.username) || 'User'}</h1>
                <p className="text-body-sm text-on-surface-variant">{form.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" value={form.full_name || ''} onChange={update('full_name')} icon="person" />
              <Field label="Username" value={form.username || ''} onChange={update('username')} icon="badge" />
              <Field label="Institution Email" value={form.email || ''} onChange={update('email')} icon="mail" type="email" />
              <Field label="Institution / School" value={form.institution || ''} onChange={update('institution')} icon="account_balance" />
              <Field label="Department" value={form.department || ''} onChange={update('department')} icon="apartment" />
              <Field label="Reset Password" value={form.password || ''} onChange={update('password')} icon="lock" type="password" placeholder="Leave blank to keep current" />

              <div className="space-y-1">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Role</label>
                <select value={form.role || ''} onChange={update('role')} className="w-full px-3 py-3 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-stem-orange focus:border-transparent outline-none">
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">Status</label>
                <select value={form.status || ''} onChange={update('status')} className="w-full px-3 py-3 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-stem-orange focus:border-transparent outline-none">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-stack-lg pt-stack-md border-t border-outline-variant">
              <button onClick={save} disabled={saving} className="bg-stem-orange text-pure-white px-6 py-2.5 rounded-lg text-label-md hover:brightness-90 active:scale-95 transition-all shadow-md disabled:opacity-60 flex items-center gap-2">
                {saving ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> Saving…</> : <><span className="material-symbols-outlined">save</span> Save Changes</>}
              </button>
            </div>
          </div>
        </div>

        {/* Side rail */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
          <div className="bg-pure-white rounded-xl border border-outline-variant ambient-shadow p-6">
            <h3 className="text-label-md uppercase tracking-wider text-deep-navy mb-4">Account Info</h3>
            <InfoRow label="User ID" value={`#${user.id}`} />
            <InfoRow label="Provider" value={user.oauth_provider || 'local'} />
            <InfoRow label="Last Login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'} />
            <InfoRow label="Created" value={new Date(user.created_at).toLocaleDateString()} />
          </div>

          <div className="bg-error-container/40 rounded-xl border border-error/30 p-6">
            <h3 className="text-label-md uppercase tracking-wider text-error mb-2">Danger Zone</h3>
            <p className="text-body-sm text-on-surface-variant mb-4">Deleting a user is permanent and cannot be undone.</p>
            {confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={remove} className="bg-error text-pure-white px-4 py-2 rounded-lg text-label-md hover:brightness-110 transition-all">Confirm Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-lg text-label-md border border-outline-variant hover:bg-surface-container-low">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-error px-4 py-2 rounded-lg border border-error/40 hover:bg-error/10 transition-all">
                <span className="material-symbols-outlined">delete_forever</span> Delete User
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, icon, type = 'text', placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-outline pointer-events-none">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-surface text-body-md border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-stem-orange focus:border-transparent transition-all"
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-outline-variant/40 last:border-0">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      <span className="text-label-md text-deep-navy capitalize">{value}</span>
    </div>
  );
}
