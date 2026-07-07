'use client';

import { format } from 'date-fns';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '../Stepper';
import type { CabRideRequest } from '@/types/cab-booking';

interface Props {
  rides?: CabRideRequest[];
  loading?: boolean;
  filter?: string;
  onFilterChange?: (f: string) => void;
}

export function TripHistoryPanel({ rides = [], loading, filter = '', onFilterChange }: Props) {
  const filters = [
    { id: '', label: 'All' },
    { id: 'TRIP_COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilterChange?.(f.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : rides.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">No trips found</p>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <div key={ride._id} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">#{ride.rideNumber}</span>
                <StatusBadge status={ride.status.toLowerCase()} />
              </div>
              <div className="flex gap-2 text-sm">
                <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="truncate">{ride.pickup.address}</span>
              </div>
              <div className="flex gap-2 text-sm">
                <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                <span className="truncate">{ride.drop.address}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="font-bold">₹{ride.fare.total}</span>
                <span className="text-muted-foreground">{format(new Date((ride as any).createdAt || Date.now()), 'dd MMM yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
