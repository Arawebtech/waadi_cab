'use client';

import Link from 'next/link';
import { useMyVehicles } from '@/features/vehicles/hooks';
import { VehicleCard } from '@/features/vehicles/components/VehicleCard';
import { PageBackButton } from '@/features/vehicles/components/PageBackButton';
import { Button } from '@/components/ui/cab-button';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/states';
import { extractErrorMessage } from '@/lib/client';
import type { Vehicle } from '@/types/vehicle';
import { MobileLayout } from '@/components/mobile-layout';

export default function VehiclesPage() {
  const { data, isLoading, isError, error, refetch } = useMyVehicles();

  return (
    <MobileLayout title="Your vehicles">

    <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <PageBackButton href="/cab-booking" label="Back to driver app" />

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Your vehicles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage vehicles and verification documents</p>
        </div>
        <Link href="/vehicles/new">
          <Button className='bg-yellow-500 text-white hover:bg-yellow-600 hover:text-white whitespace-nowrap'>Add vehicle</Button>
        </Link>
      </div>

      {isLoading && <Spinner label="Loading vehicles…" />}

      {isError && (
        <ErrorState message={extractErrorMessage(error, 'Could not load vehicles')} onRetry={refetch} />
      )}

      {data && data.vehicles.length === 0 && (
        <EmptyState
          title="No vehicles yet"
          description="Add your first vehicle and upload its documents to start accepting rides."
          action={
            <Link href="/vehicles/new">
              <Button>Add vehicle</Button>
            </Link>
          }
        />
      )}

      {data && data.vehicles.length > 0 && (
        <div className="space-y-3">
          {data.vehicles.map((vehicle: Vehicle) => (
            <VehicleCard key={vehicle._id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
    </MobileLayout>
  );
}
