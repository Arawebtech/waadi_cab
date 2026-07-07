'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useRideHistory } from '@/features/customer-ride/hooks';
import { RIDE_STATUS_LABELS, type Ride, type RideStatus } from '@/features/customer-ride/types';

const PAGE_SIZE = 20;

export default function RideHistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useRideHistory(undefined, page, PAGE_SIZE);

  const rides = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.pages ?? 1;
  const showPagination = totalPages > 1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-5">
        <h1 className="text-2xl font-bold">Your trips</h1>
      </header>

      <div className="p-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">Could not load trips</p>
            <button type="button" onClick={() => refetch()} className="mt-2 text-sm font-medium underline">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && rides.length === 0 && (
          <p className="py-12 text-center text-slate-500">No trips yet. Book your first ride!</p>
        )}

        <ul className="space-y-3">
          {rides.map((ride: Ride) => (
            <li key={ride.id}>
              <Link
                href={`/ride/history/view?id=${ride.id}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">{ride.drop.address}</p>
                  <p className="text-xs text-slate-500">
                    {RIDE_STATUS_LABELS[ride.status as RideStatus]} · {ride.fare ? `₹${ride.fare.total}` : ''}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>

        {showPagination && !error && (
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              <span>
                Page {pagination?.page ?? page} of {totalPages}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
