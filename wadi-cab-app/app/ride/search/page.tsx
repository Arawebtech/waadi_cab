'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';
import { LocationSearchInput } from '@/features/customer-ride/components/LocationSearchInput';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { useCurrentLocation } from '@/features/customer-ride/hooks/useGeolocation';
import { useRecentPlaces, POPULAR_DESTINATIONS } from '@/features/customer-ride/hooks/useRecentPlaces';
import type { Location } from '@/features/customer-ride/types';
import { Button } from '@/components/ui/button';

const DRAFT_KEY = 'wadi_cab_search_draft';

function readDraft(): { pickup: Location | null; drop: Location | null } {
  if (typeof window === 'undefined') return { pickup: null, drop: null };
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return { pickup: null, drop: null };
    return JSON.parse(raw);
  } catch {
    return { pickup: null, drop: null };
  }
}

function writeDraft(pickup: Location | null, drop: Location | null) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ pickup, drop }));
}

function PlaceListItem({ place, onClick }: { place: Location; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
    >
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span className="text-sm leading-snug text-slate-800">{place.address}</span>
    </button>
  );
}

export default function RideSearchPage() {
  const router = useRouter();
  const { pickup: ctxPickup, drop: ctxDrop, setPickup, setDrop } = useCustomerRide();
  const { location, loading: geoLoading } = useCurrentLocation();
  const { recent, addRecent } = useRecentPlaces();

  const hydratedRef = useRef(false);
  const [pickup, setPickupLocal] = useState<Location | null>(null);
  const [drop, setDropLocal] = useState<Location | null>(null);

  const syncDraft = useCallback(
    (nextPickup: Location | null, nextDrop: Location | null) => {
      setPickup(nextPickup);
      setDrop(nextDrop);
      writeDraft(nextPickup, nextDrop);
    },
    [setPickup, setDrop]
  );

  // Hydrate local fields once — avoids context/draft fighting during scroll
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const draft = readDraft();
    setPickupLocal(ctxPickup ?? draft.pickup ?? null);
    setDropLocal(ctxDrop ?? draft.drop ?? null);
  }, [ctxPickup, ctxDrop]);

  const pickupOrigin = useMemo(
    () => (location ? { lat: location.lat, lng: location.lng } : undefined),
    [location?.lat, location?.lng]
  );

  const dropOrigin = useMemo(() => {
    if (pickup) return { lat: pickup.lat, lng: pickup.lng };
    if (location) return { lat: location.lat, lng: location.lng };
    return undefined;
  }, [pickup?.lat, pickup?.lng, location?.lat, location?.lng]);

  const selectPickup = useCallback(
    (loc: Location) => {
      setPickupLocal(loc);
      syncDraft(loc, drop);
    },
    [drop, syncDraft]
  );

  const selectDrop = useCallback(
    (loc: Location) => {
      setDropLocal(loc);
      addRecent(loc);
      syncDraft(pickup, loc);
      router.push('/ride/booking/confirm');
    },
    [addRecent, pickup, router, syncDraft]
  );

  const useCurrentLocationAsPickup = useCallback(() => {
    if (!location) return;
    const loc: Location = {
      address: 'Current location',
      lat: location.lat,
      lng: location.lng,
    };
    setPickupLocal(loc);
    syncDraft(loc, drop);
  }, [location, drop, syncDraft]);

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <header className="z-20 shrink-0 border-b border-slate-100 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="rounded-full p-1 hover:bg-slate-100"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Plan your ride</h1>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 pb-4 pt-3 backdrop-blur-sm">
          <div className="space-y-4">
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pickup</p>
              <LocationSearchInput
                placeholder="Search pickup or use GPS"
                value={pickup}
                onSelect={selectPickup}
                origin={pickupOrigin}
                showGpsButton
                onUseGps={useCurrentLocationAsPickup}
                gpsLoading={geoLoading && !location}
              />
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Drop</p>
              <LocationSearchInput
                placeholder="Search destination"
                value={drop}
                onSelect={selectDrop}
                origin={dropOrigin}
              />
            </section>

            <Button
              variant="outline"
              className="w-full"
              disabled={!pickup || !drop}
              onClick={() => {
                if (drop) selectDrop(drop);
              }}
            >
              Search Rides
            </Button>
          </div>
        </div>

        <div className="space-y-6 px-4 pb-28 pt-4">
          {recent.length > 0 && (
            <section>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock className="h-4 w-4" />
                Recent
              </p>
              <div className="space-y-2">
                {recent.map((place) => (
                  <PlaceListItem
                    key={`${place.lat}-${place.lng}-${place.address}`}
                    place={place}
                    onClick={() => selectDrop(place)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="mb-3 text-sm font-semibold text-slate-700">Popular</p>
            <div className="space-y-2">
              {POPULAR_DESTINATIONS.map((place) => (
                <PlaceListItem key={place.address} place={place} onClick={() => selectDrop(place)} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
