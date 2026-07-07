import axios, { AxiosError } from 'axios';
import { base_url } from '@/environment';
import type { ApiEnvelope } from '../types';

const BASE = `${base_url}/cab`;
const ACCESS_KEY = 'customer_ride_access_token';
const REFRESH_KEY = 'customer_ride_refresh_token';
const USER_KEY = 'customer_ride_user';

export const customerApi = axios.create({
  baseURL: BASE,
  timeout: 30_000,
});

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getCustomerRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setCustomerSession(accessToken: string, refreshToken: string, user: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredCustomerUser<T = unknown>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearCustomerSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

customerApi.interceptors.request.use((config) => {
  const token = getCustomerToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getCustomerRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string; user: unknown }>>(
      `${BASE}/auth/refresh`,
      { refreshToken }
    );
    setCustomerSession(data.data.accessToken, data.data.refreshToken, data.data.user);
    return data.data.accessToken;
  } catch {
    clearCustomerSession();
    return null;
  }
}

customerApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !(original as { _retry?: boolean })._retry) {
      (original as { _retry?: boolean })._retry = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const token = await refreshPromise;
      refreshPromise = null;
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return customerApi(original);
      }
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'Request failed';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export type { ApiEnvelope };
