import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SubscriptionPurchaseIntent } from '@/types/subscription';
import * as subscriptionsApi from './api';

const KEYS = {
  plans: ['subscriptions', 'plans'] as const,
  mine: ['subscriptions', 'mine'] as const,
  history: (params?: { page?: number; limit?: number; action?: string }) =>
    ['subscriptions', 'history', params] as const,
};

export function usePlans() {
  return useQuery({ queryKey: KEYS.plans, queryFn: () => subscriptionsApi.fetchPlans() });
}

export function useMySubscription() {
  return useQuery({
    queryKey: KEYS.mine,
    queryFn: () => subscriptionsApi.fetchMySubscription(),
    // A driver with no subscription yet gets a 404 — that's an expected,
    // not exceptional, state, so don't keep retrying it.
    retry: false,
  });
}

export function useSubscriptionHistory(params?: {
  page?: number;
  limit?: number;
  action?: string;
}) {
  return useQuery({
    queryKey: KEYS.history(params),
    queryFn: () => subscriptionsApi.fetchMySubscriptionHistory(params),
  });
}

export function usePurchaseByWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      intent,
    }: {
      planId: string;
      intent?: SubscriptionPurchaseIntent;
    }) => subscriptionsApi.purchaseByWallet(planId, intent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.mine });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'history'] });
    },
  });
}

export function useInitiateGatewayPurchase() {
  return useMutation({
    mutationFn: ({ planId, intent }: { planId: string; intent?: SubscriptionPurchaseIntent }) =>
      subscriptionsApi.initiateGatewayPurchase(planId, intent),
  });
}

export function useRenewSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => subscriptionsApi.renewSubscription(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.mine });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'history'] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => subscriptionsApi.cancelSubscription(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.mine });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'history'] });
    },
  });
}
