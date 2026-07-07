import { config } from '@/config/env';
import type { ApiResponse, AuthPayload, User } from '@/types';

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || 'Request failed');
  }

  return body;
}

export const authApi = {
  requestOtp(email: string, purpose: 'register' | 'login', name?: string) {
    return request<{ expiresInMinutes?: number }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({
        email,
        role: config.authRole,
        purpose,
        ...(name ? { name } : {}),
      }),
    });
  },

  register(email: string, name: string, otp: string) {
    return request<AuthPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, role: config.authRole, otp }),
    });
  },

  registerRider(body: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    termsAccepted: boolean;
  }) {
    return request<AuthPayload>('/auth/rider/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  loginRider(email: string, password: string) {
    return request<AuthPayload>('/auth/rider/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  login(email: string, otp: string) {
    return request<AuthPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        role: config.authRole,
        otp,
      }),
    });
  },

  refresh(refreshToken: string) {
    return request<AuthPayload>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  logout(refreshToken: string) {
    return request<Record<string, never>>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  me(token: string) {
    return request<User>('/auth/me', { method: 'GET' }, token);
  },
};
