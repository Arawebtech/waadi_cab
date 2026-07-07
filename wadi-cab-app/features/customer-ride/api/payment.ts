import { customerApi } from './client';
import type { ApiEnvelope } from '../types';
import { initiatePaymentFromBackend, isBackendPaymentPayload, getPaymentReference, type BackendPaymentPayload } from '@/lib/payment-gateway';

export const customerPaymentApi = {
  async payForRide(rideId: string, paymentMethod: 'cash' | 'wallet') {
    const { data } = await customerApi.post<ApiEnvelope<unknown>>(`/bookings/${rideId}/pay`, { paymentMethod });
    return data.data;
  },

  async initiateRidePayment(rideId: string) {
    const { data } = await customerApi.post<ApiEnvelope<BackendPaymentPayload & { ride?: { id: string; amount: number } }>>(
      `/bookings/${rideId}/payments/initiate`,
      { rideId }
    );
    const payload = data.data;
    if (!isBackendPaymentPayload(payload)) throw new Error('Invalid payment session');
    return payload;
  },

  async verifyRidePayment(txnId: string) {
    const { data } = await customerApi.post<ApiEnvelope<unknown>>('/payments/verify', { txnId });
    return data.data;
  },

  async startOnlinePayment(rideId: string) {
    const session = await this.initiateRidePayment(rideId);
    const txnId = getPaymentReference(session);
    if (typeof window !== 'undefined' && txnId) {
      sessionStorage.setItem('pendingRidePayment', JSON.stringify({ rideId, txnId, startedAt: Date.now() }));
    }
    await initiatePaymentFromBackend(session);
    return { txnId };
  },
};
