import { config } from '@/config/env';
import { useEffect, useState } from 'react';

export type RoutePoint = { lat: number; lng: number };

async function fetchDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const q = new URLSearchParams({
    originLat: String(origin.lat),
    originLng: String(origin.lng),
    destLat: String(destination.lat),
    destLng: String(destination.lng),
  });
  const res = await fetch(`${config.apiUrl}/cab/routes/directions?${q}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data as { points: RoutePoint[]; distanceKm: number; durationMin: number | null };
}

export function useRoutePolyline(
  origin: { lat: number; lng: number } | null | undefined,
  destination: { lat: number; lng: number } | null | undefined
) {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [meta, setMeta] = useState<{ distanceKm?: number; durationMin?: number }>({});

  useEffect(() => {
    if (!origin?.lat || !destination?.lat) {
      setPoints([]);
      setMeta({});
      return;
    }

    let cancelled = false;
    fetchDirections(origin, destination)
      .then((data) => {
        if (cancelled) return;
        setPoints(data.points || []);
        setMeta({ distanceKm: data.distanceKm, durationMin: data.durationMin ?? undefined });
      })
      .catch(() => {
        if (!cancelled) {
          setPoints([
            { lat: origin.lat, lng: origin.lng },
            { lat: destination.lat, lng: destination.lng },
          ]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return { points, ...meta };
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
