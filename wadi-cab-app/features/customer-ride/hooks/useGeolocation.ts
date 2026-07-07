'use client';

import { useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export interface GeoPoint {
  lat: number;
  lng: number;
  address?: string;
}

export function useCurrentLocation() {
  const [location, setLocation] = useState<GeoPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15_000,
            });
          });
          if (!cancelled) {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
          return;
        }

        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        if (!cancelled) {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Location unavailable');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  return { location, error, loading, retry: () => setLoading(true) };
}
