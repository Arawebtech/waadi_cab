import Link from 'next/link';
import type { Vehicle } from '@/types/vehicle';
import { vehicleViewPath } from '../utils/routes';
import { VerificationStatusBadge } from './StatusBadge';

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const docsUploaded = Object.values(vehicle.documents).filter((d) => d.url).length;
  const docsTotal = Object.keys(vehicle.documents).length;

  return (
    <Link
      href={vehicleViewPath(vehicle._id)}
      className="block rounded-xl border border-[#E4E7EC] bg-white p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-base font-semibold tracking-wide text-[#101828]">
            {vehicle.vehicleNumber}
          </p>
          <p className="mt-0.5 text-sm capitalize text-[#667085]">
            {vehicle.vehicleType} · {vehicle.seatCapacity} seats
          </p>
        </div>
        <VerificationStatusBadge status={vehicle.verificationStatus} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[#667085]">
        <span>
          {docsUploaded}/{docsTotal} documents uploaded
        </span>
        {vehicle.isDefault && (
          <span className="rounded-full bg-[#EFF4FF] px-2 py-0.5 font-medium text-[#0B5FFF]">
            Default vehicle
          </span>
        )}
      </div>
    </Link>
  );
}
