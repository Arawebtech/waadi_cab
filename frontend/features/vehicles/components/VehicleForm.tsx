'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/cab-button';
import { useCreateVehicle } from '../hooks';
import { vehicleViewPath } from '../utils/routes';
import type { CreateVehiclePayload, DocumentType, SeatCapacity, VehicleType } from '@/types/vehicle';
import { extractErrorMessage } from '@/lib/api/client';

const SEAT_OPTIONS: SeatCapacity[] = ['2(1+1)', '5(4+1)', '6(5+1)', '7(6+1)', '8(7+1)', '9(8+1)'];
const VEHICLE_TYPES: VehicleType[] = ['sedan', 'suv', 'hatchback', 'tempo', 'bus'];
const DOC_TYPES: { key: DocumentType; label: string; required?: boolean }[] = [
  { key: 'rc', label: 'Registration certificate (RC)' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'puc', label: 'Pollution certificate (PUC)' },
  { key: 'license', label: 'Driving licence' },
  { key: 'aadhaar', label: 'Aadhaar card' },
  { key: 'pan', label: 'PAN card' },
];

type FormValues = {
  vehicleNumber: string;
  seatCapacity: SeatCapacity;
  vehicleType: VehicleType;
  isDefault: boolean;
};

export function VehicleForm() {
  const router = useRouter();
  const createVehicle = useCreateVehicle();
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { seatCapacity: '5(4+1)', vehicleType: 'sedan', isDefault: false },
  });

  const onSubmit = async (values: FormValues) => {
    const payload: CreateVehiclePayload = { ...values, files };
    try {
      const vehicle = await createVehicle.mutateAsync(payload);
      router.push(vehicleViewPath(vehicle._id));
    } catch {
      // surfaced via createVehicle.error below
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#344054]">Vehicle number</label>
          <input
            {...register('vehicleNumber', { required: 'Vehicle number is required' })}
            placeholder="DL01AB1234"
            className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm uppercase focus:border-[#0B5FFF] focus:outline-none"
          />
          {errors.vehicleNumber && (
            <p className="mt-1 text-xs text-[#B42318]">{errors.vehicleNumber.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#344054]">Vehicle type</label>
          <select
            {...register('vehicleType', { required: true })}
            className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm capitalize focus:border-[#0B5FFF] focus:outline-none"
          >
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[#344054]">Seat capacity</label>
          <select
            {...register('seatCapacity', { required: true })}
            className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm focus:border-[#0B5FFF] focus:outline-none"
          >
            {SEAT_OPTIONS.map((seat) => (
              <option key={seat} value={seat}>
                {seat}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 self-end pb-2 text-sm text-[#344054]">
          <input type="checkbox" {...register('isDefault')} className="h-4 w-4 rounded" />
          Set as default vehicle
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[#344054]">
          Documents <span className="font-normal text-[#667085]">(optional now, add later)</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DOC_TYPES.map((doc) => (
            <label
              key={doc.key}
              className="flex cursor-pointer flex-col rounded-lg border border-dashed border-[#D0D5DD] px-3 py-2.5 text-sm text-[#344054] hover:border-[#0B5FFF]"
            >
              <span>{doc.label}</span>
              <span className="mt-1 truncate text-xs text-[#667085]">
                {files[doc.key]?.name ?? 'Tap to choose a file'}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFiles((prev) => ({ ...prev, [doc.key]: file }));
                }}
              />
            </label>
          ))}
        </div>
      </div>

      {createVehicle.isError && (
        <p className="text-sm text-[#B42318]">
          {extractErrorMessage(createVehicle.error, 'Could not create vehicle')}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" isLoading={createVehicle.isPending}>
          Add vehicle
        </Button>
      </div>
    </form>
  );
}
