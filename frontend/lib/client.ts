import axios, { AxiosError } from 'axios';
import { base_url } from '@/environment';
import { tokenManager } from '@/lib/api';

const ACCESS_TOKEN_KEY = 'wadi_cab_access_token';

/**
 * Axios client for Cab Booking module APIs.
 * Uses the same JWT storage as Border Tax auth (tokenManager).
 */
export const apiClient = axios.create({
  baseURL: base_url,
  timeout: 30_000,
});

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return tokenManager.getAccessToken() || window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  tokenManager.setAccessToken(token);
}

export function clearStoredToken() {
  tokenManager.clearTokens();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorShape {
  success: false;
  message: string;
  errors?: unknown;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorShape>) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** Every route handler in the uploaded backend replies with this envelope. */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit?: number;
    pages: number;
  };
}

export function extractErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;
    if (data?.message) return data.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
