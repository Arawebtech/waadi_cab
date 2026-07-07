export interface ApiResponse<T = unknown> {
  success: boolean;
  status?: number;
  message: string;
  data: T;
}

export type VerificationStatus =
  | 'pending_kyc'
  | 'kyc_submitted'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type SubscriptionStatus = 'none' | 'active' | 'expired';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  fullName?: string | null;
  role: string;
  phone?: string | null;
  phoneSecondary?: string | null;
  avatar?: string | null;
  darkMode?: boolean;
  referralCode?: string;
  verificationStatus?: VerificationStatus;
  kycCompleted?: boolean;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiryDate?: string | null;
  canGoOnline?: boolean;
  rejectReason?: string | null;
  termsAccepted?: {
    terms?: boolean;
    privacy?: boolean;
    commission?: boolean;
    acceptedAt?: string;
  };
  rating?: number;
  totalRides?: number;
  totalEarnings?: number;
  isOnline?: boolean;
  isAvailable?: boolean;
  status?: string;
  profileCompletion?: {
    basicProfile?: boolean;
    documents?: string;
    vehicle?: string;
    bank?: string;
    subscription?: string;
    percent?: number;
  };
}

export type KycDocType =
  | 'aadhaar_front'
  | 'aadhaar_back'
  | 'pan'
  | 'license_front'
  | 'license_back'
  | 'selfie'
  | 'rc_front'
  | 'rc_back'
  | 'insurance'
  | 'pollution';

export interface KycDocument {
  _id?: string;
  docType: KycDocType;
  secure_url: string;
  status?: 'pending' | 'approved' | 'rejected';
  uploadedAt?: string;
}

export interface KycPersonalInfo {
  fullName?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  phoneSecondary?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
}

export interface KycVehicleInfo {
  vehicleTypeId: string;
  brand: string;
  model: string;
  color?: string;
  plateNumber: string;
  year?: number;
}

export interface KycStatus {
  rider?: KycPersonalInfo & {
    verificationStatus?: VerificationStatus;
    rejectReason?: string;
    termsAccepted?: User['termsAccepted'];
    vehicleId?: Vehicle;
  };
  documents: KycDocument[];
  missingDocs: KycDocType[];
  missingFields: string[];
  kycComplete: boolean;
  verificationStatus?: VerificationStatus;
}

export interface SubscriptionPlan {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  durationDays: number;
  amount: number;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface Subscription {
  _id: string;
  id?: string;
  planId: string;
  planName: string;
  durationDays: number;
  amount: number;
  startDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'cancelled';
  paymentStatus?: string;
  transactionId?: string;
}

export interface CurrentSubscriptionResponse {
  subscription: Subscription | null;
  rider: User;
}

export interface SubscriptionHistoryEntry {
  _id: string;
  planName: string;
  amount: number;
  action: 'purchase' | 'renew' | 'expire' | 'cancel';
  transactionId?: string;
  startDate?: string;
  expiryDate?: string;
  createdAt?: string;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: User;
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
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  icon?: string;
  capacity: number;
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
  isIntercity?: boolean;
}

export interface CustomerInfo {
  id?: string;
  _id?: string;
  name?: string;
  phone?: string;
  avatar?: string;
}

export interface Booking {
  id?: string;
  _id?: string;
  bookingNumber: string;
  status: BookingStatus;
  tripType: 'local' | 'intercity';
  intercityType?: string;
  pickup: Location;
  drop: Location;
  stops?: Location[];
  distanceKm?: number;
  durationMin?: number;
  fare: FareBreakdown;
  paymentMethod: string;
  paymentStatus: string;
  scheduledAt?: string;
  searchExpiresAt?: string;
  vehicleType?: VehicleType;
  vehicleTypeId?: string | VehicleType;
  customerId?: string | CustomerInfo;
  customer?: CustomerInfo;
  driverId?: string;
  createdAt?: string;
  driverAssignedAt?: string;
  driverArrivedAt?: string;
  tripStartedAt?: string;
  tripCompletedAt?: string;
}

export type BookingStatus =
  | 'REQUESTED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'OTP_VERIFICATION'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'CANCELLED';

export interface DriverDocument {
  license?: { url?: string; status?: string };
  aadhar?: { url?: string; status?: string };
  pan?: { url?: string; status?: string };
}

export interface BankDetails {
  accountName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
}

export interface Vehicle {
  id?: string;
  _id?: string;
  make: string;
  brand?: string;
  model: string;
  color?: string;
  plateNumber: string;
  year?: number;
  vehicleTypeId?: string | VehicleType;
}

export interface DriverProfile {
  id?: string;
  _id?: string;
  userId: User | string;
  isOnline: boolean;
  isAvailable: boolean;
  rating: number;
  totalRides: number;
  totalEarnings: number;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'approved' | string;
  documents: DriverDocument;
  bankDetails: BankDetails;
  vehicleId?: Vehicle | string;
  incentives?: number;
}

export interface DriverProfileResponse {
  rider: DriverProfile & {
    fullName?: string;
    email?: string;
    phone?: string;
    status?: string;
  };
  driverLocation?: {
    isOnline?: boolean;
    isAvailable?: boolean;
    lastSeen?: string;
  };
  kyc?: { documents?: DriverDocument; missingDocs?: string[] };
  subscription?: { subscriptionStatus?: string; subscriptionExpiryDate?: string };
  vehicle?: Vehicle | null;
  bank?: BankDetails | null;
  canGoOnline?: boolean;
  canReceiveRides?: boolean;
  profileCompletion?: Record<string, unknown>;
}

export interface DriverEarnings {
  period: 'today' | 'week' | 'month';
  total: number;
  rides: number;
  incentives: number;
  performance: {
    rating: number;
    totalRides: number;
    acceptanceRate: number;
  };
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  heading?: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
  heading?: number;
  type?: 'pickup' | 'drop' | 'driver' | 'default';
}

export interface MapPolyline {
  id: string;
  coordinates: { latitude: number; longitude: number }[];
  color?: string;
  width?: number;
}

export interface MapViewProps {
  region?: MapRegion;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  style?: object;
  showsUserLocation?: boolean;
  mapPadding?: { top?: number; right?: number; bottom?: number; left?: number };
  fitToCoordinates?: boolean;
  showRecenter?: boolean;
  onRecenter?: () => void;
}

export interface BookingStatusUpdate {
  status: BookingStatus;
  booking: Booking;
}

export interface BookingRequestEvent extends Booking {}

export interface DriverLocationUpdate {
  bookingId: string;
  coordinates: { lat: number; lng: number; heading?: number };
}
