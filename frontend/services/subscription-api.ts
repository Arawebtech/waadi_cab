import { config } from '@/config/env';
import type {
  ApiResponse,
  CurrentSubscriptionResponse,
  Subscription,
  SubscriptionHistoryEntry,
  SubscriptionPlan,
  VehicleType,
} from '@/types';

async function subscriptionRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || 'Request failed');
  }

  return body;
}

export const subscriptionApi = {
  getPlans() {
    return subscriptionRequest<SubscriptionPlan[]>('/subscription/plans', { method: 'GET' });
  },

  getCurrent(token: string) {
    return subscriptionRequest<CurrentSubscriptionResponse>(
      '/subscription/current',
      { method: 'GET' },
      token
    );
  },

  purchase(token: string, planId: string, paymentMethod = 'upi') {
    return subscriptionRequest<Subscription>(
      '/subscription/purchase',
      {
        method: 'POST',
        body: JSON.stringify({ planId, paymentMethod }),
      },
      token
    );
  },

  getHistory(token: string) {
    return subscriptionRequest<SubscriptionHistoryEntry[]>(
      '/subscription/history',
      { method: 'GET' },
      token
    );
  },

  getVehicleTypes() {
    return subscriptionRequest<VehicleType[]>('/vehicle-types', { method: 'GET' });
  },
};
