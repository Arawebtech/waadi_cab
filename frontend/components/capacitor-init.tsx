'use client';

import { useEffect } from 'react';
import { initializeCapacitor, registerPaymentDeepLinks } from '@/lib/capacitor';
import { pushNotificationService } from '@/lib/push-notifications';
import { useRouter } from 'next/navigation';

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
      
      if (path === '/payment/success') {
        router.replace(`/payment/success?txnid=${encodeURIComponent(txnid)}&status=${encodeURIComponent(status)}&amount=${encodeURIComponent(amount)}&bookingId=${encodeURIComponent(bookingId)}`);
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

    // Log Capacitor initialization
    console.log('🔌 Capacitor initialized with network connectivity monitoring');
  }, []);

  return null;
} 