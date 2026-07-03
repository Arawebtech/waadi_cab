'use client';

import { useEffect } from 'react';
import { initializeCapacitor, registerPaymentDeepLinks } from '@/lib/capacitor';
import { pushNotificationService } from '@/lib/push-notifications';
import { useRouter } from 'next/navigation';
import appLogger, { setCorrelationIds } from '@/lib/logger';

export default function CapacitorInit() {
  const router = useRouter();
  
  useEffect(() => {
    // Initialize Capacitor plugins
    initializeCapacitor();
    
    // Initialize push notifications
    pushNotificationService.initialize().catch(error => {
      console.error('❌ Failed to initialize push notifications:', error);
    });
    
    // Setup deep-link listener to auto-close Browser and navigate
    registerPaymentDeepLinks((path, params) => {
      const txnid = params.get('txnid') || '';
      const status = params.get('status') || '';
      const amount = params.get('amount') || '';
      const bookingId = params.get('bookingId') || '';

      setCorrelationIds({ transactionId: txnid, bookingId });
      appLogger.mobile('Payment deep link received', {
        sourceFile: 'capacitor-init.tsx',
        sourceFunction: 'registerPaymentDeepLinks',
        bookingId,
        transactionId: txnid,
        data: { path, status, amount },
      });
      
      if (path === '/payment/success') {
        router.replace(`/payment/success?txnid=${encodeURIComponent(txnid)}&status=${encodeURIComponent(status || 'success')}&amount=${encodeURIComponent(amount)}&bookingId=${encodeURIComponent(bookingId)}`);
      } else if (path === '/payment/pending') {
        router.replace(`/payment/pending?txnid=${encodeURIComponent(txnid)}&status=pending&amount=${encodeURIComponent(amount)}&bookingId=${encodeURIComponent(bookingId)}`);
      } else if (path === '/payment/failure') {
        const error = params.get('error') || 'Payment failed';
        router.replace(`/payment/failure?txnid=${encodeURIComponent(txnid)}&status=${encodeURIComponent(status)}&amount=${encodeURIComponent(amount)}&error=${encodeURIComponent(error)}`);
      } else {
        // Fallback: if we received a payment deep link but path unmatched, infer from status
        const statusLower = (status || '').toLowerCase();
        if (statusLower === 'success') {
          router.replace(`/payment/success?txnid=${encodeURIComponent(txnid)}&status=success&amount=${encodeURIComponent(amount)}&bookingId=${encodeURIComponent(bookingId)}`);
        } else if (statusLower) {
          const error = params.get('error') || 'Payment failed';
          router.replace(`/payment/failure?txnid=${encodeURIComponent(txnid)}&status=${encodeURIComponent(statusLower)}&amount=${encodeURIComponent(amount)}&error=${encodeURIComponent(error)}`);
        }
      }
    });

    appLogger.mobile('App launch — Capacitor initialized', {
      sourceFile: 'capacitor-init.tsx',
      sourceFunction: 'useEffect',
    });
    console.log('🔌 Capacitor initialized with network connectivity monitoring');
  }, []);

  return null;
} 