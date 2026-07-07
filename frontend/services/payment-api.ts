import { config } from '@/config/env';
import type { ApiResponse } from '@/types';

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${config.apiUrl}${path}`, { ...options, headers });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success) throw new Error(body.message || 'Payment failed');
  return body;
}

export const paymentApi = {
  createOrder(
    body: { purpose: string; amount: number; planId?: string },
    token: string
  ) {
    return request<{ orderId: string; amount: number; devMode?: boolean; keyId: string }>(
      '/payments/create-order',
      { method: 'POST', body: JSON.stringify(body) },
      token
    );
  },
  devVerify(orderId: string, token: string) {
    return request('/payments/dev-verify', { method: 'POST', body: JSON.stringify({ orderId }) }, token);
  },
};
