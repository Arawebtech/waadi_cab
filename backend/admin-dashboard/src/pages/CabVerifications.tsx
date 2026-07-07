import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import AdminAPI from '../services/api';
import { ActionButton, ActionGroup } from '../components/cab/ActionButtons';
import StatusBadge from '../components/cab/StatusBadge';
import { GlassCard, SkeletonRows, EmptyState } from '../components/cab/PageStates';
import DriverDetailsModal from '../components/cab/DriverDetailsModal';
import VehicleDetailsModal from '../components/cab/VehicleDetailsModal';
import DocumentDetailsModal from '../components/cab/DocumentDetailsModal';
import PremiumModal from '../components/cab/PremiumModal';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useConfirm } from '../context/ConfirmContext';

const CabVerifications: React.FC = () => {
  const [data, setData] = useState<{ profiles: any[]; documents: any[]; vehicles: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'profiles' | 'documents' | 'vehicles'>('profiles');
  const { run, isLoading } = useAsyncAction();
  const { confirm } = useConfirm();

  const [viewDriverId, setViewDriverId] = useState<string | null>(null);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);
  const [viewDocumentId, setViewDocumentId] = useState<string | null>(null);
  const [profilePreview, setProfilePreview] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await AdminAPI.getCabPendingVerifications());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approveProfile = async (id: string) => {
    const ok = await confirm({ title: 'Approve driver profile?', description: 'This will mark the profile as verified.', confirmLabel: 'Approve' });
    if (!ok) return;
    await run(`approve-p-${id}`, () => AdminAPI.verifyCabDriverProfile(id, 'approved').then(load), { successMessage: 'Driver approved', loadingMessage: 'Approving...' });
  };

  const rejectProfile = async (id: string) => {
    const ok = await confirm({ title: 'Reject driver profile?', variant: 'danger', confirmLabel: 'Reject' });
    if (!ok) return;
    await run(`reject-p-${id}`, () => AdminAPI.verifyCabDriverProfile(id, 'rejected', 'Profile rejected by admin').then(load), { successMessage: 'Profile rejected', loadingMessage: 'Rejecting...' });
  };

  const approveVehicle = async (id: string) => {
    const ok = await confirm({ title: 'Approve vehicle?', confirmLabel: 'Approve' });
    if (!ok) return;
    await run(`approve-v-${id}`, () => AdminAPI.verifyCabVehicle(id, 'approved').then(load), { successMessage: 'Vehicle approved', loadingMessage: 'Approving...' });
  };

  const rejectVehicle = async (id: string) => {
    const ok = await confirm({ title: 'Reject vehicle?', variant: 'danger', confirmLabel: 'Reject' });
    if (!ok) return;
    await run(`reject-v-${id}`, () => AdminAPI.verifyCabVehicle(id, 'rejected', 'Rejected by admin').then(load), { successMessage: 'Vehicle rejected', loadingMessage: 'Rejecting...' });
  };

  const deleteDocument = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this document?',
      description: 'File will be removed from storage permanently.',
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await run(`delete-d-${id}`, () => AdminAPI.deleteCabDocument(id).then(load), { successMessage: 'Document deleted', loadingMessage: 'Deleting...' });
  };

  const items = tab === 'profiles' ? data?.profiles : tab === 'documents' ? data?.documents : data?.vehicles;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verification Management</h2>
          <p className="text-sm text-slate-500">
            Inspect documents before approval · <Link to="/cab-verifications/history" className="text-blue-600 hover:underline">View history</Link>
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {(['profiles', 'documents', 'vehicles'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
          >
            {t} ({t === 'profiles' ? data?.profiles?.length : t === 'documents' ? data?.documents?.length : data?.vehicles?.length})
          </button>
        ))}
      </div>

      <GlassCard>
        {loading ? <SkeletonRows /> : !items?.length ? <EmptyState message={`No pending ${tab}`} /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tab === 'profiles' && data?.profiles.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.phoneNumber} · {p.email || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.cabBooking?.profileVerificationStatus || 'pending'} /></td>
                    <td className="px-4 py-3 text-sm">{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <ActionGroup>
                        <ActionButton variant="view" title="View" onClick={() => setProfilePreview(p)} />
                        <ActionButton variant="approve" title="Approve" loading={isLoading(`approve-p-${p._id}`)} onClick={() => approveProfile(p._id)} />
                        <ActionButton variant="reject" title="Reject" loading={isLoading(`reject-p-${p._id}`)} onClick={() => rejectProfile(p._id)} />
                      </ActionGroup>
                    </td>
                  </tr>
                ))}
                {tab === 'documents' && data?.documents.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 capitalize font-medium">{d.docType?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm">
                      {d.vehicleNumber && <span className="font-mono mr-2">{d.vehicleNumber}</span>}
                      {d.userId?.firstName} {d.userId?.lastName}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-sm">{d.uploadedAt ? format(new Date(d.uploadedAt), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3">
                      <ActionGroup>
                        <ActionButton variant="view" title="View" onClick={() => setViewDocumentId(d._id)} />
                        <ActionButton variant="delete" title="Delete" loading={isLoading(`delete-d-${d._id}`)} onClick={() => deleteDocument(d._id)} />
                      </ActionGroup>
                    </td>
                  </tr>
                ))}
                {tab === 'vehicles' && data?.vehicles.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium">{v.vehicleNumber}</td>
                    <td className="px-4 py-3 text-sm capitalize">{v.vehicleType} · {v.userId?.firstName} {v.userId?.lastName}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.verificationStatus} /></td>
                    <td className="px-4 py-3 text-sm">{format(new Date(v.createdAt), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <ActionGroup>
                        <ActionButton variant="view" title="View" onClick={() => setViewVehicleId(v._id)} />
                        <ActionButton variant="approve" title="Approve" loading={isLoading(`approve-v-${v._id}`)} onClick={() => approveVehicle(v._id)} />
                        <ActionButton variant="reject" title="Reject" loading={isLoading(`reject-v-${v._id}`)} onClick={() => rejectVehicle(v._id)} />
                      </ActionGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <PremiumModal
        open={!!profilePreview}
        onClose={() => setProfilePreview(null)}
        title={`${profilePreview?.firstName || ''} ${profilePreview?.lastName || ''}`}
        subtitle="Driver Profile Verification"
        size="lg"
        footer={
          profilePreview ? (
            <ActionGroup>
              <ActionButton variant="view" title="Full Details" onClick={() => { setViewDriverId(profilePreview._id); setProfilePreview(null); }} />
              <ActionButton variant="approve" title="Approve" onClick={() => { approveProfile(profilePreview._id); setProfilePreview(null); }} />
              <ActionButton variant="reject" title="Reject" onClick={() => { rejectProfile(profilePreview._id); setProfilePreview(null); }} />
            </ActionGroup>
          ) : undefined
        }
      >
        {profilePreview && (
          <div className="space-y-3 text-sm">
            {profilePreview.profile?.avatar && (
              <img src={profilePreview.profile.avatar} alt="Profile" className="w-24 h-24 rounded-xl object-cover" />
            )}
            <p><strong>Phone:</strong> {profilePreview.phoneNumber}</p>
            <p><strong>Email:</strong> {profilePreview.email || '—'}</p>
            <p><strong>Registered:</strong> {format(new Date(profilePreview.createdAt), 'dd MMM yyyy HH:mm')}</p>
            <StatusBadge status={profilePreview.cabBooking?.profileVerificationStatus || 'pending'} />
            <p><strong>Step:</strong> {profilePreview.cabBooking?.registrationStep || 1} / 6</p>
          </div>
        )}
      </PremiumModal>

      <DriverDetailsModal driverId={viewDriverId} open={!!viewDriverId} onClose={() => setViewDriverId(null)} onUpdated={load} />
      <VehicleDetailsModal vehicleId={viewVehicleId} open={!!viewVehicleId} onClose={() => setViewVehicleId(null)} />
      <DocumentDetailsModal documentId={viewDocumentId} open={!!viewDocumentId} onClose={() => setViewDocumentId(null)} onAction={load} />
    </div>
  );
};

export default CabVerifications;
