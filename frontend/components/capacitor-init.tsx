'use client';

import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { initializeCapacitor, registerPaymentDeepLinks } from '@/lib/capacitor';
import { pushNotificationService } from '@/lib/push-notifications';
import { useRouter } from 'next/navigation';
import appLogger, { setCorrelationIds } from '@/lib/logger';
import { reconcilePendingRazorpay } from '@/lib/pending-payment';

function buildPaymentRoute(path: string, params: URLSearchParams): string {
  const txnid = params.get('txnid') || params.get('txnId') || params.get('orderId') || '';
  const status = params.get('status') || '';
  const amount = params.get('amount') || '';
  const bookingId = params.get('bookingId') || '';
  const gateway = params.get('gateway') || 'cashfree';
  const error = params.get('error') || 'Payment failed';

  const q = new URLSearchParams();
  if (txnid) q.set('txnid', txnid);
  if (status) q.set('status', status);
  if (amount) q.set('amount', amount);
  if (bookingId) q.set('bookingId', bookingId);
  if (gateway) q.set('gateway', gateway);
  if (path === '/payment/failure' && error) q.set('error', error);
  if (path === '/payment/success' && !q.get('status')) q.set('status', 'success');
  if (path === '/payment/pending' && !q.get('status')) q.set('status', 'pending');

  return `${path}?${q.toString()}`;
}

export default function CapacitorInit() {
  const router = useRouter();

  const navigateFromPaymentLink = useCallback(
    (path: string, params: URLSearchParams) => {
      const txnid = params.get('txnid') || params.get('orderId') || '';
      const bookingId = params.get('bookingId') || '';
      const status = params.get('status') || '';
      const gateway = params.get('gateway') || '';

      setCorrelationIds({ transactionId: txnid, bookingId });
      appLogger.mobile('Payment deep link received', {
        sourceFile: 'capacitor-init.tsx',
        sourceFunction: 'navigateFromPaymentLink',
        bookingId,
        transactionId: txnid,
        data: { path, status, amount: params.get('amount'), gateway },
      });

      if (path === '/payment/success') {
        router.replace(buildPaymentRoute('/payment/success', params));
        return;
      }
      if (path === '/payment/pending') {
        router.replace(buildPaymentRoute('/payment/pending', params));
        return;
      }
      if (path === '/payment/failure') {
        router.replace(buildPaymentRoute('/payment/failure', params));
        return;
      }

      const statusLower = (status || '').toLowerCase();
      if (statusLower === 'success') {
        router.replace(buildPaymentRoute('/payment/success', params));
      } else if (statusLower === 'pending') {
        router.replace(buildPaymentRoute('/payment/pending', params));
      } else if (statusLower) {
        router.replace(buildPaymentRoute('/payment/failure', params));
      }
    },
    [router]
  );

  useEffect(() => {
    initializeCapacitor();

    pushNotificationService.initialize().catch((error) => {
      console.error('❌ Failed to initialize push notifications:', error);
    });

    registerPaymentDeepLinks(navigateFromPaymentLink);

    const recoverPaidRazorpay = () => {
      void reconcilePendingRazorpay((url) => router.replace(url))
    }

    recoverPaidRazorpay()

    let appStateHandle: { remove: () => Promise<void> } | undefined
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) recoverPaidRazorpay()
      }).then((handle) => {
        appStateHandle = handle
      })
    }

    appLogger.mobile('App launch — Capacitor initialized', {
      sourceFile: 'capacitor-init.tsx',
      sourceFunction: 'useEffect',
    });
    console.log('🔌 Capacitor initialized with payment deep link handling');

    return () => {
      appStateHandle?.remove()
    }
  }, [navigateFromPaymentLink, router]);

  return null;
}
