'use client';

import { useEffect, useState } from 'react';
import { customerBookingApi } from '../api/booking';

export type RoutePoint = { lat: number; lng: number };

export function useRoutePolyline(
  origin: { lat: number; lng: number } | null | undefined,
  destination: { lat: number; lng: number } | null | undefined
) {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [distanceKm, setDistanceKm] = useState<number | undefined>();
  const [durationMin, setDurationMin] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!origin?.lat || !destination?.lat) {
      setPoints([]);
      setDistanceKm(undefined);
      setDurationMin(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);
    customerBookingApi
      .getDirections(origin, destination)
      .then((data) => {
        if (cancelled) return;
        setPoints(data.points || []);
        setDistanceKm(data.distanceKm);
        setDurationMin(data.durationMin ?? undefined);
      })
      .catch(() => {
        if (!cancelled) {
          setPoints([
            { lat: origin.lat, lng: origin.lng },
            { lat: destination.lat, lng: destination.lng },
          ]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return { points, distanceKm, durationMin, loading };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function estimateEtaMin(distanceKm: number) {
  return Math.max(1, Math.round((distanceKm / 25) * 60));
}
