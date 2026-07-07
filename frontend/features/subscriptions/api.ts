import { apiClient, ApiEnvelope } from '@/lib/api/client';
import { SUBSCRIPTION_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  InitiatePaymentResponse,
  Subscription,
  SubscriptionHistoryEntry,
  SubscriptionOverview,
  SubscriptionPlan,
  SubscriptionPurchaseIntent,
} from '@/types/subscription';
import type { Pagination } from '@/types/common';

export async function fetchPlans(params?: { page?: number; limit?: number }) {
  const { data } = await apiClient.get<ApiEnvelope<SubscriptionPlan[]>>(
    SUBSCRIPTION_ENDPOINTS.plans,
    { params }
  );
  return { plans: data.data, pagination: data.pagination as Pagination };
}

/** Kicks off a gateway payment (PhonePe/Cashfree/PayU — whichever gatewayResolver
 * picks). The returned `payment` payload should be handed to your existing
 * payment-gateway SDK/redirect logic; its shape depends on which gateway is
 * active and isn't defined in the uploaded backend code. */
export async function initiateGatewayPurchase(planId: string, intent: SubscriptionPurchaseIntent = 'purchase') {
  const { data } = await apiClient.post<InitiatePaymentResponse>(
    SUBSCRIPTION_ENDPOINTS.purchase,
    { planId, intent }
  );
  return data;
}

export async function confirmPaymentSuccess(txnid: string, paymentId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>(
    SUBSCRIPTION_ENDPOINTS.paymentSuccess,
    { txnid, paymentId }
  );
  return data.data;
}

export async function reportPaymentFailed(txnid: string, reason?: string) {
  const { data } = await apiClient.post<ApiEnvelope<null>>(SUBSCRIPTION_ENDPOINTS.paymentFailed, {
    txnid,
    reason,
  });
  return data;
}

export async function purchaseByWallet(planId: string, intent: SubscriptionPurchaseIntent = 'purchase') {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>(
    SUBSCRIPTION_ENDPOINTS.purchaseWallet,
    { planId, intent }
  );
  return data.data;
}

export async function renewSubscription(planId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>(SUBSCRIPTION_ENDPOINTS.renew, {
    planId,
  });
  return data.data;
}

export async function fetchMySubscription(): Promise<SubscriptionOverview> {
  const { data } = await apiClient.get<
    ApiEnvelope<Subscription | null> & { active?: Subscription | null; scheduled?: Subscription | null }
  >(SUBSCRIPTION_ENDPOINTS.mySubscription);

  const active = data.active ?? (data.data?.status === 'active' ? data.data : null) ?? null;
  const scheduled = data.scheduled ?? (data.data?.status === 'scheduled' ? data.data : null) ?? null;
  const current = active ?? scheduled ?? data.data ?? null;

  return { current, active, scheduled };
}

export async function fetchMySubscriptionHistory(params?: {
  page?: number;
  limit?: number;
  action?: string;
}) {
  const { data } = await apiClient.get<ApiEnvelope<SubscriptionHistoryEntry[]>>(
    SUBSCRIPTION_ENDPOINTS.history,
    { params }
  );
  return { history: data.data, pagination: data.pagination as Pagination };
}

export async function cancelSubscription(reason?: string) {
  const { data } = await apiClient.patch<ApiEnvelope<Subscription>>(
    SUBSCRIPTION_ENDPOINTS.cancel,
    { reason }
  );
  return data.data;
}
