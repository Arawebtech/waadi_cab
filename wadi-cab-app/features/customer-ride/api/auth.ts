import { customerApi } from './client';
import type { ApiEnvelope, AuthPayload, CustomerUser, OtpRequestResponse } from '../types';

export const customerAuthApi = {
  async requestOtp(email: string, purpose: 'register' | 'login', name?: string) {
    const { data } = await customerApi.post<ApiEnvelope<OtpRequestResponse>>('/auth/otp/request', {
      email,
      purpose,
      role: 'customer',
      name,
    });
    return data.data;
  },

  async register(email: string, name: string, otp: string) {
    const { data } = await customerApi.post<ApiEnvelope<AuthPayload>>('/auth/register', {
      email,
      name,
      otp,
      role: 'customer',
    });
    return data.data;
  },

  async login(email: string, otp: string) {
    const { data } = await customerApi.post<ApiEnvelope<AuthPayload>>('/auth/login', {
      email,
      otp,
      role: 'customer',
    });
    return data.data;
  },

  async me() {
    const { data } = await customerApi.get<ApiEnvelope<CustomerUser>>('/auth/me');
    return data.data;
  },

  async logout(refreshToken: string) {
    await customerApi.post('/auth/logout', { refreshToken });
  },
};
