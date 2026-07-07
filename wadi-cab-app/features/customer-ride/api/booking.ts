import { customerApi } from './client';
import type {
  ApiEnvelope,
  FareEstimate,
  IntercityPackage,
  Location,
  PaginatedApiEnvelope,
  PaginatedResponse,
  PlaceSuggestion,
  Ride,
  SavedPlace,
  VehicleType,
  Wallet,
} from '../types';

export const customerBookingApi = {
  async vehicleTypes() {
    const { data } = await customerApi.get<ApiEnvelope<VehicleType[]>>('/vehicle-types');
    return data.data;
  },

  async fareEstimate(body: {
    pickup: Location;
    drop: Location;
    tripType?: string;
    intercityPackageId?: string;
    couponCode?: string;
  }) {
    const { data } = await customerApi.post<
      ApiEnvelope<{ distanceKm: number; durationMin: number; estimates: FareEstimate[] }>
    >('/fare/estimate', body);
    return data.data;
  },

  async createBooking(body: Record<string, unknown>) {
    const { data } = await customerApi.post<ApiEnvelope<Ride>>('/bookings', body);
    return data.data;
  },

  async activeBooking() {
    const { data } = await customerApi.get<ApiEnvelope<Ride | null>>('/bookings/active');
    return data.data;
  },

  async myBookings(options?: { status?: string; page?: number; limit?: number }): Promise<PaginatedResponse<Ride>> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    params.set('page', String(options?.page ?? 1));
    params.set('limit', String(options?.limit ?? 20));
    const { data } = await customerApi.get<PaginatedApiEnvelope<Ride[]>>(`/bookings/mine?${params}`);
    return { items: data.data, pagination: data.pagination };
  },

  async getBooking(id: string) {
    const { data } = await customerApi.get<ApiEnvelope<Ride>>(`/bookings/${id}`);
    return data.data;
  },

  async cancelBooking(id: string, reason: string) {
    const { data } = await customerApi.post<ApiEnvelope<Ride>>(`/bookings/${id}/cancel`, { reason });
    return data.data;
  },

  async rateBooking(id: string, rating: number, review: string) {
    const { data } = await customerApi.post<ApiEnvelope<Ride>>(`/bookings/${id}/rate`, { rating, review });
    return data.data;
  },

  async getTripOtp(id: string) {
    const { data } = await customerApi.get<ApiEnvelope<{ otp: string }>>(`/bookings/${id}/trip-otp`);
    return data.data.otp;
  },

  async getInvoice(id: string) {
    const { data } = await customerApi.get<ApiEnvelope<Record<string, unknown>>>(`/bookings/${id}/invoice`);
    return data.data;
  },

  async intercityPackages(fromCity?: string, toCity?: string) {
    const params = new URLSearchParams();
    if (fromCity) params.set('fromCity', fromCity);
    if (toCity) params.set('toCity', toCity);
    const { data } = await customerApi.get<ApiEnvelope<IntercityPackage[]>>(`/intercity-packages?${params}`);
    return data.data;
  },

  async savedPlaces() {
    const { data } = await customerApi.get<ApiEnvelope<SavedPlace[]>>('/places/saved');
    return data.data;
  },

  async savePlace(body: SavedPlace) {
    const { data } = await customerApi.post<ApiEnvelope<SavedPlace>>('/places/saved', body);
    return data.data;
  },

  async searchPlaces(query: string, origin?: { lat: number; lng: number }) {
    const params = new URLSearchParams({ q: query });
    if (origin) {
      params.set('lat', String(origin.lat));
      params.set('lng', String(origin.lng));
    }
    const { data } = await customerApi.get<ApiEnvelope<PlaceSuggestion[]>>(`/places/search?${params}`);
    return data.data;
  },

  async geocodeAddress(address: string) {
    const { data } = await customerApi.get<ApiEnvelope<Location>>(
      `/places/geocode?q=${encodeURIComponent(address)}`
    );
    return data.data;
  },

  async liveDrivers(lat: number, lng: number, radiusKm = 5) {
    const { data } = await customerApi.get<
      ApiEnvelope<Array<{ driverId: string; lat: number; lng: number; heading?: number }>>
    >(`/drivers/live?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
    return data.data;
  },

  async getDirections(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    const q = new URLSearchParams({
      originLat: String(origin.lat),
      originLng: String(origin.lng),
      destLat: String(destination.lat),
      destLng: String(destination.lng),
    });
    const { data } = await customerApi.get<
      ApiEnvelope<{ points: { lat: number; lng: number }[]; distanceKm: number; durationMin: number | null }>
    >(`/routes/directions?${q}`);
    return data.data;
  },

  async wallet() {
    const { data } = await customerApi.get<ApiEnvelope<Wallet>>('/wallet');
    return data.data;
  },

  async updateProfile(body: { name?: string; phone?: string }) {
    const { data } = await customerApi.patch<ApiEnvelope<unknown>>('/profile', body);
    return data.data;
  },

  async getMessages(rideId: string) {
    const { data } = await customerApi.get<ApiEnvelope<{ items: unknown[] }>>(`/rides/${rideId}/messages`);
    return data.data.items;
  },

  async sendMessage(rideId: string, message: string) {
    const { data } = await customerApi.post<ApiEnvelope<unknown>>(`/rides/${rideId}/messages`, { message });
    return data.data;
  },
};
