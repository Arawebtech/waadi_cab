'use client';

import { config } from '@/config/env';
import { MapPin } from 'lucide-react';
import { useMemo } from 'react';

interface Props {
  center?: { lat: number; lng: number } | null;
  className?: string;
}

export function RideMap({ center, className = '' }: Props) {
  const apiKey = config.googleMapsApiKey;
  const embedSrc = useMemo(() => {
    if (!center) return null;
    if (apiKey) {
      return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(apiKey)}&center=${center.lat},${center.lng}&zoom=15`;
    }
    return `https://maps.google.com/maps?q=${center.lat},${center.lng}&z=15&output=embed`;
  }, [apiKey, center]);

  if (!embedSrc) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-100 ${className}`}>
        <MapPin className="mb-2 h-10 w-10 text-black/40" />
        <p className="text-sm text-muted-foreground">Detecting your location…</p>
      </div>
    );
  }

  return (
    <iframe
      title="Ride map"
      src={embedSrc}
      className={`border-0 ${className}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
