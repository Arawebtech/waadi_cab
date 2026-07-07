import { config } from '@/config/env';
import type {
  ApiResponse,
  BankDetails,
  Booking,
  DriverDocument,
  DriverEarnings,
  DriverProfile,
  DriverProfileResponse,
  Vehicle,
} from '@/types';

async function driverRequest<T>(
  path: string,
  options: RequestInit = {},
  token: string
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

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

export type DriverOnlineCoordinates = {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
};

export const driverApi = {
  getProfile(token: string) {
    return driverRequest<DriverProfileResponse>('/driver/profile', { method: 'GET' }, token);
  },

  setOnline(token: string, isOnline: boolean, isAvailable = isOnline, coordinates?: DriverOnlineCoordinates) {
    const body: Record<string, unknown> = { isOnline };

    if (isOnline) {
      body.isAvailable = isAvailable;
      if (coordinates) body.coordinates = coordinates;
    }

    return driverRequest<DriverProfile & { isOnline?: boolean; isAvailable?: boolean }>(
      '/driver/online',
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      token
    );
  },

  getRequests(token: string) {
    return driverRequest<Booking[]>('/driver/requests', { method: 'GET' }, token);
  },

  acceptBooking(token: string, bookingId: string) {
    return driverRequest<Booking>(
      `/driver/bookings/${bookingId}/accept`,
      { method: 'POST' },
      token
    );
  },

  getBookings(
    token: string,
    params?: { status?: string; page?: number; limit?: number }
  ) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return driverRequest<Booking[]>(`/driver/bookings${suffix}`, { method: 'GET' }, token);
  },

  getEarnings(token: string, period: 'today' | 'week' | 'month' = 'today') {
    return driverRequest<DriverEarnings>(
      `/driver/earnings?period=${period}`,
      { method: 'GET' },
      token
    );
  },

  getBooking(token: string, bookingId: string) {
    return driverRequest<Booking>(`/bookings/${bookingId}`, { method: 'GET' }, token);
  },

  updateBookingStatus(
    token: string,
    bookingId: string,
    status: string,
    extra?: { tripOtp?: string; cancelReason?: string }
  ) {
    return driverRequest<Booking>(
      `/bookings/${bookingId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, ...extra }),
      },
      token
    );
  },

  updateVehicle(token: string, vehicle: Partial<Vehicle>) {
    return driverRequest<DriverProfile>(
      '/driver/vehicle',
      { method: 'PATCH', body: JSON.stringify(vehicle) },
      token
    );
  },

  updateDocuments(token: string, documents: Partial<DriverDocument>) {
    return driverRequest<DriverProfile>(
      '/driver/documents',
      { method: 'PATCH', body: JSON.stringify(documents) },
      token
    );
  },

  updateBankDetails(token: string, bankDetails: BankDetails) {
    return driverRequest<DriverProfile>(
      '/driver/bank',
      { method: 'PATCH', body: JSON.stringify(bankDetails) },
      token
    );
  },
};
