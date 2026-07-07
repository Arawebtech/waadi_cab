import { VehicleForm } from '@/features/vehicles/components/VehicleForm';
import { PageBackButton } from '@/features/vehicles/components/PageBackButton';

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <PageBackButton href="/vehicles" label="Back to vehicles" />
      <h1 className="mb-1 text-lg font-semibold text-[#101828]">Add a vehicle</h1>
      <p className="mb-6 text-sm text-[#667085]">
        You can add documents now or upload them later from the vehicle page.
      </p>
      <VehicleForm />
    </div>
  );
}
