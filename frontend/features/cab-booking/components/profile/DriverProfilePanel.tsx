'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Car, ChevronRight, Plus, Shield, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VehicleCard } from '@/features/vehicles/components/VehicleCard';
import { vehicleViewPath } from '@/features/vehicles/utils/routes';
import { useMyVehicles } from '@/features/vehicles/hooks';
import { StatusBadge } from '../Stepper';
import type { CabDriverProfile, VerificationSummary } from '@/types/cab-booking';
import type { Subscription } from '@/types/subscription';

interface Props {
  profile: CabDriverProfile;
  verification?: VerificationSummary;
  subscription?: Subscription | null;
  walletBalance?: number;
  isOnline?: boolean;
  loading?: boolean;
}

export function DriverProfilePanel({
  profile,
  verification,
  subscription,
  walletBalance = 0,
  isOnline,
  loading,
}: Props) {
  const vehiclesQ = useMyVehicles();
  const user = profile.user;
  const vehicles = vehiclesQ.data?.vehicles ?? profile.vehicles;

  const subExpiry = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
  const daysLeft = subExpiry
    ? Math.max(0, Math.ceil((subExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-xl dark:border-slate-700"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-300">Driver Profile</p>
            <h1 className="text-xl font-bold">{user.firstName} {user.lastName}</h1>
            <p className="text-sm text-slate-400">{user.phoneNumber}</p>
            {user.email && <p className="text-sm text-slate-400">{user.email}</p>}
          </div>
          <StatusBadge status={user.cabBooking?.profileVerificationStatus || 'pending'} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoChip icon={Shield} label="Verification" value={verification?.checks.profile.status || 'pending'} />
          <InfoChip icon={Wallet} label="Wallet" value={`₹${walletBalance}`} />
          <InfoChip
            icon={Car}
            label="Online"
            value={isOnline ? 'Online' : 'Offline'}
          />
          <InfoChip
            label="Vehicles"
            value={String(vehicles.length)}
          />
        </div>
      </motion.div>

      {subscription ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Active Plan</p>
              <p className="font-semibold text-slate-900 dark:text-white">{subscription.planName || 'Subscription'}</p>
            </div>
            <StatusBadge status={subscription.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-500">Expires</span><p className="font-medium">{subExpiry?.toLocaleDateString() ?? '—'}</p></div>
            <div><span className="text-slate-500">Days left</span><p className="font-medium">{daysLeft ?? '—'}</p></div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          No active subscription — purchase a plan to go online.
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">My Vehicles</h2>
          <Link href="/vehicles/new">
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </Link>
        </div>

        {loading || vehiclesQ.isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : vehicles.length === 0 ? (
          <Link
            href="/vehicles/new"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-10 text-slate-500 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700"
          >
            <Plus className="h-5 w-5" />
            Add New Vehicle
          </Link>
        ) : (
          <div className="space-y-3">
            {vehicles.map((v) => (
              <Link key={v._id} href={vehicleViewPath(v._id)} className="block group">
                <div className="relative">
                  <VehicleCard vehicle={v} />
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    {v.isDefault && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active</span>
                    )}
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
                  </div>
                </div>
              </Link>
            ))}
            <Link href="/vehicles/new">
              <Button variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" /> Add New Vehicle
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Car;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 text-sm font-semibold capitalize">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {value.replace(/_/g, ' ')}
      </p>
    </div>
  );
}
