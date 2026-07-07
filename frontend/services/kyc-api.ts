import { config } from '@/config/env';
import type {
  ApiResponse,
  KycDocType,
  KycPersonalInfo,
  KycStatus,
  KycVehicleInfo,
  Vehicle,
} from '@/types';

async function kycRequest<T>(
  path: string,
  options: RequestInit = {},
  token: string
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
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

export const kycApi = {
  getStatus(token: string) {
    return kycRequest<KycStatus>('/kyc/status', { method: 'GET' }, token);
  },

  updatePersonal(token: string, data: KycPersonalInfo) {
    return kycRequest<Record<string, unknown>>(
      '/kyc/personal',
      { method: 'PATCH', body: JSON.stringify(data) },
      token
    );
  },

  uploadDocument(
    token: string,
    docType: KycDocType,
    uri: string,
    mimeType = 'image/jpeg'
  ) {
    const formData = new FormData();
    formData.append('docType', docType);
    formData.append('file', {
      uri,
      type: mimeType,
      name: `${docType}.jpg`,
    } as unknown as Blob);

    return kycRequest<{ docType: KycDocType; secure_url: string }>(
      '/kyc/document',
      { method: 'POST', body: formData },
      token
    );
  },

  updateVehicle(token: string, data: KycVehicleInfo) {
    return kycRequest<Vehicle>(
      '/kyc/vehicle',
      { method: 'PATCH', body: JSON.stringify(data) },
      token
    );
  },

  acceptTerms(token: string) {
    return kycRequest<Record<string, unknown>>('/kyc/terms', { method: 'POST' }, token);
  },

  submit(token: string) {
    return kycRequest<Record<string, unknown>>('/kyc/submit', { method: 'POST' }, token);
  },
};
