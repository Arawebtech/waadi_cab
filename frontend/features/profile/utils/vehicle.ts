import type { Vehicle } from '@/types/vehicle';

export function pickActiveVehicle(vehicles: Vehicle[]): Vehicle | null {
  if (!vehicles.length) return null;
  return (
    vehicles.find((v) => v.isDefault && v.isActive) ??
    vehicles.find((v) => v.isDefault) ??
    vehicles.find((v) => v.isActive) ??
    null
  );
}

export function formatVehicleType(type?: string | null): string {
  if (!type) return 'Unknown type';
  return type.charAt(0).toUpperCase() + type.slice(1);
}
