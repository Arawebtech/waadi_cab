import { Capacitor } from '@capacitor/core';
import { base_url } from '@/environment';
import { getCustomerToken } from '@/features/customer-ride/api/client';

export type PaymentGatewayName = 'payu' | 'cashfree';

export interface BackendPaymentPayload {
  gateway: PaymentGatewayName;
  paymentUrl: string;
  paymentData: Record<string, string>;
}

function buildCashfreeRelayParams(paymentData: Record<string, string>) {
  const paymentSessionId = paymentData.payment_session_id || paymentData.session_id;
  if (!paymentSessionId?.startsWith('session_')) throw new Error('Invalid Cashfree session');
  return {
    payment_session_id: paymentSessionId,
    mode: (paymentData.mode || 'production').toLowerCase() === 'production' ? 'production' : 'sandbox',
    ...(paymentData.platform ? { platform: paymentData.platform } : {}),
  };
}

async function openNativeRelay(url: string) {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, windowName: '_self' });
}

export function getPaymentReference(payment: BackendPaymentPayload) {
  return payment.paymentData.txnid || '';
}

export async function initiatePaymentFromBackend(payment: BackendPaymentPayload) {
  if (payment.gateway === 'payu') {
    if (Capacitor.isNativePlatform()) {
      await openNativeRelay(`${base_url}/payment/relay?${new URLSearchParams(payment.paymentData).toString()}`);
      return { txnId: payment.paymentData.txnid || '' };
    }
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payment.paymentUrl;
    form.target = '_blank';
    Object.entries(payment.paymentData).forEach(([k, v]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v ?? '';
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    return { txnId: payment.paymentData.txnid || '' };
  }

  const relayParams = buildCashfreeRelayParams(payment.paymentData);
  if (Capacitor.isNativePlatform()) {
    await openNativeRelay(`${base_url}/payment/cashfree/relay?${new URLSearchParams(relayParams).toString()}`);
  } else {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${base_url}/payment/cashfree/relay`;
    form.target = '_blank';
    Object.entries(relayParams).forEach(([k, v]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = k;
      input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }
  return { txnId: payment.paymentData.txnid || '' };
}

export function isBackendPaymentPayload(value: unknown): value is BackendPaymentPayload {
  return Boolean(value && typeof value === 'object' && (value as BackendPaymentPayload).gateway && (value as BackendPaymentPayload).paymentData);
}
