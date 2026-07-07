'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { customerPaymentApi } from '@/features/customer-ride/api/payment';
import { extractErrorMessage } from '@/features/customer-ride/api/client';

export default function RidePaymentSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying payment…');

  useEffect(() => {
    async function verify() {
      const txnId = params.get('txnid') || params.get('txnId');
      const rideId = params.get('rideId');
      if (!txnId || params.get('status') !== 'success') {
        setState('error');
        setMessage('Invalid payment return URL');
        return;
      }
      try {
        await customerPaymentApi.verifyRidePayment(txnId);
        setState('success');
        setMessage('Payment successful');
        sessionStorage.removeItem('pendingRidePayment');
        setTimeout(() => router.replace(rideId ? `/ride/trip?id=${rideId}&paid=1` : '/ride/history'), 1200);
      } catch (err) {
        setState('error');
        setMessage(extractErrorMessage(err));
      }
    }
    verify();
  }, [params, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      {state === 'loading' && <><Loader2 className="h-10 w-10 animate-spin text-emerald-600" /><p>{message}</p></>}
      {state === 'success' && <><CheckCircle className="h-12 w-12 text-emerald-600" /><h1 className="text-xl font-bold">Payment complete</h1><p>{message}</p></>}
      {state === 'error' && <><XCircle className="h-12 w-12 text-red-500" /><h1 className="text-xl font-bold">Verification failed</h1><p>{message}</p></>}
    </div>
  );
}
