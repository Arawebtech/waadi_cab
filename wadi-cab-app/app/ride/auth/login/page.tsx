'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerAuthApi } from '@/features/customer-ride/api/auth';
import { extractErrorMessage } from '@/features/customer-ride/api/client';

export default function RideLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await customerAuthApi.requestOtp(email, mode === 'register' ? 'register' : 'login', name);
      const params = new URLSearchParams({ email, mode });
      if (name) params.set('name', name);
      router.push(`/ride/auth/verify?${params}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-md">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Wadi Ride</p>
        <h1 className="mt-2 text-3xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="mt-2 text-slate-500">Sign in with email OTP — no password needed.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === 'register' && (
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-black"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-black"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-black py-4 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Sending OTP…' : 'Continue'}
          </button>
        </form>

        <button
          type="button"
          className="mt-6 w-full text-center text-sm text-slate-500"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
