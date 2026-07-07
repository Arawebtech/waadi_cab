import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import PremiumModal from './PremiumModal';
import StatusBadge from './StatusBadge';
import DocumentDetailsModal from './DocumentDetailsModal';
import { SkeletonRows, ErrorState } from './PageStates';
import AdminAPI from '../../services/api';
import { ActionButton, ActionGroup } from './ActionButtons';
import { formatCurrency } from './StatCard';
import { User, Car, Wallet, MapPin, Wifi, WifiOff, Star } from 'lucide-react';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useConfirm } from '../../context/ConfirmContext';

interface Props {
  driverId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const DriverDetailsModal: React.FC<Props> = ({ driverId, open, onClose, onUpdated }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('profile');
  const [docId, setDocId] = useState<string | null>(null);
  const { run, isLoading } = useAsyncAction();
  const { confirm } = useConfirm();

  const load = () => {
    if (!driverId) return;
    setLoading(true);
    setError(null);
    AdminAPI.getCabDriverDetails(driverId)
      .then(setData)
      .catch(() => setError('Failed to load driver details'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && driverId) load();
  }, [open, driverId]);

  const profile = data?.profile;
  const tabs = ['profile', 'ratings', 'vehicle', 'documents', 'subscription', 'wallet', 'rides', 'live'];

  const withConfirm = async (action: () => Promise<unknown>, opts: { title: string; description: string; variant?: 'danger' | 'primary'; key: string; success: string }) => {
    const ok = await confirm({ title: opts.title, description: opts.description, variant: opts.variant, confirmLabel: opts.variant === 'danger' ? 'Confirm' : 'Approve' });
    if (!ok) return;
    await run(opts.key, async () => { await action(); load(); onUpdated?.(); }, { successMessage: opts.success });
  };

  const footer = profile ? (
    <ActionGroup>
      <ActionButton variant="approve" title="Approve Driver" loading={isLoading('approve-driver')} onClick={() => withConfirm(() => AdminAPI.verifyCabDriverProfile(driverId!, 'approved'), { title: 'Approve driver account?', description: 'Driver can receive rides after approval.', key: 'approve-driver', success: 'Driver approved' })} />
      <ActionButton variant="reject" title="Reject Driver" loading={isLoading('reject-driver')} onClick={() => withConfirm(() => AdminAPI.verifyCabDriverProfile(driverId!, 'rejected', 'Rejected by admin'), { title: 'Reject driver account?', description: 'Driver will not be able to go online.', variant: 'danger', key: 'reject-driver', success: 'Driver rejected' })} />
      <ActionButton variant="reject" title={profile.isActive === false ? 'Activate' : 'Suspend'} loading={isLoading('suspend')} onClick={() => withConfirm(() => AdminAPI.updateCabDriver(driverId!, { isActive: profile.isActive === false }), { title: profile.isActive === false ? 'Activate driver?' : 'Suspend driver?', description: 'This affects login and ride access.', variant: 'danger', key: 'suspend', success: profile.isActive === false ? 'Driver activated' : 'Driver suspended' })} />
    </ActionGroup>
  ) : undefined;

  return (
    <>
      <PremiumModal open={open} onClose={onClose} title={profile ? `${profile.firstName} ${profile.lastName}` : 'Driver Details'} subtitle={profile?.phoneNumber} size="xl" footer={footer}>
        {loading ? <SkeletonRows rows={8} cols={2} /> : error ? <ErrorState message={error} /> : data ? (
          <>
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto pb-1">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize whitespace-nowrap transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{t}</button>
              ))}
            </div>

            {tab === 'profile' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {data.profilePhoto?.url && <img src={data.profilePhoto.url} alt="Profile" className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-lg" />}
                  <InfoRow icon={User} label="Name" value={`${profile.firstName} ${profile.lastName}`} />
                  <InfoRow icon={User} label="Phone" value={profile.phoneNumber} />
                  <InfoRow icon={User} label="Email" value={profile.email || '—'} />
                  <StatusBadge status={profile.cabBooking?.profileVerificationStatus || 'pending'} label="Profile KYC" />
                  <StatusBadge status={profile.isActive === false ? 'suspended' : 'active'} label="Account" />
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2 text-sm">
                  <p className="font-semibold">Address</p>
                  <p>{profile.profile?.address?.street || '—'}</p>
                  <p>{[profile.profile?.address?.city, profile.profile?.address?.state].filter(Boolean).join(', ') || '—'}</p>
                </div>
              </div>
            )}

            {tab === 'ratings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Average" value={data.analytics?.ratings?.average != null ? `${data.analytics.ratings.average} ★` : '—'} />
                  <Stat label="Reviews" value={data.analytics?.ratings?.totalReviews ?? 0} />
                  <Stat label="Trips" value={data.analytics?.rides?.completed ?? 0} />
                </div>
                {data.analytics?.ratings?.lastRating && (
                  <div className="rounded-xl border p-4">
                    <p className="text-sm font-semibold mb-2">Latest review</p>
                    <div className="flex items-center gap-1 text-amber-500 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < (data.analytics.ratings.lastRating.score || 0) ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                    <p className="text-sm">{data.analytics.ratings.lastRating.review || 'No comment'}</p>
                    <p className="text-xs text-slate-500 mt-2">Ride {data.analytics.ratings.lastRideNumber} · {data.analytics.ratings.lastCustomerName || 'Customer'}</p>
                  </div>
                )}
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="rounded-lg bg-slate-50 p-2">
                      <p>{star}★</p>
                      <p className="font-bold">{data.analytics?.ratings?.breakdown?.[star] ?? 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'vehicle' && (
              <div className="space-y-4">
                {data.activeVehicle ? <VehicleCard vehicle={data.activeVehicle} label="Active Vehicle" onVerify={withConfirm} driverId={driverId!} onReload={load} /> : <p className="text-sm text-slate-500">No active vehicle</p>}
                {data.vehicles?.map((v: any) => <VehicleCard key={v._id} vehicle={v} onVerify={withConfirm} driverId={driverId!} onReload={load} />)}
              </div>
            )}

            {tab === 'documents' && (
              <div className="grid md:grid-cols-2 gap-4">
                {data.documents?.length ? data.documents.map((d: any) => (
                  <button key={d._id || d.docType} type="button" onClick={() => setDocId(d._id)} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-left hover:border-blue-400 transition">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize text-sm">{d.docType?.replace(/_/g, ' ')}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    {d.url && <img src={d.url} alt={d.docType} className="h-24 w-full object-cover rounded-lg" />}
                    <p className="text-xs text-slate-500 mt-2">{d.vehicleNumber}</p>
                  </button>
                )) : <p className="text-sm text-slate-500">No documents</p>}
              </div>
            )}

            {tab === 'subscription' && (
              <div className="space-y-4">
                {data.subscription ? (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4">
                    <p className="font-semibold">{data.subscription.planName}</p>
                    <p className="text-sm">{formatCurrency(data.subscription.amount)} · Expires {data.subscription.expiryDate ? format(new Date(data.subscription.expiryDate), 'dd MMM yyyy') : '—'}</p>
                    <StatusBadge status={data.subscription.status} />
                  </div>
                ) : <p className="text-sm text-slate-500">No active subscription</p>}
              </div>
            )}

            {tab === 'wallet' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 p-4 flex items-center gap-3">
                  <Wallet className="h-8 w-8 text-purple-600" />
                  <div><p className="text-sm text-slate-500">Balance</p><p className="text-2xl font-bold">{formatCurrency(data.wallet?.balance || 0)}</p></div>
                </div>
                {data.transactions?.slice(0, 10).map((tx: any) => (
                  <div key={tx._id} className="flex justify-between text-sm border-b py-2"><span className="capitalize">{tx.type} · {tx.purpose}</span><span>{formatCurrency(tx.amount)}</span></div>
                ))}
              </div>
            )}

            {tab === 'rides' && (
              <>
                <div className="grid md:grid-cols-4 gap-3 mb-4">
                  <Stat label="Total" value={data.analytics?.rides?.total} />
                  <Stat label="Completed" value={data.analytics?.rides?.completed} />
                  <Stat label="Cancelled" value={data.analytics?.rides?.cancelled} />
                  <Stat label="Earnings" value={formatCurrency(data.analytics?.earnings || 0)} />
                </div>
                {data.recentRides?.map((r: any) => (
                  <div key={r._id} className="flex justify-between text-sm border-b py-2">
                    <span>{r.rideNumber} · {r.status}</span>
                    <span>{formatCurrency(r.fare?.total || 0)}</span>
                  </div>
                ))}
              </>
            )}

            {tab === 'live' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {data.location?.isOnline ? <Wifi className="h-5 w-5 text-emerald-500" /> : <WifiOff className="h-5 w-5 text-slate-400" />}
                  <StatusBadge status={data.location?.isOnline ? (data.activeRide ? 'on_trip' : data.location?.isAvailable ? 'available' : 'online') : 'offline'} />
                </div>
                {data.activeRide && <div className="rounded-lg bg-blue-50 p-3 text-sm"><p className="font-medium">Current Ride: {data.activeRide.rideNumber}</p><StatusBadge status={data.activeRide.status} /></div>}
              </div>
            )}
          </>
        ) : null}
      </PremiumModal>

      <DocumentDetailsModal documentId={docId} open={Boolean(docId)} onClose={() => setDocId(null)} onAction={() => { load(); onUpdated?.(); }} />
    </>
  );
};

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-3 text-sm"><Icon className="h-4 w-4 text-slate-400" /><span className="text-slate-500 w-24">{label}</span><span className="font-medium">{value}</span></div>
);

const VehicleCard = ({ vehicle, label, onVerify }: { vehicle: any; label?: string; onVerify: any; driverId?: string; onReload?: () => void }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
    <div className="flex gap-4">
      <Car className="h-8 w-8 text-blue-500" />
      <div className="flex-1">
        {label && <p className="text-xs text-blue-600 font-medium mb-1">{label}</p>}
        <p className="font-semibold">{vehicle.vehicleNumber}</p>
        <p className="text-sm text-slate-500 capitalize">{vehicle.vehicleType} · {vehicle.seatCapacity} seats</p>
        <StatusBadge status={vehicle.verificationStatus} />
      </div>
    </div>
    <div className="mt-3 flex gap-2">
      <ActionButton variant="approve" title="Approve" onClick={() => onVerify(() => AdminAPI.verifyCabVehicle(vehicle._id, 'approved'), { title: 'Approve vehicle?', description: vehicle.vehicleNumber, key: `v-approve-${vehicle._id}`, success: 'Vehicle approved' })} />
      <ActionButton variant="reject" title="Reject" onClick={() => onVerify(() => AdminAPI.verifyCabVehicle(vehicle._id, 'rejected', 'Rejected by admin'), { title: 'Reject vehicle?', description: vehicle.vehicleNumber, variant: 'danger', key: `v-reject-${vehicle._id}`, success: 'Vehicle rejected' })} />
    </div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center"><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold">{value ?? 0}</p></div>
);

export default DriverDetailsModal;
