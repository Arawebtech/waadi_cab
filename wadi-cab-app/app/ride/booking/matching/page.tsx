'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { SearchingAnimation } from '@/features/customer-ride/components/SearchingAnimation';
import { RouteSummaryCard } from '@/features/customer-ride/components/RouteSummaryCard';
import { customerBookingApi } from '@/features/customer-ride/api/booking';
import { connectCustomerSocket, joinRideRoom, onRideStatus } from '@/features/customer-ride/socket';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { useLiveDrivers } from '@/features/customer-ride/hooks';
import { type Ride } from '@/features/customer-ride/types';
import { extractErrorMessage } from '@/features/customer-ride/api/client';
import { useConfirm } from '@/components/confirm';

export default function MatchingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const rideId = params.get('id');
  const { setActiveRide } = useCustomerRide();
  const [ride, setRide] = useState<Ride | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { confirmAction } = useConfirm();
  const { data: drivers } = useLiveDrivers(ride?.pickup.lat, ride?.pickup.lng);

  useEffect(() => {
    if (!rideId) return;
    connectCustomerSocket();
    joinRideRoom(rideId);
    customerBookingApi.getBooking(rideId).then(setRide);

    return onRideStatus((payload) => {
      if (payload.rideId !== rideId && payload.ride?.id !== rideId) return;
      if (payload.ride) setRide(payload.ride);
      if (payload.status && payload.status !== 'SEARCHING_DRIVER' && payload.status !== 'REQUESTED') {
        setActiveRide(payload.ride ?? null);
        router.replace(`/ride/trip?id=${rideId}`);
      }
    });
  }, [rideId, router, setActiveRide]);

  async function cancel() {
    if (!rideId) return;
    await confirmAction({
      title: 'Cancel request?',
      description: 'Stop searching for a driver for this trip.',
      confirmLabel: 'Cancel request',
      cancelLabel: 'Keep searching',
      variant: 'danger',
      action: async () => {
        setCancelling(true);
        try {
          await customerBookingApi.cancelBooking(rideId, 'Changed plans');
          router.replace('/ride');
        } finally {
          setCancelling(false);
        }
      },
    }).catch((err) => alert(extractErrorMessage(err)));
  }

  if (!rideId) return <p className="p-6">Missing ride ID</p>;

  return (
    <div className="min-h-screen bg-white px-4 pb-8 pt-6">
      {ride && (
        <RouteSummaryCard
          pickup={ride.pickup.address}
          drop={ride.drop.address}
          distanceKm={ride.distanceKm}
          durationMin={ride.durationMin}
          fareTotal={ride.fare?.total}
          vehicleName={ride.vehicleTypeSlug}
        />
      )}

      <SearchingAnimation nearbyCount={drivers?.length ?? 0} />

      <button type="button" onClick={cancel} disabled={cancelling} className="mx-auto mt-8 flex items-center gap-2 rounded-full border px-6 py-3 text-sm">
        <X className="h-4 w-4" />
        {cancelling ? 'Cancelling…' : 'Cancel request'}
      </button>
    </div>
  );
}
