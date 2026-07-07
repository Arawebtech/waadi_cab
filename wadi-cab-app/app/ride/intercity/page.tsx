'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useIntercityPackages } from '@/features/customer-ride/hooks';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { customerBookingApi } from '@/features/customer-ride/api/booking';
import type { IntercityPackage, Location, SavedPlace } from '@/features/customer-ride/types';

export default function IntercityPage() {
  const router = useRouter();
  const { setPickup, setDrop } = useCustomerRide();
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const { data, isLoading } = useIntercityPackages(fromCity || undefined, toCity || undefined);
  const [booking, setBooking] = useState<string | null>(null);

  async function bookPackage(pkg: IntercityPackage) {
    setBooking(pkg._id);
    const pickup: Location = {
      address: `${pkg.fromCity} pickup`,
      lat: 22.7196,
      lng: 75.8577,
    };
    const drop: Location = {
      address: `${pkg.toCity} drop`,
      lat: 23.2599,
      lng: 77.4126,
    };
    setPickup(pickup);
    setDrop(drop);
    try {
      const ride = await customerBookingApi.createBooking({
        pickup,
        drop,
        tripType: 'intercity',
        intercityPackageId: pkg._id,
        vehicleTypeSlug: 'sedan',
        paymentMethod: 'cash',
      });
      router.push(`/ride/booking/matching?id=${ride.id}`);
    } finally {
      setBooking(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-5">
        <h1 className="text-2xl font-bold">Outstation</h1>
        <p className="text-sm text-slate-500">One-way, round-trip & rental packages</p>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        <input
          value={fromCity}
          onChange={(e) => setFromCity(e.target.value)}
          placeholder="From city"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          value={toCity}
          onChange={(e) => setToCity(e.target.value)}
          placeholder="To city"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-3 px-4 pb-8">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}
        {data?.map((pkg: IntercityPackage) => (
          <div key={pkg._id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{pkg.name}</p>
                <p className="text-sm text-slate-500">
                  {pkg.fromCity} → {pkg.toCity}
                </p>
                <p className="mt-1 text-xs capitalize text-slate-400">{pkg.tripType.replace(/_/g, ' ')}</p>
              </div>
              <p className="text-lg font-bold">₹{pkg.basePrice}</p>
            </div>
            {pkg.description && <p className="mt-2 text-sm text-slate-500">{pkg.description}</p>}
            <button
              type="button"
              disabled={booking === pkg._id}
              onClick={() => bookPackage(pkg)}
              className="mt-4 w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {booking === pkg._id ? 'Booking…' : 'Book package'}
            </button>
          </div>
        ))}
        {!isLoading && data?.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No packages found for this route.</p>
        )}
      </div>
    </div>
  );
}
