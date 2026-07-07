'use client';

import { useSearchParams } from 'next/navigation';
import { Loader2, Share2 } from 'lucide-react';
import { useRideDetail } from '@/features/customer-ride/hooks';
import { formatDriverName } from '@/features/customer-ride/utils/formatDriverName';
import { RIDE_STATUS_LABELS, type RideStatus } from '@/features/customer-ride/types';
import { customerBookingApi } from '@/features/customer-ride/api/booking';
import { Share } from '@capacitor/share';

export default function RideHistoryDetailPage() {
  const params = useSearchParams();
  const id = params.get('id');
  const { data: ride, isLoading } = useRideDetail(id);

  async function shareInvoice() {
    if (!id) return;
    const invoice = await customerBookingApi.getInvoice(id);
    await Share.share({ title: 'Ride Invoice', text: JSON.stringify(invoice, null, 2) }).catch(() => {});
  }

  if (!id) return <p className="p-6">Missing ride ID</p>;
  if (isLoading || !ride) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-2xl font-bold">Trip details</h1>
      <p className="mt-1 text-sm text-slate-500">{ride.rideNumber || ride.bookingNumber}</p>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-xs text-slate-400">Status</p>
          <p className="font-medium">{RIDE_STATUS_LABELS[ride.status as RideStatus]}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Pickup</p>
          <p>{ride.pickup.address}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Drop</p>
          <p>{ride.drop.address}</p>
        </div>
        {ride.driver && (
          <div>
            <p className="text-xs text-slate-400">Driver</p>
            <p>{formatDriverName(ride.driver)}</p>
          </div>
        )}
        {ride.fare && (
          <div>
            <p className="text-xs text-slate-400">Fare</p>
            <p className="text-2xl font-bold">₹{ride.fare.total}</p>
          </div>
        )}
      </div>

      {ride.status === 'TRIP_COMPLETED' && (
        <button
          type="button"
          onClick={shareInvoice}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3"
        >
          <Share2 className="h-4 w-4" />
          Download / share invoice
        </button>
      )}
    </div>
  );
}
