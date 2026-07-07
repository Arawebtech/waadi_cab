import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Plus, ToggleLeft, ToggleRight, Trash2, Loader2 } from 'lucide-react';
import AdminAPI from '../services/api';
import { CabSubscription, CabSubscriptionPlan } from '../types';
import { formatCurrency } from '../components/cab/StatCard';
import { format } from 'date-fns';
import { GlassCard, SkeletonRows, EmptyState } from '../components/cab/PageStates';
import StatusBadge from '../components/cab/StatusBadge';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useConfirm } from '../context/ConfirmContext';

const CabSubscriptions: React.FC = () => {
  const [tab, setTab] = useState<'subscriptions' | 'plans' | 'history'>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<CabSubscription[]>([]);
  const [plans, setPlans] = useState<CabSubscriptionPlan[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [planForm, setPlanForm] = useState({ name: '', slug: '', amount: 0, durationDays: 30, description: '' });
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { run, isLoading } = useAsyncAction();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'subscriptions') {
        const { subscriptions: items } = await AdminAPI.getCabSubscriptions({ status: statusFilter, limit: 50 });
        setSubscriptions(items);
      } else if (tab === 'plans') {
        const { plans: items } = await AdminAPI.getCabSubscriptionPlans({ limit: 50 });
        setPlans(items);
      } else {
        const { history: items } = await AdminAPI.getCabSubscriptionHistory({ limit: 50 });
        setHistory(items);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const validatePlanForm = () => {
    const errors: Record<string, string> = {};
    if (!planForm.name.trim()) errors.name = 'Plan name is required';
    if (!planForm.slug.trim()) errors.slug = 'Slug is required';
    if (planForm.amount < 0) errors.amount = 'Amount must be zero or greater';
    if (planForm.durationDays < 1) errors.durationDays = 'Duration must be at least 1 day';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createPlan = async () => {
    if (!validatePlanForm()) return;
    await run(
      'create-plan',
      async () => {
        await AdminAPI.createCabSubscriptionPlan(planForm);
        setShowPlanForm(false);
        setPlanForm({ name: '', slug: '', amount: 0, durationDays: 30, description: '' });
        setFormErrors({});
        await load();
      },
      { successMessage: 'Plan created successfully', loadingMessage: 'Creating plan...' }
    );
  };

  const togglePlan = async (plan: CabSubscriptionPlan) => {
    const activating = !plan.isActive;
    const ok = await confirm({
      title: activating ? 'Activate this plan?' : 'Deactivate this plan?',
      description: activating
        ? 'Drivers will be able to purchase this plan.'
        : 'This plan will be hidden from new purchases.',
      confirmLabel: activating ? 'Activate' : 'Deactivate',
    });
    if (!ok) return;
    await run(
      `toggle-plan-${plan._id}`,
      () => AdminAPI.toggleCabSubscriptionPlan(plan._id, activating).then(load),
      {
        successMessage: activating ? 'Plan activated' : 'Plan deactivated',
        loadingMessage: 'Updating...',
      }
    );
  };

  const deletePlan = async (plan: CabSubscriptionPlan) => {
    const ok = await confirm({
      title: 'Delete this plan?',
      description: `Permanently remove "${plan.name}" from the system.`,
      variant: 'danger',
      confirmLabel: 'Delete Plan',
      warning: 'This cannot be undone if the plan has no active subscriptions.',
    });
    if (!ok) return;
    await run(
      `delete-plan-${plan._id}`,
      () => AdminAPI.deleteCabSubscriptionPlan(plan._id).then(load),
      { successMessage: 'Plan deleted', loadingMessage: 'Deleting...' }
    );
  };

  const expireSub = async (id: string, planName: string) => {
    const ok = await confirm({
      title: 'Expire this subscription?',
      description: `End the active "${planName}" subscription immediately.`,
      variant: 'danger',
      confirmLabel: 'Expire',
    });
    if (!ok) return;
    await run(
      `expire-${id}`,
      () => AdminAPI.expireCabSubscription(id).then(load),
      { successMessage: 'Subscription expired', loadingMessage: 'Expiring...' }
    );
  };

  const driverName = (sub: CabSubscription) => {
    if (!sub.driverId || typeof sub.driverId === 'string') return '—';
    return `${sub.driverId.firstName} ${sub.driverId.lastName}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Management</h2>
          <p className="text-sm text-slate-500">Plans, active subscriptions, purchase & renewal history</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {(['subscriptions', 'plans', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'subscriptions' && (
        <>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <GlassCard>
            {loading ? <SkeletonRows /> : subscriptions.length === 0 ? <EmptyState message="No subscriptions found" /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Driver</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Expiry</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subscriptions.map(s => (
                      <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm">{driverName(s)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{s.planName}</td>
                        <td className="px-4 py-3 text-sm">{formatCurrency(s.amount)}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-sm">{s.expiryDate ? format(new Date(s.expiryDate), 'dd MMM yyyy') : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {s.status === 'active' && (
                            <button
                              onClick={() => expireSub(s._id, s.planName)}
                              disabled={isLoading(`expire-${s._id}`)}
                              className="inline-flex items-center gap-1 text-red-600 text-xs font-medium hover:underline disabled:opacity-50"
                            >
                              {isLoading(`expire-${s._id}`) ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                              Expire
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {tab === 'plans' && (
        <>
          <button onClick={() => setShowPlanForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> New Plan
          </button>
          {showPlanForm && (
            <GlassCard className="p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Create Subscription Plan</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plan Name <span className="text-red-500">*</span></label>
                  <input placeholder="e.g. Monthly Pro" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className={`w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 ${formErrors.name ? 'border-red-500' : ''}`} />
                  {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug <span className="text-red-500">*</span></label>
                  <input placeholder="monthly-pro" value={planForm.slug} onChange={e => setPlanForm({ ...planForm, slug: e.target.value })} className={`w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 ${formErrors.slug ? 'border-red-500' : ''}`} />
                  <p className="text-xs text-slate-500 mt-1">URL-friendly identifier</p>
                  {formErrors.slug && <p className="text-xs text-red-500 mt-1">{formErrors.slug}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (INR) <span className="text-red-500">*</span></label>
                  <input type="number" min={0} value={planForm.amount} onChange={e => setPlanForm({ ...planForm, amount: Number(e.target.value) })} className={`w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 ${formErrors.amount ? 'border-red-500' : ''}`} />
                  {formErrors.amount && <p className="text-xs text-red-500 mt-1">{formErrors.amount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (days) <span className="text-red-500">*</span></label>
                  <input type="number" min={1} value={planForm.durationDays} onChange={e => setPlanForm({ ...planForm, durationDays: Number(e.target.value) })} className={`w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700 ${formErrors.durationDays ? 'border-red-500' : ''}`} />
                  {formErrors.durationDays && <p className="text-xs text-red-500 mt-1">{formErrors.durationDays}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea placeholder="Plan benefits and details..." value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} rows={3} className="w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={createPlan} disabled={isLoading('create-plan')} className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {isLoading('create-plan') && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Plan
                </button>
                <button onClick={() => { setShowPlanForm(false); setFormErrors({}); }} className="px-6 py-2 rounded-xl border text-sm">Cancel</button>
              </div>
            </GlassCard>
          )}
          <GlassCard>
            {loading ? <SkeletonRows /> : plans.length === 0 ? <EmptyState message="No plans yet" /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Purchases</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Revenue</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Active</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {plans.map(p => (
                      <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-sm">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-3 text-sm">{p.durationDays} days</td>
                        <td className="px-4 py-3 text-sm">{p.purchaseCount || 0}</td>
                        <td className="px-4 py-3 text-sm">{formatCurrency(p.totalRevenue || 0)}</td>
                        <td className="px-4 py-3 text-sm">
                          <button onClick={() => togglePlan(p)} disabled={isLoading(`toggle-plan-${p._id}`)} title={p.isActive ? 'Deactivate' : 'Activate'}>
                            {isLoading(`toggle-plan-${p._id}`) ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : p.isActive ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deletePlan(p)} disabled={isLoading(`delete-plan-${p._id}`)} className="text-red-600 hover:text-red-800 disabled:opacity-50" title="Delete plan">
                            {isLoading(`delete-plan-${p._id}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {tab === 'history' && (
        <GlassCard>
          {loading ? <SkeletonRows /> : history.length === 0 ? <EmptyState message="No subscription history" /> : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((h: any) => (
                    <tr key={h._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm capitalize">{h.action}</td>
                      <td className="px-4 py-3 text-sm">{h.planName}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(h.amount || 0)}</td>
                      <td className="px-4 py-3 text-sm">{format(new Date(h.createdAt), 'dd MMM yyyy HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
};

export default CabSubscriptions;
