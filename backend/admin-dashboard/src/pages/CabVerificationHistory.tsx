import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import AdminAPI from '../services/api';
import { ActionButton, ActionGroup } from '../components/cab/ActionButtons';
import StatusBadge from '../components/cab/StatusBadge';
import { GlassCard, SkeletonRows, EmptyState } from '../components/cab/PageStates';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useConfirm } from '../context/ConfirmContext';
import DriverDetailsModal from '../components/cab/DriverDetailsModal';
import DocumentDetailsModal from '../components/cab/DocumentDetailsModal';
import VehicleDetailsModal from '../components/cab/VehicleDetailsModal';

const ENTITY_LABELS: Record<string, string> = {
  driver_profile: 'Driver Profile',
  driver_document: 'Document',
  vehicle: 'Vehicle',
  subscription: 'Subscription',
};

const CabVerificationHistory: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [status, setStatus] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const { run, isLoading } = useAsyncAction();
  const { confirm } = useConfirm();

  const [viewDriverId, setViewDriverId] = useState<string | null>(null);
  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { history, pagination: p } = await AdminAPI.getCabVerificationHistory({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        entityType,
        status,
        action,
        dateFrom,
        dateTo,
      });
      setItems(history);
      setPagination(p);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, entityType, status, action, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (item: any) => {
    const ok = await confirm({ title: 'Approve verification?', description: `Approve this ${ENTITY_LABELS[item.entityType] || item.entityType}?`, confirmLabel: 'Approve' });
    if (!ok) return;
    await run(`approve-${item._id}`, async () => {
      if (item.entityType === 'driver_profile') await AdminAPI.verifyCabDriverProfile(String(item.entityId), 'approved');
      else if (item.entityType === 'driver_document') await AdminAPI.verifyCabDocument(String(item.entityId), 'approved');
      else if (item.entityType === 'vehicle') await AdminAPI.verifyCabVehicle(String(item.entityId), 'approved');
      await load();
    }, { successMessage: 'Approved successfully', loadingMessage: 'Approving...' });
  };

  const handleReject = async (item: any) => {
    const ok = await confirm({ title: 'Reject verification?', description: 'This will mark the item as rejected.', variant: 'danger', confirmLabel: 'Reject' });
    if (!ok) return;
    await run(`reject-${item._id}`, async () => {
      if (item.entityType === 'driver_profile') await AdminAPI.verifyCabDriverProfile(String(item.entityId), 'rejected', 'Rejected by admin');
      else if (item.entityType === 'driver_document') await AdminAPI.verifyCabDocument(String(item.entityId), 'rejected', 'Rejected by admin');
      else if (item.entityType === 'vehicle') await AdminAPI.verifyCabVehicle(String(item.entityId), 'rejected', 'Rejected by admin');
      await load();
    }, { successMessage: 'Rejected', loadingMessage: 'Rejecting...' });
  };

  const handleDelete = async (item: any) => {
    const ok = await confirm({ title: 'Delete history record?', description: 'This removes the history entry only.', variant: 'danger', confirmLabel: 'Delete' });
    if (!ok) return;
    await run(`del-${item._id}`, async () => {
      await AdminAPI.deleteCabVerificationHistory(item._id);
      await load();
    }, { successMessage: 'Record deleted', loadingMessage: 'Deleting...' });
  };

  const handleReverify = async (item: any) => {
    const ok = await confirm({ title: 'Re-verify?', description: 'Reset to pending/under review for re-inspection.', confirmLabel: 'Re-verify' });
    if (!ok) return;
    await run(`reverify-${item._id}`, async () => {
      await AdminAPI.reverifyCabVerification(item._id);
      await load();
    }, { successMessage: 'Re-verification initiated', loadingMessage: 'Processing...' });
  };

  const openView = (item: any) => {
    if (item.entityType === 'driver_profile') setViewDriverId(String(item.entityId));
    else if (item.entityType === 'driver_document') setViewDocId(String(item.entityId));
    else if (item.entityType === 'vehicle') setViewVehicleId(String(item.entityId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verification History</h2>
          <p className="text-sm text-slate-500">
            <Link to="/cab-verifications" className="text-blue-600 hover:underline">Pending verifications</Link> · All historical records
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <GlassCard className="p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-10 w-full rounded-xl border px-3 py-2 text-sm dark:bg-slate-800 dark:border-slate-700" />
        </div>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800">
          <option value="">All types</option>
          <option value="driver_profile">Driver Profile</option>
          <option value="driver_document">Document</option>
          <option value="vehicle">Vehicle</option>
          <option value="subscription">Subscription</option>
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800">
          <option value="">All actions</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="deleted">Deleted</option>
          <option value="expired">Expired</option>
          <option value="reverified">Re-verified</option>
          <option value="suspended">Suspended</option>
          <option value="activated">Activated</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="deleted">Deleted</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border px-3 py-2 text-sm dark:bg-slate-800" />
      </GlassCard>

      <GlassCard>
        {loading ? <SkeletonRows /> : items.length === 0 ? <EmptyState message="No verification history" /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-sm">{ENTITY_LABELS[item.entityType] || item.entityType}</td>
                    <td className="px-4 py-3 text-sm">
                      {item.metadata?.entityLabel || item.metadata?.vehicleNumber || item.metadata?.docType || '—'}
                      {item.reason && <p className="text-xs text-red-500 truncate max-w-xs">{item.reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{item.action?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-sm">{item.performedByName || 'Admin'}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{format(new Date(item.createdAt), 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ActionGroup>
                          <ActionButton variant="view" title="View" onClick={() => openView(item)} />
                          {item.status === 'pending' && (
                            <>
                              <ActionButton variant="approve" title="Approve" loading={isLoading(`approve-${item._id}`)} onClick={() => handleApprove(item)} />
                              <ActionButton variant="reject" title="Reject" loading={isLoading(`reject-${item._id}`)} onClick={() => handleReject(item)} />
                            </>
                          )}
                          <ActionButton variant="history" title="Re-verify" loading={isLoading(`reverify-${item._id}`)} onClick={() => handleReverify(item)} />
                          <ActionButton variant="delete" title="Delete" loading={isLoading(`del-${item._id}`)} onClick={() => handleDelete(item)} />
                        </ActionGroup>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
            <button disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
            <span className="text-sm py-1">{pagination.page} / {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </GlassCard>

      <DriverDetailsModal driverId={viewDriverId} open={!!viewDriverId} onClose={() => setViewDriverId(null)} />
      <DocumentDetailsModal documentId={viewDocId} open={!!viewDocId} onClose={() => setViewDocId(null)} onAction={load} />
      <VehicleDetailsModal vehicleId={viewVehicleId} open={!!viewVehicleId} onClose={() => setViewVehicleId(null)} />
    </div>
  );
};

export default CabVerificationHistory;
