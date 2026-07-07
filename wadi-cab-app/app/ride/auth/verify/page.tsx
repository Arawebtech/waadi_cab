'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { customerAuthApi } from '@/features/customer-ride/api/auth';
import { useCustomerRide } from '@/features/customer-ride/context/CustomerRideProvider';
import { extractErrorMessage } from '@/features/customer-ride/api/client';

export default function RideVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useCustomerRide();
  const email = params.get('email') || '';
  const mode = (params.get('mode') as 'login' | 'register') || 'login';
  const name = params.get('name') || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload =
        mode === 'register'
          ? await customerAuthApi.register(email, name || 'Rider', otp)
          : await customerAuthApi.login(email, otp);
      login(payload);
      router.replace('/ride');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await customerAuthApi.requestOtp(email, mode === 'register' ? 'register' : 'login', name);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-bold">Enter OTP</h1>
        <p className="mt-2 text-slate-500">We sent a 6-digit code to {email}</p>
        <p className="mt-1 text-xs text-amber-600">Dev: check backend console for OTP</p>

        <form onSubmit={handleVerify} className="mt-8 space-y-4">
          <input
            required
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-center text-2xl tracking-[0.5em] outline-none focus:border-black"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full rounded-2xl bg-black py-4 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>
        </form>

        <button type="button" onClick={resend} className="mt-6 w-full text-sm text-slate-500">
          Resend code
        </button>
      </div>
    </div>
  );
}
