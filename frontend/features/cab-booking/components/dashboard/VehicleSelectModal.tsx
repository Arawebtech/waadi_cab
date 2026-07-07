'use client';

import { motion } from 'framer-motion';
import { Car, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Vehicle } from '@/types/vehicle';
import { VerificationStatusBadge } from '@/features/vehicles/components/StatusBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  open: boolean;
  vehicles: Vehicle[];
  onClose: () => void;
  onSelect: (vehicleId: string, setDefault?: boolean) => void;
  loading?: boolean;
}

export function VehicleSelectModal({ open, vehicles, onClose, onSelect, loading }: Props) {
  if (!open) return null;

  const router = useRouter();
  const onSelectAllVehicles = () => {
    router.push('/vehicles');
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Active Vehicle</h2>
            <p className="text-sm text-slate-500">Choose which vehicle you are driving today</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto">
       <div>
       {vehicles.map((v) => (
            <div
              key={v._id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white">{v.vehicleNumber}</p>
                  <p className="text-sm capitalize text-slate-500">{v.vehicleType} · {v.seatCapacity} seats</p>
                </div>
                <VerificationStatusBadge status={v.verificationStatus} />
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" disabled={loading} onClick={() => onSelect(v._id, false)}>
                  <Car className="mr-1 h-4 w-4" /> Select
                </Button>
                <Button size="sm" variant="outline" disabled={loading} onClick={() => onSelect(v._id, true)}>
                  Set Default
                </Button>
              </div>
            </div>
          ))}
          {vehicles.length === 0 && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm text-slate-500">No vehicles found</p>
            </div>
          )}
       </div>
       <div>

       <Link href="/vehicles" className="block rounded-xl border border-slate-200 p-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
Manage vehicles →  <Button size="sm" variant="outline" disabled={loading} onClick={() => onSelectAllVehicles()}>Show all vehicles</Button>
        </Link>
      </div>
    </div>
  </motion.div>
</div>
);
}
