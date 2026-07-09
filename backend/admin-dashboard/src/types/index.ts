// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Dashboard Types
export interface DashboardStats {
  summary: {
    totalUsers: number;
    totalBookings: number;
    totalStates: number;
    recentBookings: number;
    weeklyBookings: number;
    totalRevenue: number;
    averageBookingValue: number;
  };
  bookingStats: {
    total: number;
    pending: number;
    paid: number;
    cancelled: number;
    totalRevenue: number;
  };
  monthlyRevenue: MonthlyRevenue[];
  topStates: TopState[];
  taxModeStats: TaxModeStats[];
  revenueStats: {
    totalRevenue: number;
    averageBookingValue: number;
    count: number;
  };
}

export interface MonthlyRevenue {
  _id: {
    year: number;
    month: number;
  };
  revenue: number;
  bookings: number;
}

export interface TopState {
  _id: string;
  stateName: string;
  bookings: number;
  revenue: number;
}

export interface TaxModeStats {
  _id: string;
  count: number;
  revenue: number;
}

// Booking Types
export interface TaxSlipPdf {
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface Booking {
  _id: string;
  bookingId: string;
  visiting_state_id?: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
  };
  visiting_state?: {
    _id: string;
    name: string;
  };
  vehicle_number: string;
  seat_capacity: string;
  whatsapp_number: string;
  entry_border: string;
  tax_mode: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Day 1' | 'Day 2' | 'Day 3' | 'Day 4' | 'Day 5' | 'Day 6' | 'Day 7' | 'Day 8' | 'Day 9' | 'Day 10' | 'Day 11' | 'Day 12' | 'Day 13' | 'Day 14' | 'Day 15' | 'Day 16' | 'Day 17' | 'Day 18' | 'Day 19' | 'Day 20';
  tax_from_date: string;
  tax_upto_date: string;
  amount: number;
  processed_by_admin?: boolean;
  status: 'pending' | 'paid' | 'cancelled';
  tax_slip_pdf?: TaxSlipPdf;
  payment_details: {
    transaction_id?: string;
    payment_method?: string;
    paid_at?: string;
    payment_reference?: string;
    failure_reason?: string;
    /** Cashfree cf_payment_id */
    payment_transaction_id?: string | null;
    /** Cashfree bank_reference / UTR */
    bank_reference?: string | null;
    /** Cashfree cf_order_id */
    cashfree_order_id?: string | null;
  };
  validity: {
    valid_from?: string;
    valid_until?: string;
    is_expired: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// User Types
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  isVerified: boolean;
  bookingCount: number;
  totalSpent: number;
  fcmToken?: string;
  appVersion?: string;
  platform?: 'android' | 'ios' | 'web';
  lastVersionUpdate?: string;
  createdAt: string;
  updatedAt: string;
}

// State Types
export interface State {
  _id: string;
  name: string;
  statecode?: string;
  displayOrder?: number;
  is_active: boolean;
  defaultEntryDistrict?: {
    _id: string;
    name: string;
  } | null;
  bookingCount: number;
  districtCount: number;
  vehicleTypeCount: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface District {
  _id: string;
  name: string;
  state_id: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleType {
  _id: string;
  name: string;
  state_id: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Plan {
  _id: string;
  vehicle_type_id: any;
  plan_type: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Day 1' | 'Day 2' | 'Day 3' | 'Day 4' | 'Day 5' | 'Day 6' | 'Day 7' | 'Day 8' | 'Day 9' | 'Day 10' | 'Day 11' | 'Day 12' | 'Day 13' | 'Day 14' | 'Day 15' | 'Day 16' | 'Day 17' | 'Day 18' | 'Day 19' | 'Day 20';
  amount: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}


// Analytics Types
export interface Analytics {
  period: string;
  dailyTrend: DailyTrend[];
  rushHourStats: RushHourStat[];
  dayWiseHourStats: DayWiseHourStat[];
  stateWiseStats: StateWiseStat[];
  bookingCompletionTime: BookingCompletionTime;
  vehicleTypeStats: VehicleTypeStats[];
  taxModeStats: TaxModeStat[];
  userAcquisition: UserAcquisition[];
  conversionRate: ConversionRate;
  revenueTrend: RevenueTrend[];
  topStatesByRevenue: TopStateByRevenue[];
  processingStats: ProcessingStats;
}

export interface DailyTrend {
  _id: {
    date: string;
  };
  bookings: number;
  revenue: number;
}

export interface RushHourStat {
  hour: number;
  hourLabel: string;
  bookings: number;
  revenue: number;
}

export interface DayWiseHourStat {
  day: number;
  dayName: string;
  hours: {
    hour: number;
    hourLabel: string;
    bookings: number;
    revenue: number;
  }[];
}

export interface StateWiseStat {
  _id: string;
  stateName: string;
  bookings: number;
  revenue: number;
  paidBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  averageAmount: number;
}

export interface BookingCompletionTime {
  averageHours: number;
  minHours: number;
  maxHours: number;
  totalProcessed: number;
  completionTimeByDay: CompletionTimeByDay[];
}

export interface CompletionTimeByDay {
  day: number;
  dayName: string;
  averageHours: number;
  bookings: number;
}

export interface TaxModeStat {
  _id: string;
  count: number;
  revenue: number;
}

export interface ConversionRate {
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  conversionPercentage: number;
}

export interface RevenueTrend {
  _id: {
    date: string;
  };
  revenue: number;
  bookings: number;
  averageAmount: number;
}

export interface TopStateByRevenue {
  _id: string;
  stateName: string;
  revenue: number;
  bookings: number;
}

export interface ProcessingStats {
  processed: number;
  unprocessed: number;
  processedRevenue: number;
  unprocessedRevenue: number;
}

export interface VehicleTypeStats {
  _id: string;
  count: number;
  revenue: number;
}

export interface UserAcquisition {
  _id: {
    date: string;
  };
  newUsers: number;
}

// Filter Types
export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  processed?: string;
  state_id?: string;
  state_ids?: string[]; // Support for multiple state selections
  user_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  date_on?: 'createdAt' | 'tax';
  tax_mode?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  /**
   * Minimum number of consecutive days the same vehicle (by vehicle_number)
   * must appear in the same state for it to be shown in the UI.
   * This is a purely client-side filter and is NOT sent to the backend.
   * Example: 2 => show vehicles that have bookings on 2 or more back-to-back days.
   */
  repeat_vehicle_days?: number;
  /** Cashfree cf_payment_id (gateway payment transaction ID) */
  payment_transaction_id?: string;
  /** Cashfree bank_reference / UTR */
  bank_reference?: string;
  /** Cashfree cf_order_id */
  cashfree_order_id?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
  min_bookings?: number;
  /** Cursor continuation (stable sort on sort_by + _id). Omit page when set. */
  after_id?: string;
  after_sort_value?: string;
}

// Form Types
export interface BookingUpdateForm {
  status?: 'pending' | 'paid' | 'cancelled';
  amount?: number;
  tax_mode?: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Day 1' | 'Day 2' | 'Day 3' | 'Day 4' | 'Day 5' | 'Day 6' | 'Day 7' | 'Day 8' | 'Day 9' | 'Day 10' | 'Day 11' | 'Day 12' | 'Day 13' | 'Day 14' | 'Day 15' | 'Day 16' | 'Day 17' | 'Day 18' | 'Day 19' | 'Day 20';
  tax_from_date?: string;
  tax_upto_date?: string;
  visiting_state?: string;
  processed_by_admin?: boolean;
  'payment_details.payment_method'?: string;
  'payment_details.transaction_id'?: string;
}

export interface StateForm {
  name: string;
  statecode?: string;
  displayOrder?: number;
  is_active: boolean;
  defaultEntryDistrict?: string | null;
}

export interface DistrictForm {
  name: string;
  state_id: string;
  is_active: boolean;
}

export interface VehicleTypeForm {
  name: string;
  state_id: string;
  is_active: boolean;
}

export interface PlanForm {
  vehicle_type_id: any;
  plan_type: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'Day 1' | 'Day 2' | 'Day 3' | 'Day 4' | 'Day 5' | 'Day 6' | 'Day 7' | 'Day 8' | 'Day 9' | 'Day 10' | 'Day 11' | 'Day 12' | 'Day 13' | 'Day 14' | 'Day 15' | 'Day 16' | 'Day 17' | 'Day 18' | 'Day 19' | 'Day 20';
  amount: number;
  is_active: boolean;
} 

// Insurance Inquiry Types
export interface InsuranceInquiry {
  _id: string;
  vehicle_number: string;
  phone_number: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CabBooking {
  _id: string;
  from_location: string;
  to_location: string;
  start_date: string;
  trip_type: 'one_way' | 'round_trip';
  return_date?: string;
  status: 'unassigned' | 'assigned' | 'closed';
  assigned_driver_id?: string | null;
  assigned_driver_phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}