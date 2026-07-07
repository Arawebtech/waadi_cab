'use client';

import { useEffect, useState } from 'react';
import { onDriverLocation } from '../socket';
import type { DriverLocationUpdate } from '../types';

export function useDriverTracking(rideId: string | null, enabled: boolean) {
  const [pos, setPos] = useState<{ lat: number; lng: number; heading?: number } | null>(null);

  useEffect(() => {
    if (!rideId || !enabled) return;
    return onDriverLocation((payload: DriverLocationUpdate) => {
      if (payload.bookingId && payload.bookingId !== rideId) return;
      const lat = payload.coordinates?.lat ?? payload.location?.lat;
      const lng = payload.coordinates?.lng ?? payload.location?.lng;
      if (lat != null && lng != null) {
        setPos({ lat, lng, heading: payload.heading ?? payload.coordinates?.heading });
      }
    });
  }, [rideId, enabled]);

  return pos;
}
