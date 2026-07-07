import React, { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import AdminAPI from '../services/api';
import { CabDriver } from '../types';
import { ActionButton, ActionGroup } from '../components/cab/ActionButtons';
import StatusBadge from '../components/cab/StatusBadge';
import { GlassCard, SkeletonRows, EmptyState } from '../components/cab/PageStates';
import DriverDetailsModal from '../components/cab/DriverDetailsModal';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useConfirm } from '../context/ConfirmContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const CabDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<CabDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [viewId, setViewId] = useState<string | null>(null);
  const { run, isLoading } = useAsyncAction();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { drivers: items, pagination: p } = await AdminAPI.getCabDrivers({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        status,
      });
      setDrivers(items);
      setPagination(p);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, pagination.page, pagination.limit]);

  useEffect(() => { load(); }, [load]);

  const toggleSuspend = async (driver: CabDriver) => {
    const activating = !driver.isActive;
    const ok = await confirm({
      title: activating ? 'Activate this driver?' : 'Suspend this driver?',
      description: activating
        ? 'The driver will be able to go online and accept rides.'
        : 'The driver will be blocked from accepting new rides.',
      variant: activating ? 'primary' : 'danger',
      confirmLabel: activating ? 'Activate' : 'Suspend',
    });
    if (!ok) return;
    await run(
      `suspend-${driver._id}`,
      () => AdminAPI.updateCabDriver(driver._id, { isActive: activating }).then(load),
      {
        successMessage: activating ? 'Driver activated' : 'Driver suspended',
        loadingMessage: activating ? 'Activating...' : 'Suspending...',
      }
    );
  };

  const verifyProfile = async (driver: CabDriver) => {
    const ok = await confirm({
      title: 'Approve driver profile?',
      description: 'This will mark the driver profile as verified.',
      confirmLabel: 'Approve',
    });
    if (!ok) return;
    await run(
      `verify-${driver._id}`,
      () => AdminAPI.verifyCabDriverProfile(driver._id, 'approved').then(load),
      { successMessage: 'Driver approved', loadingMessage: 'Approving...' }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cab Drivers</h2>
          <p className="text-sm text-slate-500">View, verify, and manage driver accounts</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <GlassCard className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone" className="pl-10 w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </GlassCard>

      <GlassCard>
        {loading ? <SkeletonRows /> : drivers.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">KYC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Joined</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {drivers.map(d => (
                  <tr key={d._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{d.firstName} {d.lastName}</td>
                    <td className="px-4 py-3 text-sm">{d.phoneNumber}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.cabBooking?.profileVerificationStatus || 'pending'} /></td>
                    <td className="px-4 py-3"><StatusBadge status={d.isActive ? 'active' : 'rejected'} label={d.isActive ? 'Active' : 'Suspended'} /></td>
                    <td className="px-4 py-3 text-sm">{format(new Date(d.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ActionGroup>
                          <ActionButton variant="view" title="View" onClick={() => setViewId(d._id)} />
                          <ActionButton variant="approve" title="Verify" loading={isLoading(`verify-${d._id}`)} onClick={() => verifyProfile(d)} disabled={d.cabBooking?.profileVerificationStatus === 'approved'} />
                          <ActionButton variant="suspend" title={d.isActive ? 'Suspend' : 'Activate'} loading={isLoading(`suspend-${d._id}`)} onClick={() => toggleSuspend(d)} />
                        </ActionGroup>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <DriverDetailsModal driverId={viewId} open={!!viewId} onClose={() => setViewId(null)} onUpdated={load} />
    </div>
  );
};

export default CabDrivers;
