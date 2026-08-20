import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const HERO_IMG =
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80";

function StatusBadge({ status }) {
  const map = {
    active: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    on_leave: 'bg-amber-100 text-amber-800',
    suspended: 'bg-red-100 text-red-700',
    disabled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${map[status] || 'bg-slate-100 text-slate-700'}`}>
      <span className="w-2 h-2 rounded-full bg-current opacity-70" />
      {status ? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown'}
    </span>
  );
}

function avatar(user) {
  if (user?.avatar_url) return <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />;
  return (
    <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center font-bold text-deep-navy">
      {(user.full_name || user.username || 'U').slice(0, 2).toUpperCase()}
    </div>
  );
}

const ALL_ROLES = ['Lead Instructor', 'Lab Tech', 'Guest Lecturer', 'Student'];
const ADMIN_ROLES = ['admin', 'System Admin', 'Super Admin'];

export default function UserDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuper = user?.role === 'Super Admin';
  const roleOptions = ['All Roles', ...(isSuper ? ADMIN_ROLES : []), ...ALL_ROLES];
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All Roles');
  const [status, setStatus] = useState('All Status');
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'user', full_name: '', department: '', institution: '' });
  const [addingUser, setAddingUser] = useState(false);
  const pageSize = 10;

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/users', {
      params: {
        page,
        pageSize,
        search,
        role: role === 'All Roles' ? undefined : role,
        status: status === 'All Status' ? undefined : status,
      },
    })
      .then((r) => {
        setUsers(r.data.users);
        setTotal(r.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, role, status]);

  useEffect(() => { load(); }, [load]);

  const addUser = async () => {
    if (!userForm.username || !userForm.email || !userForm.password) { toast.error('Username, email and password required'); return; }
    setAddingUser(true);
    try {
      await api.post('/admin/users', userForm);
      toast.success('User added');
      setShowAddUser(false);
      setUserForm({ username: '', email: '', password: '', role: 'user', full_name: '', department: '', institution: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to add user');
    }
    setAddingUser(false);
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-7 flex flex-col justify-center space-y-stack-sm">
          <h1 className="text-headline-xl text-deep-navy">User Directory</h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl">
            Manage your faculty, staff, and laboratory administrators. Monitor departmental access and system status in real-time.
          </p>
          <div className="flex flex-wrap gap-stack-sm pt-4">
            <div className="flex items-center gap-2 bg-indigo-accent/10 text-on-tertiary-fixed-variant px-4 py-2 rounded-full text-label-md">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>{users.filter((u) => u.status === 'active').length} Active Faculty</span>
            </div>
            <div className="flex items-center gap-2 bg-secondary-fixed/30 text-secondary px-4 py-2 rounded-full text-label-md">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              <span>{users.filter((u) => u.status === 'pending').length} Pending Approvals</span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 h-64 lg:h-auto overflow-hidden rounded-xl ambient-shadow">
          <img alt="Faculty Training Session" className="w-full h-full object-cover" src={HERO_IMG} />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-pure-white p-6 rounded-xl ambient-shadow border border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4 mt-stack-lg">
        <div className="relative flex-1 max-w-lg">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or department..."
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-outline-variant focus:border-indigo-accent focus:ring-2 focus:ring-indigo-accent/20 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-stack-sm overflow-x-auto pb-2 md:pb-0">
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="bg-bg-off-white border border-outline-variant rounded-lg px-4 py-3 outline-none">
            {roleOptions.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="bg-bg-off-white border border-outline-variant rounded-lg px-4 py-3 outline-none">
            {['All Status', 'active', 'pending', 'on_leave', 'suspended'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 bg-stem-orange text-pure-white px-5 py-2.5 rounded-lg hover:brightness-95 transition-all">
            <span className="material-symbols-outlined text-[20px]">person_add</span>Add User
          </button>
          <button className="flex items-center gap-2 border-2 border-deep-navy text-deep-navy px-5 py-2.5 rounded-lg hover:bg-deep-navy hover:text-pure-white transition-all">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-pure-white rounded-xl ambient-shadow border border-outline-variant overflow-hidden mt-stack-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-off-white border-b border-outline-variant">
                {['User Profile', 'Role', 'Department', 'Status', ''].map((h) => (
                  <th key={h} className={`px-6 py-5 text-label-sm uppercase tracking-wider text-deep-navy ${h === '' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">No users found.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-indigo-accent/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {avatar(u)}
                      <div>
                        <div className="text-label-md text-deep-navy">{u.full_name || u.username}</div>
                        <div className="text-body-sm text-on-surface-variant">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-body-md">{u.role}</td>
                  <td className="px-6 py-4 text-body-md">{u.department || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={u.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => navigate(`/users/${u.id}`)} className="text-outline hover:text-indigo-accent transition-colors">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-pure-white px-6 py-4 border-t border-outline-variant flex items-center justify-between">
          <span className="text-body-sm text-on-surface-variant">Showing {users.length} of {total} results</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 border border-outline-variant rounded-lg hover:bg-bg-off-white disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-2 rounded-lg ${page === i + 1 ? 'bg-indigo-accent text-pure-white' : 'hover:bg-bg-off-white'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 border border-outline-variant rounded-lg hover:bg-bg-off-white disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowAddUser(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b">
              <h2 className="text-lg font-bold text-deep-navy">Add User</h2>
              <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto px-6 py-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Username <span className="text-red-400">*</span></label>
                <input placeholder="e.g. jdoe" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-stem-blue focus:border-stem-blue outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email <span className="text-red-400">*</span></label>
                <input type="email" placeholder="e.g. jdoe@school.edu" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-stem-blue focus:border-stem-blue outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Password <span className="text-red-400">*</span></label>
                <input type="password" placeholder="Min. 8 characters" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-stem-blue focus:border-stem-blue outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
                <input placeholder="e.g. John Doe" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-stem-blue focus:border-stem-blue outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Department</label>
                <input placeholder="e.g. Science" value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-stem-blue focus:border-stem-blue outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Role</label>
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-stem-blue focus:border-stem-blue outline-none transition">
                  <option value="user">User</option>
                  <option value="Lead Instructor">Lead Instructor</option>
                  <option value="Lab Tech">Lab Tech</option>
                  <option value="Guest Lecturer">Guest Lecturer</option>
                  <option value="Student">Student</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-3 border-t">
              <button onClick={() => setShowAddUser(false)} className="px-5 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button onClick={addUser} disabled={addingUser} className="px-5 py-2 text-sm font-medium bg-deep-navy text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition">{addingUser ? 'Adding...' : 'Add User'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
