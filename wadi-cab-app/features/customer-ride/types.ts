export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginatedApiEnvelope<T> extends ApiEnvelope<T> {
  pagination: PaginationMeta;
}

export interface CustomerUser {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role: 'customer';
  phone?: string;
  avatar?: string;
  status?: string;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: CustomerUser;
}

export interface OtpRequestResponse {
  expiresAt?: string;
  expiresInMinutes?: number;
  resendCooldownSeconds?: number;
  retryAfterSeconds?: number;
  delivery?: string;
  devMode?: boolean;
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface FareBreakdown {
  base: number;
  distance: number;
  time: number;
  surge: number;
  night: number;
  waiting: number;
  toll: number;
  intercity: number;
  discount: number;
  total: number;
}

export interface VehicleType {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  capacity: number;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
}

export interface FareEstimate {
  vehicleId: string;
  vehicleType: VehicleType;
  fare: FareBreakdown;
  etaMin: number;
  nearbyDrivers?: number;
  available?: boolean;
}

export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'OTP_VERIFICATION'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface RideDriver {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  rating?: number;
  vehicle?: {
    registrationNumber?: string;
    vehicleNumber?: string;
    model?: string;
    vehicleType?: string;
    seatCapacity?: number;
  };
}

export interface Ride {
  id: string;
  rideNumber?: string;
  bookingNumber?: string;
  status: RideStatus;
  tripType?: 'local' | 'intercity';
  pickup: Location;
  drop: Location;
  distanceKm?: number;
  durationMin?: number;
  fare?: FareBreakdown;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'paid_by_cash' | 'failed';
  adminCommission?: number;
  vehicleTypeSlug?: string;
  driver?: RideDriver;
  createdAt?: string;
  assignedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelReason?: string;
  cancelledBy?: 'customer' | 'driver' | 'admin' | string;
  rating?: { score: number; review?: string };
}

export interface SavedPlace {
  _id?: string;
  label: 'home' | 'work' | 'other';
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface IntercityPackage {
  _id: string;
  name: string;
  slug: string;
  fromCity: string;
  toCity: string;
  distanceKm: number;
  basePrice: number;
  tripType: string;
  description?: string;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
}

export interface DriverLocationUpdate {
  driverId?: string;
  riderId?: string;
  bookingId?: string;
  coordinates?: { lat: number; lng: number; heading?: number };
  location?: { lat: number; lng: number };
  heading?: number;
}

export interface ChatMessage {
  _id: string;
  rideId: string;
  senderId: string;
  senderRole: 'driver' | 'customer';
  message: string;
  createdAt: string;
}

export interface Wallet {
  _id: string;
  balance: number;
  ownerType: string;
}

export const RIDE_STATUS_LABELS: Record<RideStatus, string> = {
  REQUESTED: 'Requesting ride',
  SEARCHING_DRIVER: 'Finding your driver',
  DRIVER_ASSIGNED: 'Driver accepted your ride',
  DRIVER_ARRIVING: 'Driver is on the way to pickup',
  DRIVER_ARRIVED: 'Driver arrived',
  OTP_VERIFICATION: 'Verify trip OTP',
  TRIP_STARTED: 'Trip in progress',
  TRIP_COMPLETED: 'Trip completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};
