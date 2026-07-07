// 'use client';

// import { motion } from 'framer-motion';
// import { Car, Loader2, Power, Radio } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import type { Vehicle } from '@/types/vehicle';

// interface Props {
//   isOnline: boolean;
//   isAvailable: boolean;
//   onlineLoading?: boolean;
//   availabilityLoading?: boolean;
//   canGoOnline: boolean;
//   subscriptionExpired?: boolean;
//   blockReasons?: string[];
//   activeVehicle?: Vehicle | null;
//   availabilityStatus?: string;
//   onToggleOnline: () => void;
//   onToggleAvailable: () => void;
//   onChangeVehicle?: () => void;
//   showVehiclePicker?: boolean;
// }

// function ToggleRow({
//   label,
//   description,
//   active,
//   disabled,
//   loading,
//   icon: Icon,
//   accent,
//   onToggle,
// }: {
//   label: string;
//   description: string;
//   active: boolean;
//   disabled?: boolean;
//   loading?: boolean;
//   icon: typeof Power;
//   accent: string;
//   onToggle: () => void;
// }) {
//   return (
//     <motion.button
//       type="button"
//       disabled={disabled || loading}
//       onClick={onToggle}
//       whileTap={{ scale: 0.98 }}
//       className={cn(
//         'w-full rounded-2xl border-2 p-4 text-left transition-all',
//         active ? accent : 'border-slate-200 bg-red-500 dark:border-slate-700 dark:bg-slate-900',
//         (disabled || loading) && 'cursor-not-allowed opacity-60'
//       )}
//     >
//       <div className="flex items-center gap-3">
//         <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800')}>
//           {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
//         </div>
//         <div className="flex-1">
//           <p className={cn('font-bold', active ? 'text-white' : 'text-slate-900 dark:text-white')}>{label}</p>
//           <p className={cn('text-sm', active ? 'text-white/80' : 'text-slate-500')}>{description}</p>
//         </div>
//         <div className={cn('h-7 w-12 rounded-full p-0.5', active ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600')}>
//           <div className={cn('h-6 w-6 rounded-full bg-white shadow transition-transform', active && 'translate-x-5')} />
//         </div>
//       </div>
//     </motion.button>
//   );
// }

// export function DriverStatusControls({
//   isOnline,
//   isAvailable,
//   onlineLoading,
//   availabilityLoading,
//   canGoOnline,
//   subscriptionExpired,
//   blockReasons = [],
//   activeVehicle,
//   availabilityStatus = 'offline',
//   onToggleOnline,
//   onToggleAvailable,
//   onChangeVehicle,
//   showVehiclePicker,
// }: Props) {
//   const statusLabel = {
//     offline: 'Offline',
//     available: 'Available',
//     busy: 'Busy',
//     on_trip: 'On Trip',
//   }[availabilityStatus] || availabilityStatus;

//   return (
//     <div className="space-y-3">
//       <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
//         <span className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-slate-400')} />
//         <span className="font-medium text-slate-900 dark:text-white">{isOnline ? 'Online' : 'Offline'}</span>
//         <span className="text-slate-400">·</span>
//         <span className="text-slate-600 dark:text-slate-300">{statusLabel}</span>
//         {activeVehicle && (
//           <>
//             <span className="text-slate-400">·</span>
//             <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-200">
//               <Car className="h-3.5 w-3.5" /> {activeVehicle.vehicleNumber}
//             </span>
//           </>
//         )}
//         {showVehiclePicker && onChangeVehicle && (
//           <button type="button" onClick={onChangeVehicle} className="ml-auto text-xs font-medium text-blue-600 hover:underline">
//             Change vehicle
//           </button>
//         )}
//       </div>

//       {blockReasons.length > 0 && !canGoOnline && (
//         <p className="text-xs text-amber-700 dark:text-amber-300">{blockReasons[0]}</p>
//       )}

//       <ToggleRow
//         label="Go Online"
//         description={isOnline ? 'Visible on map · receiving updates' : 'Tap to start your shift'}
//         active={isOnline}
//         disabled={!canGoOnline || subscriptionExpired}
//         loading={onlineLoading}
//         icon={Power}
//         accent="border-emerald-500 bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
//         onToggle={onToggleOnline}
//       />

//       <ToggleRow
//         label="Available"
//         description={isAvailable ? 'Accepting ride requests' : 'Online but not accepting rides'}
//         active={isAvailable}
//         disabled={!isOnline}
//         loading={availabilityLoading}
//         icon={Radio}
//         accent="border-blue-500 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
//         onToggle={onToggleAvailable}
//       />
//     </div>
//   );
// }


'use client';

import { motion } from 'framer-motion';
import { Car, Loader2, Power, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types/vehicle';

interface Props {
  isOnline: boolean;
  isAvailable: boolean;
  onlineLoading?: boolean;
  availabilityLoading?: boolean;
  canGoOnline: boolean;
  subscriptionExpired?: boolean;
  blockReasons?: string[];
  activeVehicle?: Vehicle | null;
  availabilityStatus?: string;
  onToggleOnline: () => void;
  onToggleAvailable: () => void;
  onChangeVehicle?: () => void;
  showVehiclePicker?: boolean;
}

function ToggleRow({
  label,
  description,
  active,
  disabled,
  loading,
  icon: Icon,
  accent,
  onToggle,
}: {
  label: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon: typeof Power;
  accent: string;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled || loading}
      onClick={onToggle}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full rounded-2xl border-2 p-4 text-left transition-all',
        active
          ? accent
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
        (disabled || loading) && 'cursor-not-allowed opacity-60'
      )}
    >
      <div className="flex items-center gap-3">
        {/* ICON */}
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full transition-all',
            active
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
          )}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        {/* TEXT */}
        <div className="flex-1">
          <p
            className={cn(
              'font-bold',
              active ? 'text-white' : 'text-slate-900 dark:text-white'
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              'text-sm',
              active ? 'text-white/80' : 'text-slate-500'
            )}
          >
            {description}
          </p>
        </div>

        {/* TOGGLE SWITCH */}
        <div
          className={cn(
            'h-7 w-12 rounded-full p-0.5 transition-colors',
            active
              ? 'bg-white/30'
              : 'bg-slate-300 dark:bg-slate-600'
          )}
        >
          <div
            className={cn(
              'h-6 w-6 rounded-full bg-white shadow transition-transform duration-200',
              active && 'translate-x-5'
            )}
          />
        </div>
      </div>
    </motion.button>
  );
}

export function DriverStatusControls({
  isOnline,
  isAvailable,
  onlineLoading,
  availabilityLoading,
  canGoOnline,
  subscriptionExpired,
  blockReasons = [],
  activeVehicle,
  availabilityStatus = 'offline',
  onToggleOnline,
  onToggleAvailable,
  onChangeVehicle,
  showVehiclePicker,
}: Props) {
  const statusLabel =
    {
      offline: 'Offline',
      available: 'Available',
      busy: 'Busy',
      on_trip: 'On Trip',
    }[availabilityStatus] || availabilityStatus;

  return (
    <div className="space-y-3">
      {/* STATUS BAR */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            isOnline ? 'bg-yellow-500' : 'bg-slate-400'
          )}
        />
        <span className="font-medium text-slate-900 dark:text-white">
          {isOnline ? 'Online' : 'Offline'}
        </span>

        <span className="text-slate-400">·</span>

        <span className="text-slate-600 dark:text-slate-300">
          {statusLabel}
        </span>

        {activeVehicle && (
          <>
            <span className="text-slate-400">·</span>
            <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-200">
              <Car className="h-3.5 w-3.5" />
              {activeVehicle.vehicleNumber}
            </span>
          </>
        )}

        {showVehiclePicker && onChangeVehicle && (
          <button
            type="button"
            onClick={onChangeVehicle}
            className="ml-auto text-xs font-medium text-blue-600 hover:underline"
          >
            Change vehicle
          </button>
        )}
      </div>

      {/* BLOCK REASON */}
      {blockReasons.length > 0 && !canGoOnline && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {blockReasons[0]}
        </p>
      )}

      {/* GO ONLINE */}
      <ToggleRow
        label={isOnline ? 'Go Offline' : 'Go Online'}
        description={
          isOnline
            ? 'Visible on map · receiving requests'
            : 'Tap to start your shift'
        }
        active={isOnline}
        disabled={!canGoOnline || subscriptionExpired}
        loading={onlineLoading}
        icon={Power}
        accent="border-emerald-500 bg-black text-white from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
        onToggle={onToggleOnline}
      />

      {/* AVAILABLE */}
      <ToggleRow
        label="Available"
        description={
          isAvailable
            ? 'Accepting ride requests'
            : 'Online but not accepting rides'
        }
        active={isAvailable}
        disabled={!isOnline}
        loading={availabilityLoading}
        icon={Radio}
        accent="border-blue-500 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
        onToggle={onToggleAvailable}
      />
    </div>
  );
}