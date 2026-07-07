'use client';

import { useState } from 'react';
import { LogOut, MapPin, Wallet } from 'lucide-react';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { useSavedPlaces } from '@/features/customer-ride/hooks';
import { customerBookingApi } from '@/features/customer-ride/api/booking';
import { useQuery } from '@tanstack/react-query';
import type { SavedPlace } from '@/features/customer-ride/types';
import { useConfirm } from '@/components/confirm';

export default function RideProfilePage() {
  const { user, logout, refreshUser } = useCustomerRide();
  const { data: places, refetch } = useSavedPlaces();
  const { data: wallet } = useQuery({
    queryKey: ['customer', 'wallet'],
    queryFn: () => customerBookingApi.wallet(),
  });
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const { confirmAction } = useConfirm();

  async function saveProfile() {
    setSaving(true);
    await customerBookingApi.updateProfile({ name: user?.fullName, phone });
    await refreshUser();
    setSaving(false);
  }

  async function saveHome() {
    const place = places?.find((p: SavedPlace) => p.label === 'home');
    if (place) return;
    await customerBookingApi.savePlace({
      label: 'home',
      name: 'Home',
      address: 'Set from map',
      lat: 22.7196,
      lng: 75.8577,
    });
    refetch();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-5">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </header>

      <div className="space-y-4 p-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="text-xs text-slate-400">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="10-digit mobile"
          />
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="mt-3 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <Wallet className="h-8 w-8 text-emerald-600" />
          <div>
            <p className="text-xs text-slate-400">Wallet balance</p>
            <p className="text-xl font-bold">₹{wallet?.balance?.toFixed(2) ?? '0.00'}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 font-medium">Saved places</p>
          {places?.map((p: SavedPlace) => (
            <div key={p._id || p.label} className="flex items-center gap-2 py-2 text-sm">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="capitalize">{p.label}</span>
              <span className="text-slate-500">— {p.address}</span>
            </div>
          ))}
          {!places?.length && (
            <button type="button" onClick={saveHome} className="text-sm text-black underline">
              Add home (demo)
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            confirmAction({
              title: 'Log out?',
              description: 'You will need to sign in again to book rides.',
              confirmLabel: 'Log out',
              cancelLabel: 'Stay signed in',
              variant: 'danger',
              action: logout,
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 py-3 text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  );
}
