import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Plus, Trash2, Loader2 } from 'lucide-react';
import AdminAPI from '../services/api';
import { CabAdminUser } from '../types';
import { format } from 'date-fns';
import { GlassCard, SkeletonRows, EmptyState } from '../components/cab/PageStates';
import StatusBadge from '../components/cab/StatusBadge';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useConfirm } from '../context/ConfirmContext';

const ROLES = ['admin', 'finance_manager', 'operations_manager', 'kyc_executive', 'support_executive'];

const CabAdmins: React.FC = () => {
  const [admins, setAdmins] = useState<CabAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { run, isLoading } = useAsyncAction();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await AdminAPI.getCabAdmins();
      setAdmins(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.email.trim()) errors.email = 'Email is required';
    if (!form.password || form.password.length < 6) errors.password = 'Password must be at least 6 characters';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const create = async () => {
    if (!validateForm()) return;
    await run(
      'create-admin',
      async () => {
        await AdminAPI.createCabAdmin(form);
        setShowForm(false);
        setForm({ name: '', email: '', password: '', role: 'admin' });
        setFormErrors({});
        await load();
      },
      { successMessage: 'Admin created successfully', loadingMessage: 'Creating admin...' }
    );
  };

  const toggleActive = async (admin: CabAdminUser) => {
    const activating = !admin.isActive;
    const ok = await confirm({
      title: activating ? 'Activate this admin?' : 'Deactivate this admin?',
      description: activating
        ? `${admin.name} will regain access to the admin panel.`
        : `${admin.name} will be blocked from signing in.`,
      variant: activating ? 'primary' : 'danger',
      confirmLabel: activating ? 'Activate' : 'Deactivate',
    });
    if (!ok) return;
    await run(
      `toggle-admin-${admin._id}`,
      () => AdminAPI.updateCabAdmin(admin._id, { isActive: activating }).then(load),
      {
        successMessage: activating ? 'Admin activated' : 'Admin deactivated',
        loadingMessage: 'Updating...',
      }
    );
  };

  const remove = async (admin: CabAdminUser) => {
    const ok = await confirm({
      title: 'Delete this admin?',
      description: `Permanently remove ${admin.name} (${admin.email}).`,
      variant: 'danger',
      confirmLabel: 'Delete',
      warning: 'This action cannot be undone.',
    });
    if (!ok) return;
    await run(
      `delete-admin-${admin._id}`,
      () => AdminAPI.deleteCabAdmin(admin._id).then(load),
      { successMessage: 'Admin deleted', loadingMessage: 'Deleting...' }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Users</h2>
          <p className="text-sm text-slate-500">Create, edit, and manage cab platform admin accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> New Admin
          </button>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {showForm && (
        <GlassCard className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name <span className="text-red-500">*</span></label>
            <input placeholder="Full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 ${formErrors.name ? 'border-red-500' : ''}`} />
            {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email <span className="text-red-500">*</span></label>
            <input placeholder="admin@example.com" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 ${formErrors.email ? 'border-red-500' : ''}`} />
            {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password <span className="text-red-500">*</span></label>
            <input placeholder="Min. 6 characters" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 ${formErrors.password ? 'border-red-500' : ''}`} />
            {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700">
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex gap-3">
            <button onClick={create} disabled={isLoading('create-admin')} className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {isLoading('create-admin') && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Admin
            </button>
            <button onClick={() => { setShowForm(false); setFormErrors({}); }} className="px-6 py-2 rounded-xl border text-sm">Cancel</button>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        {loading ? <SkeletonRows /> : admins.length === 0 ? <EmptyState message="No admin users" /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {admins.map(a => (
                  <tr key={a._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-sm">{a.email}</td>
                    <td className="px-4 py-3 text-sm capitalize">{a.role.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(a)} disabled={isLoading(`toggle-admin-${a._id}`)}>
                        {isLoading(`toggle-admin-${a._id}`) ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        ) : (
                          <StatusBadge status={a.isActive ? 'active' : 'rejected'} label={a.isActive ? 'Active' : 'Inactive'} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm">{format(new Date(a.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(a)} disabled={isLoading(`delete-admin-${a._id}`)} className="text-red-600 hover:text-red-800 disabled:opacity-50" title="Delete admin">
                        {isLoading(`delete-admin-${a._id}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default CabAdmins;
