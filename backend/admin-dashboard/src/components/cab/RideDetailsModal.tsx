import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import PremiumModal from './PremiumModal';
import StatusBadge from './StatusBadge';
import { SkeletonRows, ErrorState } from './PageStates';
import AdminAPI from '../../services/api';
import { formatCurrency } from './StatCard';
import { MapPin, User, Car, Clock, CreditCard } from 'lucide-react';

interface Props {
  rideId: string | null;
  open: boolean;
  onClose: () => void;
}

const RideDetailsModal: React.FC<Props> = ({ rideId, open, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !rideId) return;
    setLoading(true);
    AdminAPI.getCabRideDetails(rideId)
      .then(setData)
      .catch(() => setError('Failed to load ride'))
      .finally(() => setLoading(false));
  }, [open, rideId]);

  const ride = data?.ride;

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      title={ride?.rideNumber || 'Ride Details'}
      subtitle={ride?.status}
      size="xl"
    >
      {loading ? <SkeletonRows /> : error ? <ErrorState message={error} /> : ride ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Section icon={User} title="Customer">
              <p className="font-medium">{ride.customerName}</p>
              <p className="text-sm text-slate-500">{ride.customerPhone || '—'}</p>
            </Section>
            <Section icon={Car} title="Driver">
              {ride.driverId && typeof ride.driverId === 'object' ? (
                <>
                  <p className="font-medium">{ride.driverId.firstName} {ride.driverId.lastName}</p>
                  <p className="text-sm text-slate-500">{ride.driverId.phoneNumber}</p>
                </>
              ) : <p className="text-slate-500">Unassigned</p>}
              {ride.vehicleId && typeof ride.vehicleId === 'object' && (
                <p className="text-sm mt-1">{ride.vehicleId.vehicleNumber} · {ride.vehicleId.vehicleType}</p>
              )}
            </Section>
            <Section icon={MapPin} title="Route">
              <p className="text-sm"><span className="text-emerald-600 font-medium">Pickup:</span> {ride.pickup?.address}</p>
              <p className="text-sm mt-2"><span className="text-red-600 font-medium">Drop:</span> {ride.drop?.address}</p>
              <p className="text-xs text-slate-400 mt-2">{ride.distanceKm || 0} km · {ride.durationMin || 0} min</p>
            </Section>
            <Section icon={CreditCard} title="Payment">
              <p className="text-2xl font-bold">{formatCurrency(ride.fare?.total || 0)}</p>
              <p className="text-sm capitalize">{ride.paymentMethod} · Base {formatCurrency(ride.fare?.base || 0)}</p>
              <StatusBadge status={ride.status} />
            </Section>
          </div>
          <div>
            <Section icon={Clock} title="Timeline">
              <div className="relative border-l-2 border-blue-200 dark:border-blue-800 ml-3 space-y-4 pl-6">
                {(data.timeline || []).map((t: any, i: number) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[1.6rem] w-3 h-3 rounded-full bg-blue-600" />
                    <p className="font-medium text-sm">{t.event}</p>
                    <p className="text-xs text-slate-500">{format(new Date(t.at), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                ))}
              </div>
            </Section>
            {data.relatedRides?.length > 0 && (
              <Section icon={Clock} title="Customer Ride History">
                {data.relatedRides.map((r: any) => (
                  <div key={r._id} className="flex justify-between text-sm py-1 border-b">
                    <span>{r.rideNumber}</span>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </Section>
            )}
          </div>
        </div>
      ) : null}
    </PremiumModal>
  );
};

const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-blue-600" />
      <p className="font-semibold text-sm">{title}</p>
    </div>
    {children}
  </div>
);

export default RideDetailsModal;
