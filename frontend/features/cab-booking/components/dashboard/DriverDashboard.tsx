'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Award,
  Car,
  IndianRupee,
  Star,
  TrendingUp,
  TruckIcon,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DriverStatusControls } from './DriverStatusControls';
import { DriverMapEmbed } from '../map/DriverMapEmbed';
import { StatusBadge } from '../Stepper';
import type { CabDriverProfile, DriverDashboard as DashboardData, VerificationSummary } from '@/types/cab-booking';
import type { Subscription } from '@/types/subscription';

interface Props {
  profile: CabDriverProfile;
  dashboard?: DashboardData;
  dashboardLoading?: boolean;
  subscription?: Subscription | null;
  verification?: VerificationSummary;
  isOnline: boolean;
  isAvailable: boolean;
  onlineLoading?: boolean;
  availabilityLoading?: boolean;
  canGoOnline: boolean;
  subscriptionExpired?: boolean;
  blockReasons?: string[];
  availabilityStatus?: string;
  coords?: { lat: number; lng: number } | null;
  onToggleOnline: () => void;
  onToggleAvailable: () => void;
  onChangeVehicle?: () => void;
  showVehiclePicker?: boolean;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Star;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className={`mb-2 inline-flex rounded-lg p-2 ${accent || 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
        <Icon className="h-4 w-4" />
      </div>
      {/* <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p> */}
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
  {typeof value === 'number' ? Number(value).toFixed(2) : value}
</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}

export function DriverDashboard({
  profile,
  dashboard,
  dashboardLoading,
  subscription,
  verification,
  isOnline,
  isAvailable,
  onlineLoading,
  availabilityLoading,
  canGoOnline,
  subscriptionExpired,
  blockReasons = [],
  availabilityStatus,
  coords,
  onToggleOnline,
  onToggleAvailable,
  onChangeVehicle,
  showVehiclePicker,
}: Props) {
  const user = profile.user;
  const vehicle = profile.activeVehicle;
  const subExpiry = subscription?.expiryDate ? new Date(subscription.expiryDate) : null;
  const daysLeft = subExpiry
    ? Math.max(0, Math.ceil((subExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-4">
      {/* <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-300">Welcome back</p>
            <h1 className="text-xl font-bold">{user.firstName} {user.lastName}</h1>
            <p className="mt-0.5 text-sm text-slate-400">{user.phoneNumber}</p>
          </div>
          <StatusBadge status={user.cabBooking?.profileVerificationStatus || 'pending'} />
        </div>
        {vehicle && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 p-3 text-sm">
            <Car className="h-4 w-4" />
            <span>{vehicle.vehicleNumber}</span>
            <span className="text-slate-400 capitalize">· {vehicle.vehicleType}</span>
          </div>
        )}
      </motion.div> */}

      {/* {subscription ? (
        <div className={`rounded-2xl border p-4 ${subscriptionExpired ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${subscriptionExpired ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {subscriptionExpired ? 'Subscription Expired' : 'Active Subscription'}
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">{subscription.planName || 'Plan'}</p>
            </div>
            <StatusBadge status={subscription.status} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300">
            <div>Expires: {subExpiry?.toLocaleDateString() ?? '—'}</div>
            <div>{daysLeft != null ? `${daysLeft} days left` : '—'}</div>
          </div>
          {subscriptionExpired && (
            <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">Renew to go online</p>
          )}
        </div>
      ) : null} */}

      {blockReasons.length > 0 && !canGoOnline && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 py-3 px-1 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">Complete to go online:</p>
          <ul className="mt-1 list-disc pl-4">
            {blockReasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      <DriverStatusControls
        isOnline={isOnline}
        isAvailable={isAvailable}
        onlineLoading={onlineLoading}
        availabilityLoading={availabilityLoading}
        canGoOnline={canGoOnline}
        subscriptionExpired={subscriptionExpired}
        blockReasons={blockReasons}
        activeVehicle={vehicle}
        availabilityStatus={availabilityStatus}
        onToggleOnline={onToggleOnline}
        onToggleAvailable={onToggleAvailable}
        onChangeVehicle={onChangeVehicle}
        showVehiclePicker={showVehiclePicker}
      />

  

      {dashboardLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : dashboard ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard 
            icon={IndianRupee}
             label="Today's Earnings" 
             value={`₹${Number(dashboard.earnings.today || "-").toFixed(2)}`}
              accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" />
            <StatCard icon={Wallet} label="Wallet Balance" value={`₹${Number(dashboard.wallet.balance || "-").toFixed(2)}`} accent="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" />
            {/* <StatCard icon={TrendingUp} label="This Week" value={`₹${Number(dashboard.earnings.week || "-").toFixed(2)}`} accent="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" /> */}
            {/* <StatCard icon={Star} label="Rating" value={dashboard.stats.rating} accent="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" /> */}
            <div 
            // className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
            // className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
            >
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 p-3 mb-4 dark:border-slate-700">
                <Award className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-700 dark:text-slate-200">Accepted: {dashboard.stats.acceptanceRate}%</span>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-slate-700 dark:text-slate-200">Cancel: {dashboard.stats.cancellationRate}%</span>
            </div>
            </div>


            <div 
            // className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
            // className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
            >
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 p-3 mb-4 dark:border-slate-700">
                <TruckIcon className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-700 dark:text-slate-200">Today Trips: {dashboard.stats.todayTrips}</span>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <TruckIcon  className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-700 dark:text-slate-200">TotalTrips: {dashboard.stats.totalTrips}</span>
            </div>
            </div>
          </div>

          {/* <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{dashboard.stats.todayTrips}</p>
              <p className="text-[10px] uppercase text-slate-500">Today</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{dashboard.stats.totalTrips}</p>
              <p className="text-[10px] uppercase text-slate-500">Trips</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{dashboard.stats.acceptanceRate}%</p>
              <p className="text-[10px] uppercase text-slate-500">Accept</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">

                        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-slate-700 dark:text-slate-200">Rating: {dashboard.stats.rating ?? '—'}</span>
            </div>
            </div>
          </div> */}

          {/* <div className="flex gap-3 text-sm">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <Award className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-700 dark:text-slate-200">Month: ₹{dashboard.earnings.month}</span>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-slate-700 dark:text-slate-200">Cancel: {dashboard.stats.cancellationRate}%</span>
            </div>
          </div> */}
        </>
      ) : null}

           {subscription ? (
        <div className={`rounded-2xl border p-4 ${subscriptionExpired ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${subscriptionExpired ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {subscriptionExpired ? 'Subscription Expired' : 'Active Subscription'}
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">{subscription.planName || 'Plan'}</p>
            </div>
            <StatusBadge status={subscription.status} />
          </div>
          {/* <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-300"> */}
          <div className="flex items-start justify-between gap-2 text-sm text-slate-700 dark:text-slate-300">
            <div>Expires: {subExpiry?.toLocaleDateString() ?? '—'}</div>
            <div>{daysLeft != null ? `${daysLeft} days left` : '—'}</div>
          </div>
          {subscriptionExpired && (
            <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">Renew to go online</p>
          )}
        </div>
      ) : null}

<DriverMapEmbed
        className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm dark:border-slate-700"
        style={{ height: 180 }}
        driver={coords ?? undefined}
        fitRoute={false}
      />

      {/* {verification && (
        <Link href="/vehicles" className="block rounded-xl border border-slate-200 p-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          {profile.vehicles.length} vehicle(s) · Upload documents from Profile → Vehicles
        </Link>
      )} */}
    </div>
  );
}
