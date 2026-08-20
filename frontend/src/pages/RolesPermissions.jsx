import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const PERMISSION_GROUPS = [
  {
    title: 'Curriculum & Learning',
    icon: 'menu_book',
    color: 'stem-orange',
    keys: [
      ['create_lessons', 'Create New Lessons'],
      ['edit_syllabus', 'Edit Existing Syllabus'],
      ['delete_assets', 'Delete Educational Assets'],
    ],
  },
  {
    title: 'User Data & Privacy',
    icon: 'database',
    color: 'indigo-accent',
    keys: [
      ['view_student_progress', 'View Student Progress'],
      ['export_pii', 'Export PII Data'],
      ['modify_permissions', 'Modify Permissions'],
    ],
  },
  {
    title: 'System & Infrastructure',
    icon: 'settings_suggest',
    color: 'deep-navy',
    span2: true,
    keys: [
      ['configure_api_keys', 'Configure API Keys'],
      ['manage_iot', 'Manage Hardware IoT Nodes'],
      ['backup_trigger', 'System Backup Trigger'],
      ['clear_audit_log', 'Audit Log Clearing'],
    ],
  },
];

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-5 bg-outline-variant rounded-full peer-checked:bg-stem-orange transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

export default function RolesPermissions() {
  const { user } = useAuth();
  const isSuper = user?.role === 'Super Admin';
  const [roles, setRoles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [perms, setPerms] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/roles').then((r) => {
      const filtered = isSuper ? r.data.roles : r.data.roles.filter((role) => !['Super Admin', 'System Admin'].includes(role.name));
      setRoles(filtered);
      const first = filtered[0];
      if (first) {
        setActiveId(first.id);
        setPerms(first.permissions || {});
      }
    }).catch(() => {});
  }, [isSuper]);

  const selectRole = (role) => {
    setActiveId(role.id);
    setPerms(role.permissions || {});
  };

  const update = (key, val) => setPerms((p) => ({ ...p, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/roles/${activeId}`, { permissions: perms });
      toast.success('Permissions saved');
      setRoles((rs) => rs.map((r) => (r.id === activeId ? { ...r, permissions: perms } : r)));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const active = roles.find((r) => r.id === activeId);

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-stack-md">
        <div>
          <h1 className="text-headline-lg text-deep-navy">Roles &amp; Permissions</h1>
          <p className="text-on-surface-variant mt-1">Configure access levels and granular permissions across the STEM lab ecosystem.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="bg-stem-orange text-pure-white px-6 py-2 rounded-lg text-label-md ambient-shadow hover:opacity-90 active:scale-95 transition-all disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Role selector */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
          <div className="bg-pure-white p-base rounded-xl ambient-shadow border border-outline-variant/30 overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant/30 flex justify-between items-center">
              <span className="text-label-md text-on-surface-variant">DEFINED ROLES</span>
              <span className="material-symbols-outlined text-indigo-accent cursor-pointer hover:scale-110 transition-transform">add_circle</span>
            </div>
            <div className="flex flex-col">
              {roles.map((r) => (
                <div
                  key={r.id}
                  onClick={() => selectRole(r)}
                  className={`p-4 cursor-pointer border-b border-outline-variant/10 transition-colors ${
                    r.id === activeId ? 'role-card-active' : 'hover:bg-surface-container-low'
                  }`}
                  style={r.id === activeId ? { borderLeft: '4px solid #EA8E0A', background: 'rgba(234,142,10,0.04)' } : {}}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-[18px] text-deep-navy font-medium">{r.name}</h3>
                    {r.is_default && (
                      <span className="bg-indigo-accent/10 text-indigo-accent px-2 py-0.5 rounded text-[10px] font-bold uppercase">Default</span>
                    )}
                  </div>
                  <p className="text-on-surface-variant text-[13px]">{r.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-primary-container text-pure-white p-6 rounded-xl ambient-shadow flex items-center justify-between">
            <div>
              <p className="text-primary-fixed text-label-sm opacity-80 mb-1">ASSIGNED USERS</p>
              <p className="text-headline-lg">{active?.assigned_users ?? 0}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-indigo-accent/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-stem-orange">groups</span>
            </div>
          </div>
        </div>

        {/* Permissions manager */}
        <div className="col-span-12 md:col-span-8 space-y-gutter">
          <div className="bg-pure-white p-6 rounded-xl ambient-shadow border border-outline-variant/30 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-deep-navy flex items-center justify-center">
                <span className="material-symbols-outlined text-pure-white">shield_person</span>
              </div>
              <div>
                <h2 className="text-headline-md text-deep-navy">Editing: {active?.name || '—'}</h2>
                <p className="text-body-sm text-on-surface-variant">{active?.description}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PERMISSION_GROUPS.map((g) => (
              <div
                key={g.title}
                className={`bg-pure-white rounded-xl ambient-shadow border border-outline-variant/30 overflow-hidden ${g.span2 ? 'md:col-span-2' : ''}`}
              >
                <div className={`px-6 py-4 bg-surface-container-low border-b border-outline-variant/30 flex items-center gap-2`}>
                  <span className={`material-symbols-outlined text-[20px] text-${g.color}`}>{g.icon}</span>
                  <span className="text-label-md text-deep-navy uppercase tracking-wider">{g.title}</span>
                </div>
                <div className={`p-6 ${g.span2 ? 'grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4' : 'space-y-4'}`}>
                  {g.keys.map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-body-md text-deep-navy">{label}</span>
                      <Toggle checked={!!perms[key]} onChange={(v) => update(key, v)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-accent/5 border border-indigo-accent/20 rounded-xl p-6 flex items-center gap-6">
            <p className="text-body-sm text-on-surface-variant">
              Changes to permissions propagate to all interfaces within 60 seconds. Review carefully before saving.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
