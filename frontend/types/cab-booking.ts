export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export type AvailabilityStatus = 'offline' | 'available' | 'busy' | 'on_trip';

export interface VehicleDocumentSummary {
  docType: string;
  status: 'not_uploaded' | 'pending' | 'approved' | 'rejected';
  url: string | null;
  rejectionReason?: string | null;
  uploadedAt?: string | null;
}

export interface CabDriverProfile {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
    userType: string;
    isPhoneVerified: boolean;
    isVerified: boolean;
    isActive?: boolean;
    profile?: {
      address?: Record<string, string>;
      emergencyContact?: Record<string, string>;
    };
    cabBooking?: {
      registrationStep?: number;
      profileVerificationStatus?: VerificationStatus;
      activeVehicleId?: string;
    };
  };
  vehicles: import('@/types/vehicle').Vehicle[];
  vehicleDocuments: VehicleDocumentSummary[];
  subscription: import('@/types/subscription').Subscription | null;
  location: DriverLocation | null;
  activeVehicle: import('@/types/vehicle').Vehicle | null;
}

export interface VerificationSummary {
  checks: {
    profile: { status: VerificationStatus; complete: boolean };
    vehicle: {
      status: VerificationStatus;
      complete: boolean;
      vehicleId?: string | null;
      vehicleNumber?: string | null;
    };
    vehicleDocuments: {
      status: VerificationStatus | 'not_uploaded';
      complete: boolean;
      items: VehicleDocumentSummary[];
    };
    subscription: { status: VerificationStatus; complete: boolean; expiryDate?: string | null };
  };
  percent: number;
  canGoOnline: boolean;
  blockReasons?: string[];
  registrationStep: number;
}

export interface DriverLocation {
  isOnline: boolean;
  isAvailable: boolean;
  vehicleId?: string | null;
  heading?: number;
  speed?: number;
  lastSeen?: string;
  location?: { coordinates: [number, number] };
  bookingId?: string | null;
}

export interface DriverLocationStatus {
  location: DriverLocation | null;
  availabilityStatus: 'offline' | 'available' | 'busy' | 'on_trip';
  activeRide: CabRideRequest | null;
}

export interface CabRideRequest {
  _id: string;
  rideNumber: string;
  customerName?: string;
  customerPhone?: string;
  pickup: { address: string; lat: number; lng: number };
  drop: { address: string; lat: number; lng: number };
  fare: { total: number; base?: number; distance?: number };
  distanceKm: number;
  durationMin: number;
  status: string;
  paymentMethod?: 'cash' | 'upi' | 'wallet' | 'card';
  paymentStatus?: 'pending' | 'paid' | 'paid_by_cash' | 'failed';
  searchExpiresAt?: string;
  tripOtp?: string | null;
  driverEarnings?: number;
}

export interface DriverDashboard {
  stats: {
    todayTrips: number;
    weekTrips: number;
    monthTrips: number;
    totalTrips: number;
    cancelledTrips: number;
    acceptanceRate: number;
    cancellationRate: number;
    rating: number;
  };
  earnings: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
  wallet: {
    balance: number;
    currency: string;
  };
}

export interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit';
  purpose?: string;
  amount: number;
  balanceAfter?: number;
  remark?: string;
  createdAt: string;
}

export const REGISTRATION_STEPS = [
  { id: 1, label: 'Profile' },
  { id: 2, label: 'Vehicle' },
  { id: 3, label: 'Subscription' },
  { id: 4, label: 'Go Online' },
] as const;

export const VEHICLE_DOC_LABELS: Record<string, string> = {
  rc: 'Registration Certificate (RC)',
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  insurance: 'Insurance',
  puc: 'Pollution Certificate (PUC)',
  license: 'Driving Licence',
};
