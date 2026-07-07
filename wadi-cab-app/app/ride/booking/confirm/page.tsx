'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { InteractiveRideMap } from '@/features/customer-ride/components/InteractiveRideMap';
import { RouteSummaryCard } from '@/features/customer-ride/components/RouteSummaryCard';
import { RideTypeSelector } from '@/features/customer-ride/components/RideTypeSelector';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { useFareEstimate } from '@/features/customer-ride/hooks';
import { useRoutePolyline } from '@/features/customer-ride/hooks/useRoutePolyline';
import { customerBookingApi } from '@/features/customer-ride/api/booking';
import { extractErrorMessage } from '@/features/customer-ride/api/client';
import { useConfirm } from '@/components/confirm';
import type { FareEstimate } from '@/features/customer-ride/types';

export default function BookingConfirmPage() {
  const router = useRouter();
  const { pickup, drop, setActiveRide } = useCustomerRide();
  const { data, isLoading, error } = useFareEstimate(pickup, drop);
  const { points, distanceKm, durationMin } = useRoutePolyline(pickup, drop);
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { confirmAction } = useConfirm();

  useEffect(() => {
    if (data?.estimates?.length && !selected) {
      setSelected(data.estimates[0].vehicleType.slug);
    }
  }, [data, selected]);

  if (!pickup || !drop) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Set pickup and drop locations first.</p>
        <button type="button" onClick={() => router.push('/ride/search')} className="mt-4 underline">Search locations</button>
      </div>
    );
  }

  async function confirmRide() {
    await confirmAction({
      title: 'Confirm booking?',
      description: selectedEstimate
        ? `Search for a ${selectedEstimate.vehicleType.name} · ₹${selectedEstimate.fare.total}`
        : 'Start searching for nearby drivers.',
      confirmLabel: 'Search ride',
      cancelLabel: 'Go back',
      variant: 'primary',
      action: async () => {
        setSubmitting(true);
        setSubmitError(null);
        try {
          const ride = await customerBookingApi.createBooking({
            pickup,
            drop,
            vehicleTypeSlug: selected,
            paymentMethod: 'cash',
            tripType: 'local',
          });
          setActiveRide(ride);
          router.push(`/ride/booking/matching?id=${ride.id}`);
        } catch (err) {
          setSubmitError(extractErrorMessage(err));
          throw err;
        } finally {
          setSubmitting(false);
        }
      },
    });
  }

  const selectedEstimate = data?.estimates.find((e: FareEstimate) => e.vehicleType.slug === selected);

  return (
    <div className="relative min-h-screen bg-slate-50">
      <InteractiveRideMap className="h-[42vh] w-full" pickup={pickup} drop={drop} routePoints={points} />

      <header className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10">
        <button type="button" onClick={() => router.back()} className="rounded-full bg-white p-3 shadow-lg" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </header>

      <div className="relative -mt-6 space-y-4 rounded-t-[28px] bg-slate-50 p-4 pb-8">
        <RouteSummaryCard
          pickup={pickup.address}
          drop={drop.address}
          distanceKm={distanceKm ?? data?.distanceKm}
          durationMin={durationMin ?? data?.durationMin}
          fareTotal={selectedEstimate?.fare.total}
          vehicleName={selectedEstimate?.vehicleType.name}
        />

        {error && <p className="text-sm text-red-600">Could not load fares. Try again.</p>}

        <RideTypeSelector estimates={data?.estimates ?? []} selectedSlug={selected} onSelect={setSelected} loading={isLoading} />

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          type="button"
          disabled={submitting || !selectedEstimate}
          onClick={confirmRide}
          className="w-full rounded-2xl bg-black py-4 text-lg font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Requesting…' : selectedEstimate ? `Search Ride · ₹${selectedEstimate.fare.total}` : 'Search Ride'}
        </button>
      </div>
    </div>
  );
}
