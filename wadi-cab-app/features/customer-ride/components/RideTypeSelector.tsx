'use client';

import type { FareEstimate } from '../types';
import { cn } from '@/lib/utils';

interface Props {
  estimates: FareEstimate[];
  selectedSlug?: string;
  onSelect: (slug: string) => void;
  loading?: boolean;
}

export function RideTypeSelector({ estimates, selectedSlug, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {estimates.map((item) => {
        const slug = item.vehicleType.slug;
        const selected = selectedSlug === slug;
        return (
          <button
            key={slug}
            type="button"
            onClick={() => onSelect(slug)}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition-all',
              selected
                ? 'border-black bg-black text-white shadow-lg'
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.vehicleType.icon || '🚗'}</span>
              <div className="text-left">
                <p className="font-semibold">{item.vehicleType.name}</p>
                <p className={cn('text-xs', selected ? 'text-white/70' : 'text-slate-500')}>
                  {item.vehicleType.capacity} seats · {item.etaMin} min
                  {item.nearbyDrivers != null && item.nearbyDrivers > 0 ? ` · ${item.nearbyDrivers} nearby` : ''}
                </p>
              </div>
            </div>
            <p className="text-lg font-bold">₹{item.fare.total}</p>
          </button>
        );
      })}
    </div>
  );
}
