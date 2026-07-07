import type { RideDriver } from '../types';

/** Display driver full name: "First Last", with graceful fallback if last name is missing. */
export function formatDriverName(driver?: Pick<RideDriver, 'name' | 'firstName' | 'lastName'> | null): string {
  if (!driver) return 'Driver';
  const fromParts = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim();
  if (fromParts) return fromParts;
  if (driver.name?.trim()) return driver.name.trim();
  return 'Driver';
}

export function driverInitial(driver?: Pick<RideDriver, 'name' | 'firstName' | 'lastName'> | null): string {
  const label = formatDriverName(driver);
  return label.charAt(0).toUpperCase() || 'D';
}
