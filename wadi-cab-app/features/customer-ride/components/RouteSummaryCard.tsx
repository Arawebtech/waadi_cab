'use client';

import { Clock, Navigation } from 'lucide-react';

interface Props {
  pickup?: string;
  drop?: string;
  distanceKm?: number;
  durationMin?: number;
  fareTotal?: number;
  vehicleName?: string;
}

export function RouteSummaryCard({ pickup, drop, distanceKm, durationMin, fareTotal, vehicleName }: Props) {
  return (
    <div className="rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="space-y-2 text-sm">
        <p className="truncate font-medium text-slate-900">{pickup || 'Pickup'}</p>
        <div className="ml-1 h-4 border-l-2 border-dashed border-slate-300" />
        <p className="truncate font-medium text-slate-900">{drop || 'Drop'}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
        {distanceKm != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
            <Navigation className="h-3.5 w-3.5" />
            {distanceKm.toFixed(1)} km
          </span>
        )}
        {durationMin != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
            <Clock className="h-3.5 w-3.5" />
            {durationMin} min
          </span>
        )}
        {vehicleName && <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{vehicleName}</span>}
        {fareTotal != null && <span className="ml-auto text-lg font-bold text-slate-900">₹{fareTotal}</span>}
      </div>
    </div>
  );
}
