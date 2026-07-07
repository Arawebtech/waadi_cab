// 'use client';

// import { Car } from 'lucide-react';
// import { Skeleton } from '@/components/ui/skeleton';
// import { useMyVehicles } from '@/features/vehicles/hooks';
// import type { Vehicle } from '@/types/vehicle';
// import { ProfileSectionCard } from './ProfileSectionCard';
// import { StatusPill } from './StatusPill';
// import { formatVehicleType, pickActiveVehicle } from '../utils/vehicle';

// interface ActiveVehicleSectionProps {
//   fallbackVehicle?: Vehicle | null;
// }

// export function ActiveVehicleSection({ fallbackVehicle }: ActiveVehicleSectionProps) {
//   const { data, isLoading } = useMyVehicles();
//   const activeVehicle = pickActiveVehicle(data?.vehicles ?? []) ?? fallbackVehicle ?? null;

//   if (isLoading) {
//     return (
//       <ProfileSectionCard title="Active Vehicle">
//         <div className="space-y-3">
//           <Skeleton className="h-5 w-28" />
//           <Skeleton className="h-4 w-full" />
//           <Skeleton className="h-4 w-3/4" />
//         </div>
//       </ProfileSectionCard>
//     );
//   }

//   return (
//     <ProfileSectionCard
//       title="Active Vehicle"
//       action={{ label: 'Manage Vehicles', href: '/vehicles' }}
//     >
//       {!activeVehicle ? (
//         <p className="py-2 text-sm text-slate-500">No active vehicle found</p>
//       ) : (
//         <div className="flex items-start gap-3">
//           <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
//             <Car className="h-5 w-5" />
//           </div>
//           <div className="min-w-0 flex-1">
//             <div className="mb-2 flex flex-wrap items-center gap-2">
//               <StatusPill label="Active" tone="active" />
//             </div>
//             <p className="font-semibold text-slate-900">
//               {formatVehicleType(activeVehicle.vehicleType)} · {activeVehicle.seatCapacity} seats
//             </p>
//             <p className="mt-1 font-mono text-sm tracking-wide text-slate-600">
//               {activeVehicle.vehicleNumber}
//             </p>
//             <p className="mt-1 text-sm capitalize text-slate-500">{activeVehicle.vehicleType}</p>
//           </div>
//         </div>
//       )}
//     </ProfileSectionCard>
//   );
// }


'use client';

import { Car } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import Link from 'next/link';

import { useMyVehicles } from '@/features/vehicles/hooks';
import type { Vehicle } from '@/types/vehicle';

import { pickActiveVehicle, formatVehicleType } from '../utils/vehicle';
import { StatusPill } from './StatusPill';

interface ActiveVehicleSectionProps {
  fallbackVehicle?: Vehicle | null;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-sm text-gray-600">
        {label}
      </span>

      <span className="text-sm font-medium text-slate-900 text-right">
        {value}
      </span>
    </div>
  );
}


export function ActiveVehicleSection({
  fallbackVehicle,
}: ActiveVehicleSectionProps) {

  const { data, isLoading } = useMyVehicles();

  const activeVehicle =
    pickActiveVehicle(data?.vehicles ?? []) ??
    fallbackVehicle ??
    null;


  if (isLoading) {
    return (
      <Card className="mobile-card rounded-2xl border-slate-200/80 shadow-sm">

        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Car className="h-5 w-5 mr-2" />
            Active Vehicle
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>

      </Card>
    );
  }


  return (
    <Card className="mobile-card overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">

      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Car className="h-5 w-5 mr-2" />
          Active Vehicle
        </CardTitle>
      </CardHeader>


      <CardContent className="space-y-4">


        {!activeVehicle ? (

          <p className="py-2 text-sm text-gray-600">
            No active vehicle found
          </p>

        ) : (

          <>

            <div className="flex items-center justify-between">

              <div>
                <p className="font-semibold text-slate-900">
                  {formatVehicleType(activeVehicle.vehicleType)}
                </p>

                <p className="font-mono text-sm text-gray-600">
                  {activeVehicle.vehicleNumber}
                </p>
              </div>


              <StatusPill
                label="Active"
                tone="active"
              />

            </div>



            <div className="divide-y divide-slate-100 border-t pt-2">


              <DetailRow
                label="Seat Capacity"
                value={activeVehicle.seatCapacity}
              />


              <DetailRow
                label="Service Type"
                value={
                  activeVehicle.serviceTypes?.join(', ') || 'Local'
                }
              />


              <DetailRow
                label="Vehicle Type"
                value={
                  activeVehicle.vehicleType
                }
              />


              <DetailRow
                label="Verification"
                value={
                  <StatusPill
                    label={activeVehicle.verificationStatus}
                    tone={
                      activeVehicle.verificationStatus === 'approved'
                        ? 'active'
                        : 'warning'
                    }
                  />
                }
              />


              <DetailRow
                label="Default Vehicle"
                value={
                  activeVehicle.isDefault
                    ? 'Yes'
                    : 'No'
                }
              />


              <DetailRow
                label="Vehicle Status"
                value={
                  activeVehicle.isActive
                    ? 'Active'
                    : 'Inactive'
                }
              />


              <DetailRow
                label="RC Document"
                value={
                  activeVehicle.documents?.rc?.status || 'Not uploaded'
                }
              />


              <DetailRow
                label="Insurance"
                value={
                  activeVehicle.documents?.insurance?.status || 'Not uploaded'
                }
              />


            </div>


            <Button
              asChild
              variant="outline"
              className="w-full h-10 normal-case"
            >
              <Link href="/vehicles">
                Manage Vehicles
              </Link>
            </Button>


          </>

        )}

      </CardContent>

    </Card>
  );
}