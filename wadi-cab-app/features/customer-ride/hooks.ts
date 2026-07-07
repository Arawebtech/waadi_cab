'use client';

import { useQuery } from '@tanstack/react-query';
import { customerBookingApi } from './api/booking';
import type { PaginatedResponse, Ride } from './types';

export function useVehicleTypes() {
  return useQuery({
    queryKey: ['customer', 'vehicle-types'],
    queryFn: () => customerBookingApi.vehicleTypes(),
    staleTime: 60_000,
  });
}

export function useFareEstimate(
  pickup: { lat: number; lng: number; address: string } | null,
  drop: { lat: number; lng: number; address: string } | null,
  tripType = 'local',
  intercityPackageId?: string
) {
  return useQuery({
    queryKey: ['customer', 'fare', pickup, drop, tripType, intercityPackageId],
    queryFn: () =>
      customerBookingApi.fareEstimate({
        pickup: pickup!,
        drop: drop!,
        tripType,
        intercityPackageId,
      }),
    enabled: Boolean(pickup && drop),
  });
}

export function useRideHistory(status?: string, page = 1, limit = 20) {
  return useQuery<PaginatedResponse<Ride>>({
    queryKey: ['customer', 'rides', status, page, limit],
    queryFn: () => customerBookingApi.myBookings({ status, page, limit }),
    placeholderData: (previous: PaginatedResponse<Ride> | undefined) => previous,
  });
}

export function useActiveRide(enabled = true) {
  return useQuery({
    queryKey: ['customer', 'active-ride'],
    queryFn: () => customerBookingApi.activeBooking(),
    enabled,
    refetchInterval: 15_000,
  });
}

export function useRideDetail(id: string | null) {
  return useQuery({
    queryKey: ['customer', 'ride', id],
    queryFn: () => customerBookingApi.getBooking(id!),
    enabled: Boolean(id),
  });
}

export function useSavedPlaces() {
  return useQuery({
    queryKey: ['customer', 'saved-places'],
    queryFn: () => customerBookingApi.savedPlaces(),
  });
}

export function useIntercityPackages(fromCity?: string, toCity?: string) {
  return useQuery({
    queryKey: ['customer', 'intercity', fromCity, toCity],
    queryFn: () => customerBookingApi.intercityPackages(fromCity, toCity),
  });
}

export function useLiveDrivers(lat?: number, lng?: number) {
  return useQuery({
    queryKey: ['customer', 'live-drivers', lat, lng],
    queryFn: () => customerBookingApi.liveDrivers(lat!, lng!),
    enabled: lat != null && lng != null,
    refetchInterval: 12_000,
  });
}
