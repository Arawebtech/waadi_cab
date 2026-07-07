'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Search } from 'lucide-react';
import { InteractiveRideMap } from '@/features/customer-ride/components/InteractiveRideMap';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { useCurrentLocation } from '@/features/customer-ride/hooks/useGeolocation';
import { useActiveRide, useRideHistory } from '@/features/customer-ride/hooks';
import { useRoutePolyline } from '@/features/customer-ride/hooks/useRoutePolyline';
import { customerBookingApi } from '@/features/customer-ride/api/booking';
import type { Ride } from '@/features/customer-ride/types';

export default function RideHomePage() {
  const router = useRouter();
  const { pickup, drop, setPickup, setDrop } = useCustomerRide();
  const { location, loading: geoLoading } = useCurrentLocation();
  const { data: activeRide } = useActiveRide();
  const { data: history } = useRideHistory(undefined, 1, 20);
  const { points } = useRoutePolyline(pickup, drop);

  useEffect(() => {
    if (activeRide && !['TRIP_COMPLETED', 'CANCELLED', 'EXPIRED'].includes(activeRide.status)) {
      router.replace(`/ride/trip?id=${activeRide.id}`);
    }
  }, [activeRide, router]);

  useEffect(() => {
    if (!pickup && location && !geoLoading) {
      customerBookingApi
        .geocodeAddress(`${location.lat},${location.lng}`)
        .then(setPickup)
        .catch(() => setPickup({ address: 'Current location', lat: location.lat, lng: location.lng }));
    }
  }, [location, geoLoading, pickup, setPickup]);

  function rebook(ride: Ride) {
    setPickup(ride.pickup);
    setDrop(ride.drop);
    router.push('/ride/booking/confirm');
  }

  const recentTrips = (history?.items ?? []).filter((r) => r.status === 'TRIP_COMPLETED').slice(0, 3);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <InteractiveRideMap
        className="fixed inset-0 z-0 h-[100dvh] w-full touch-none"
        pickup={pickup}
        drop={drop}
        routePoints={points}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
        <h1 className="text-xl font-bold text-white drop-shadow-md sm:text-2xl">Where to?</h1>

        <button
          type="button"
          onClick={() => router.push('/ride/search')}
          className="pointer-events-auto mt-3 flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-lg ring-1 ring-black/5 active:scale-[0.99] transition-transform sm:py-4"
        >
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="min-w-0 truncate text-sm font-medium text-slate-900 sm:text-base">
            {drop?.address || 'Search destination'}
          </span>
        </button>
      </div>

      {recentTrips.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 px-3 sm:px-4">
          <div className="pointer-events-auto rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Clock className="h-4 w-4 text-slate-500" />
              Recent trips
            </p>
            <div className="max-h-[min(28dvh,200px)] space-y-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] sm:max-h-[min(32dvh,240px)]">
              {recentTrips.map((ride) => (
                <button
                  key={ride.id}
                  type="button"
                  onClick={() => rebook(ride)}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left text-sm active:bg-slate-50 sm:px-3"
                >
                  <span className="min-w-0 truncate pr-2 text-slate-700">
                    {ride.pickup.address.split(',')[0]} → {ride.drop.address.split(',')[0]}
                  </span>
                  <span className="shrink-0 font-semibold text-slate-900">₹{ride.fare?.total ?? '—'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
