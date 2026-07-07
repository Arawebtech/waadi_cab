import React, { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import AdminAPI from '../services/api';
import { CabRideItem } from '../types';
import { formatCurrency } from '../components/cab/StatCard';
import { ActionButton, ActionGroup } from '../components/cab/ActionButtons';
import StatusBadge from '../components/cab/StatusBadge';
import { GlassCard, SkeletonRows, EmptyState } from '../components/cab/PageStates';
import RideDetailsModal from '../components/cab/RideDetailsModal';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useConfirm } from '../context/ConfirmContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const CabRides: React.FC = () => {
  const [rides, setRides] = useState<CabRideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [category, setCategory] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [viewId, setViewId] = useState<string | null>(null);
  const { run, isLoading } = useAsyncAction();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rides: items, pagination: p } = await AdminAPI.getCabRides({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        category,
      });
      setRides(items);
      setPagination(p);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, pagination.page, pagination.limit]);

  useEffect(() => { load(); }, [load]);

  const driverName = (ride: CabRideItem) => {
    if (!ride.driverId || typeof ride.driverId === 'string') return '—';
    return `${ride.driverId.firstName} ${ride.driverId.lastName}`;
  };

  const cancelRide = async (id: string) => {
    const ok = await confirm({
      title: 'Cancel this ride?',
      description: 'The customer and driver will be notified. This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Cancel Ride',
      warning: 'Active rides will be terminated immediately.',
    });
    if (!ok) return;
    await run(
      `cancel-${id}`,
      () => AdminAPI.cancelCabRide(id, 'Cancelled by admin').then(load),
      { successMessage: 'Ride cancelled', loadingMessage: 'Cancelling...' }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cab Rides</h2>
          <p className="text-sm text-slate-500">Active, completed, and cancelled ride management</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <GlassCard className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ride #, customer name or phone" className="pl-10 w-full rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm">
          <option value="">All rides</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </GlassCard>

      <GlassCard>
        {loading ? <SkeletonRows /> : rides.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Ride #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Fare</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rides.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">{r.rideNumber}</td>
                    <td className="px-4 py-3 text-sm">{r.customerName}<br /><span className="text-slate-400 text-xs">{r.customerPhone}</span></td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{r.pickup?.address} → {r.drop?.address}</td>
                    <td className="px-4 py-3 text-sm">{driverName(r)}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(r.fare?.total || 0)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-sm">{format(new Date(r.createdAt), 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ActionGroup>
                          <ActionButton variant="view" title="View" onClick={() => setViewId(r._id)} />
                          <ActionButton variant="track" title="Track" onClick={() => setViewId(r._id)} />
                          <ActionButton variant="cancel" title="Cancel" loading={isLoading(`cancel-${r._id}`)} onClick={() => cancelRide(r._id)} disabled={r.status === 'CANCELLED' || r.status === 'TRIP_COMPLETED'} />
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

      <RideDetailsModal rideId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
    </div>
  );
};

export default CabRides;
