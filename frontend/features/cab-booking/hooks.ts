'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as cabApi from './api';
import { rejectRide as rejectRideApi } from './api';

const keys = {
  profile: ['cab', 'profile'] as const,
  verification: ['cab', 'verification'] as const,
  plans: ['cab', 'plans'] as const,
  subscription: ['cab', 'subscription'] as const,
  location: ['cab', 'location'] as const,
  rides: ['cab', 'rides'] as const,
  activeRide: ['cab', 'activeRide'] as const,
  dashboard: ['cab', 'dashboard'] as const,
  wallet: ['cab', 'wallet'] as const,
  walletTx: ['cab', 'walletTx'] as const,
  tripHistory: ['cab', 'tripHistory'] as const,
};

export function useCabProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: cabApi.fetchCabProfile });
}

export function useCabVerification() {
  return useQuery({ queryKey: keys.verification, queryFn: cabApi.fetchVerification });
}

export function useUpdateCabProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.updateCabProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.profile });
      qc.invalidateQueries({ queryKey: keys.verification });
    },
  });
}

export function useSaveRegistrationStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.saveRegistrationStep,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });
}

export function useSubmitVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.submitVerification,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.verification }),
  });
}

export function useSetActiveVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.setActiveVehicle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.profile });
      qc.invalidateQueries({ queryKey: keys.verification });
    },
  });
}

export function useCabPlans() {
  return useQuery({ queryKey: keys.plans, queryFn: cabApi.fetchCabPlans });
}

export function useCabSubscription() {
  return useQuery({ queryKey: keys.subscription, queryFn: cabApi.fetchCabSubscription });
}

export function usePurchaseCabSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.purchaseCabSubscriptionTesting,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.subscription });
      qc.invalidateQueries({ queryKey: keys.verification });
    },
  });
}

export function useDriverLocation() {
  return useQuery({
    queryKey: keys.location,
    queryFn: cabApi.fetchDriverLocationStatus,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useSetDriverAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.setDriverAvailability,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.location }),
  });
}

export function useSetDriverOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.setDriverOnline,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.location }),
  });
}

export function useUpdateDriverLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.updateDriverLocation,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.location }),
  });
}

export function useRideRequests(enabled: boolean) {
  return useQuery({
    queryKey: keys.rides,
    queryFn: cabApi.fetchRideRequests,
    enabled,
    refetchInterval: enabled ? 8_000 : false,
  });
}

export function useAcceptRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cabApi.acceptRide,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rides });
      qc.invalidateQueries({ queryKey: keys.activeRide });
      qc.invalidateQueries({ queryKey: keys.location });
    },
  });
}

export function useActiveRide() {
  return useQuery({ queryKey: keys.activeRide, queryFn: cabApi.fetchActiveRide, refetchInterval: 10_000 });
}

export function useRejectRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: rejectRideApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.rides }),
  });
}

export function useUpdateRideStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, status }: { rideId: string; status: string }) =>
      cabApi.updateRideStatus(rideId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.activeRide });
      qc.invalidateQueries({ queryKey: keys.location });
      qc.invalidateQueries({ queryKey: keys.dashboard });
      qc.invalidateQueries({ queryKey: keys.wallet });
      qc.invalidateQueries({ queryKey: keys.tripHistory });
    },
  });
}

export function useDriverDashboard() {
  return useQuery({ queryKey: keys.dashboard, queryFn: cabApi.fetchDriverDashboard, refetchInterval: 30_000 });
}

export function useDriverWallet() {
  return useQuery({ queryKey: keys.wallet, queryFn: cabApi.fetchDriverWallet, refetchInterval: 20_000 });
}

export function useWalletTransactions(page = 1) {
  return useQuery({
    queryKey: [...keys.walletTx, page],
    queryFn: () => cabApi.fetchWalletTransactions(page),
  });
}

export function useTripHistory(status?: string) {
  return useQuery({
    queryKey: [...keys.tripHistory, status],
    queryFn: () => cabApi.fetchMyRides({ status, limit: 30 }),
  });
}

export function useVerifyTripOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rideId, otp }: { rideId: string; otp: string }) =>
      cabApi.verifyTripOtp(rideId, otp),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.activeRide }),
  });
}
