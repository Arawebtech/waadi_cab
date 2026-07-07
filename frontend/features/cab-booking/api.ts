import { apiClient, ApiEnvelope } from '@/lib/api/client';
import type {
  CabDriverProfile,
  CabRideRequest,
  DriverLocation,
  DriverLocationStatus,
  VerificationSummary,
} from '@/types/cab-booking';
import type { Subscription, SubscriptionHistoryEntry, SubscriptionPlan } from '@/types/subscription';

const BASE = '/cab-driver';

export async function fetchCabProfile() {
  const { data } = await apiClient.get<ApiEnvelope<CabDriverProfile>>(`${BASE}/profile`);
  return data.data;
}

export async function updateCabProfile(payload: Record<string, unknown>) {
  const { data } = await apiClient.patch<ApiEnvelope<CabDriverProfile>>(`${BASE}/profile`, payload);
  return data.data;
}

export async function saveRegistrationStep(step: number) {
  const { data } = await apiClient.patch<ApiEnvelope<{ step: number }>>(`${BASE}/registration-step`, {
    step,
  });
  return data.data.step;
}

export async function fetchVerification() {
  const { data } = await apiClient.get<ApiEnvelope<VerificationSummary>>(`${BASE}/verification`);
  return data.data;
}

export async function submitVerification() {
  const { data } = await apiClient.post<ApiEnvelope<VerificationSummary>>(`${BASE}/verification/submit`);
  return data.data;
}

export async function setActiveVehicle(vehicleId: string) {
  const { data } = await apiClient.patch<ApiEnvelope<unknown>>(`${BASE}/active-vehicle`, { vehicleId });
  return data.data;
}

export async function fetchCabPlans() {
  const { data } = await apiClient.get<ApiEnvelope<SubscriptionPlan[]>>(`${BASE}/subscription/plans`);
  return data.data;
}

export async function fetchCabSubscription() {
  const { data } = await apiClient.get<ApiEnvelope<Subscription | null>>(`${BASE}/subscription/current`);
  return data.data;
}

export async function purchaseCabSubscriptionTesting(planId: string) {
  const { data } = await apiClient.post<ApiEnvelope<Subscription>>(`${BASE}/subscription/purchase-testing`, {
    planId,
  });
  return data.data;
}

export async function fetchCabSubscriptionHistory(page = 1) {
  const { data } = await apiClient.get<
    ApiEnvelope<{ items: SubscriptionHistoryEntry[]; pagination: { total: number; page: number; pages: number } }>
  >(`${BASE}/subscription/history`, { params: { page } });
  return data.data;
}

export async function fetchDriverLocation() {
  const { data } = await apiClient.get<ApiEnvelope<DriverLocationStatus>>(`${BASE}/location/status`);
  return data.data;
}

export async function fetchDriverLocationStatus() {
  return fetchDriverLocation();
}

export async function setDriverAvailability(isAvailable: boolean) {
  const { data } = await apiClient.patch<ApiEnvelope<DriverLocation>>(`${BASE}/availability`, { isAvailable });
  return data.data;
}

export async function setDriverOnline(payload: {
  isOnline: boolean;
  isAvailable?: boolean;
  coordinates?: { lat: number; lng: number; heading?: number; speed?: number; accuracy?: number };
  vehicleId?: string;
}) {
  const { data } = await apiClient.patch<ApiEnvelope<DriverLocation>>(`${BASE}/online`, payload);
  return data.data;
}

export async function updateDriverLocation(coordinates: {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}) {
  const { data } = await apiClient.patch<ApiEnvelope<DriverLocation>>(`${BASE}/location`, { coordinates });
  return data.data;
}

export async function fetchRideRequests() {
  const { data } = await apiClient.get<ApiEnvelope<CabRideRequest[]>>(`${BASE}/rides/requests`);
  return data.data;
}

export async function acceptRide(rideId: string) {
  const { data } = await apiClient.post<ApiEnvelope<CabRideRequest>>(`${BASE}/rides/${rideId}/accept`);
  return data.data;
}

export async function rejectRide(rideId: string) {
  const { data } = await apiClient.post<ApiEnvelope<unknown>>(`${BASE}/rides/${rideId}/reject`);
  return data.data;
}

export async function updateRideStatus(rideId: string, status: string) {
  const { data } = await apiClient.patch<ApiEnvelope<CabRideRequest>>(`${BASE}/rides/${rideId}/status`, {
    status,
  });
  return data.data;
}

export async function fetchActiveRide() {
  const { data } = await apiClient.get<ApiEnvelope<CabRideRequest | null>>(`${BASE}/rides/active`);
  return data.data;
}

export async function fetchDriverDashboard() {
  const { data } = await apiClient.get<ApiEnvelope<import('@/types/cab-booking').DriverDashboard>>(`${BASE}/dashboard`);
  return data.data;
}

export async function fetchDriverWallet() {
  const { data } = await apiClient.get<ApiEnvelope<{ balance: number; currency: string }>>(`${BASE}/wallet`);
  return data.data;
}

export async function fetchWalletTransactions(page = 1) {
  const { data } = await apiClient.get<
    ApiEnvelope<{ items: import('@/types/cab-booking').WalletTransaction[]; pagination: { total: number; page: number; pages: number } }>
  >(`${BASE}/wallet/transactions`, { params: { page } });
  return data.data;
}

export async function fetchMyRides(params: { status?: string; page?: number; limit?: number } = {}) {
  const { data } = await apiClient.get<
    ApiEnvelope<{ items: CabRideRequest[]; pagination: { total: number; page: number; pages: number } }>
  >(`${BASE}/rides`, { params });
  return data.data;
}

export async function verifyTripOtp(rideId: string, otp: string) {
  const { data } = await apiClient.post<ApiEnvelope<CabRideRequest>>(`${BASE}/rides/${rideId}/verify-otp`, { otp });
  return data.data;
}

export async function fetchRideMessages(rideId: string) {
  const { data } = await apiClient.get<
    ApiEnvelope<{ items: { _id: string; message: string; senderRole: string; createdAt: string }[] }>
  >(`${BASE}/rides/${rideId}/messages`);
  return data.data.items;
}

export async function sendRideMessage(rideId: string, message: string) {
  const { data } = await apiClient.post(`${BASE}/rides/${rideId}/messages`, { message });
  return data.data;
}
