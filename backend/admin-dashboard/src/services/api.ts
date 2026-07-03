import axios from 'axios';
import {
  ApiResponse,
  DashboardStats,
  Booking,
  User,
  State,
  Analytics,
  BookingFilters,
  UserFilters,
  BookingUpdateForm,
  StateForm,
  DistrictForm,
  VehicleTypeForm,
  PlanForm,
  District,
  VehicleType,
  Plan
} from '../types';

// Base URL for API
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token if needed
api.interceptors.request.use((config) => {
  // Add auth token here if implementing authentication
  // const token = localStorage.getItem('adminToken');
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Admin API Service
export class AdminAPI {
  // Dashboard endpoints
  static async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<ApiResponse<DashboardStats>>('/admin/dashboard');
    return response.data.data;
  }

 

    // ✅ NEW: Customer Logs API
  static async getCustomerLogs(params?: {
    phoneNumber?: string;
    userId?: string;
    download?: boolean;
  }) {
    const response = await api.get(
      '/admin/customer-logs',
      {
        params
      }
    );

    return response.data;
  }

  static async getAuditTrail(params: {
    bookingId?: string;
    transactionId?: string;
    requestId?: string;
    userId?: string;
    limit?: number;
  }) {
    const response = await api.get('/admin/audit-trail', { params });
    return response.data;
  }

  static async downloadJourneyReportPdf(params: {
    bookingId?: string;
    transactionId?: string;
    userId?: string;
  }): Promise<Blob> {
    const response = await api.get('/admin/audit-trail/report', {
      params,
      responseType: 'blob',
      timeout: 120000,
    });
    return response.data;
  }

  static getJourneyReportPdfUrl(params: {
    bookingId?: string;
    transactionId?: string;
    userId?: string;
  }) {
    const qs = new URLSearchParams();
    if (params.bookingId) qs.set('bookingId', params.bookingId);
    if (params.transactionId) qs.set('transactionId', params.transactionId);
    if (params.userId) qs.set('userId', params.userId);
    return `${BASE_URL}/admin/audit-trail/report?${qs.toString()}`;
  }

  static async getSystemLogs(params?: {
    bookingId?: string;
    transactionId?: string;
    requestId?: string;
    category?: string;
    level?: string;
    limit?: number;
  }) {
    const response = await api.get('/admin/system-logs', { params });
    return response.data;
  }

    static getCustomerLogsUrl(params?: {
    phoneNumber?: string;
    userId?: string;
    download?: boolean;
  }) {
    const query = new URLSearchParams();

    if (params?.phoneNumber) query.append("phoneNumber", params.phoneNumber);
    if (params?.userId) query.append("userId", params.userId);
    if (params?.download) query.append("download", "true");

    return `/api/v1/admin/customer-logs?${query.toString()}`;
  }

  //   static async downloadSingleLogs(params?: {
  //   phoneNumber?: string;
  // }) {
  //   const response = await api.get(
  //     `/admin/customer-logs?phoneNumber=${phoneNumber}&download=true`,
  //     {
  //       params
  //     }
  //   );

  //   return response.data;
  // }

  //   static async downloadallLogs(params?: {

  // }) {
  //   const response = await api.get(
  //     '/admin/customer-logs?download=true',
  //     {
  //       params
  //     }
  //   );

  //   return response.data;
  // }


  static async getAnalytics(period: string = '30d'): Promise<Analytics> {
    const response = await api.get<ApiResponse<Analytics>>(`/admin/analytics?period=${period}`);
    return response.data.data;
  }

  // Booking management endpoints
  static async getAllBookings(filters: BookingFilters = {}): Promise<{
    bookings: Booking[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      // Client-only filters: do not send to backend
      if (key === 'repeat_vehicle_days') return;
      if (value === undefined || value === null) return;

      if (key === 'state_ids' && Array.isArray(value)) {
        if (value.length > 0) params.append('state_ids', value.join(','));
        return;
      }
      // Do not append arrays (except state_ids above) or empty strings
      if (Array.isArray(value) || value === '') return;
      params.append(key, String(value));
    });

    const url = `/admin/bookings?${params}`;
    
    // Debug: Log the URL being called
    console.log('🌐 API URL:', url);
    console.log('📋 Query params:', params.toString());
    
    const response = await api.get<ApiResponse<Booking[]>>(url);
    return {
      bookings: response.data.data,
      pagination: response.data.pagination!,
    };
  }

  static async updateBooking(id: string, updates: BookingUpdateForm): Promise<Booking> {
    const response = await api.put<ApiResponse<Booking>>(`/admin/bookings/${id}`, updates);
    return response.data.data;
  }

  static async bulkReplaceBookingStateReference(sourceStateId: string, targetStateId: string): Promise<{
    matched: number;
    modified: number;
  }> {
    const response = await api.put<ApiResponse<{ matched: number; modified: number }>>(
      '/admin/bookings/bulk/state-reference',
      {
        source_state_id: sourceStateId,
        target_state_id: targetStateId
      }
    );
    return response.data.data;
  }

  static async createBooking(data: {
    user_id: string;
    visiting_state: string;
    vehicle_number: string;
    seat_capacity?: string;
    whatsapp_number?: string;
    entry_border?: string;
    tax_mode: string;
    tax_from_date?: string;
    tax_upto_date?: string;
    amount: number;
    status?: string;
  }): Promise<Booking> {
    const response = await api.post<ApiResponse<Booking>>('/admin/bookings', data);
    return response.data.data;
  }

  // PDF upload for bookings
  static async uploadBookingPdf(bookingId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('tax_slip_pdf', file);
    
    const response = await api.post<ApiResponse<any>>(`/admin/bookings/${bookingId}/upload-pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // Increase timeout for file uploads
    });
    return response.data;
  }

  // PDF download for bookings
  static async downloadBookingPdf(bookingId: string): Promise<Blob> {
    const response = await api.get(`/admin/bookings/${bookingId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // User management endpoints
  static async getAllUsers(filters: UserFilters = {}, timeout: number = 60000): Promise<{
    users: User[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      if (key === 'page' && filters.after_id) return;
      params.append(key, value.toString());
    });

    // Use longer timeout for export operations (60 seconds default)
    const response = await api.get<ApiResponse<User[]>>(`/admin/users?${params}`, {
      timeout: timeout
    });
    return {
      users: response.data.data,
      pagination: response.data.pagination!,
    };
  }

  // State management endpoints
  static async getAllStates(): Promise<State[]> {
    const response = await api.get<ApiResponse<State[]>>('/states/admin');
    return response.data.data;
  }

  static async createState(data: StateForm): Promise<State> {
    const response = await api.post<ApiResponse<State>>('/states', data);
    return response.data.data;
  }

  static async updateState(id: string, data: StateForm): Promise<State> {
    const response = await api.patch<ApiResponse<State>>(`/states/${id}`, data);
    return response.data.data;
  }

  static async toggleState(id: string): Promise<State> {
    const response = await api.patch<ApiResponse<State>>(`/states/${id}/toggle`);
    return response.data.data;
  }

  static async deleteState(id: string): Promise<void> {
    await api.delete<ApiResponse<void>>(`/states/${id}`);
  }

  // District management endpoints
  static async getDistricts(stateId?: string): Promise<District[]> {
    const url = stateId ? `/districts?state_id=${stateId}` : '/districts';
    const response = await api.get<ApiResponse<District[]>>(url);
    return response.data.data;
  }

  static async createDistrict(data: DistrictForm): Promise<District> {
    const response = await api.post<ApiResponse<District>>('/districts', data);
    return response.data.data;
  }

  static async updateDistrict(id: string, data: DistrictForm): Promise<District> {
    const response = await api.patch<ApiResponse<District>>(`/districts/${id}`, data);
    return response.data.data;
  }

  static async toggleDistrict(id: string): Promise<District> {
    const response = await api.patch<ApiResponse<District>>(`/districts/${id}/toggle`);
    return response.data.data;
  }

  // Vehicle Type management endpoints
  static async getVehicleTypes(stateId?: string): Promise<VehicleType[]> {
    const url = stateId ? `/vehicle-types?state_id=${stateId}` : '/vehicle-types';
    const response = await api.get<ApiResponse<VehicleType[]>>(url);
    return response.data.data;
  }

  static async createVehicleType(data: VehicleTypeForm): Promise<VehicleType> {
    const response = await api.post<ApiResponse<VehicleType>>('/vehicle-types', data);
    return response.data.data;
  }

  static async updateVehicleType(id: string, data: VehicleTypeForm): Promise<VehicleType> {
    const response = await api.patch<ApiResponse<VehicleType>>(`/vehicle-types/${id}`, data);
    return response.data.data;
  }

  static async toggleVehicleType(id: string): Promise<VehicleType> {
    const response = await api.patch<ApiResponse<VehicleType>>(`/vehicle-types/${id}/toggle`);
    return response.data.data;
  }

  // Plan management endpoints
  static async getPlanTypes(): Promise<{
    all: string[];
    traditional: string[];
    dayBased: string[];
  }> {
    const response = await api.get<ApiResponse<any>>('/plans/types');
    return response.data.data;
  }

  static async getPlans(vehicleTypeId?: string): Promise<Plan[]> {
    const url = vehicleTypeId ? `/plans?vehicle_type_id=${vehicleTypeId}` : '/plans';
    const response = await api.get<ApiResponse<Plan[]>>(url);
    return response.data.data;
  }

  static async createPlan(data: PlanForm): Promise<Plan> {
    const response = await api.post<ApiResponse<Plan>>('/plans', data);
    return response.data.data;
  }

  static async updatePlan(id: string, data: PlanForm): Promise<Plan> {
    const response = await api.patch<ApiResponse<Plan>>(`/plans/${id}`, data);
    return response.data.data;
  }

  static async togglePlan(id: string): Promise<Plan> {
    const response = await api.patch<ApiResponse<Plan>>(`/plans/${id}/toggle`);
    return response.data.data;
  }

  // WhatsApp Management endpoints
  static async getWhatsAppStatus(): Promise<{
    isConnected: boolean;
    isReady: boolean;
    qrCodeAvailable: boolean;
    lastStatus?: string;
  }> {
    const response = await api.get<ApiResponse<any>>('/whatsapp/status');
    return response.data.data;
  }

  static async reconnectWhatsApp(): Promise<{
    isConnected: boolean;
    isReady: boolean;
  }> {
    const response = await api.post<ApiResponse<any>>('/whatsapp/reconnect');
    return response.data.data;
  }

  static async disconnectWhatsApp(): Promise<{
    isConnected: boolean;
    isReady: boolean;
  }> {
    const response = await api.post<ApiResponse<any>>('/whatsapp/disconnect');
    return response.data.data;
  }

  static async sendTestMessage(phoneNumber: string, message?: string): Promise<{
    phoneNumber: string;
    message: string;
    sent: boolean;
  }> {
    const response = await api.post<ApiResponse<any>>('/whatsapp/test', {
      phoneNumber,
      message
    });
    return response.data.data;
  }

  static async getQRCode(): Promise<{
    qrCode: string | null;
    connected: boolean;
  }> {
    const response = await api.get<ApiResponse<any>>('/whatsapp/qr');
    return response.data.data;
  }

  // Insurance Inquiries
  static async createInsuranceInquiry(data: { vehicle_number: string; phone_number: string }): Promise<any> {
    const response = await api.post<ApiResponse<any>>('/insurance-inquiries', data);
    return response.data.data;
  }

  static async getInsuranceInquiries(filters: { page?: number; limit?: number; search?: string; status?: string; dateFrom?: string; dateTo?: string } = {}): Promise<{ inquiries: any[]; pagination: { total: number; page: number; limit: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.append(key, value.toString());
    });
    const response = await api.get<ApiResponse<any[]>>(`/admin/insurance-inquiries?${params}`);
    return { inquiries: response.data.data, pagination: response.data.pagination! };
  }

  static async updateInsuranceInquiry(id: string, data: { status: 'new' | 'contacted' | 'closed' }): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`/admin/insurance-inquiries/${id}`, data);
    return response.data.data;
  }

  // Cab Bookings (admin)
  static async getCabBookings(filters: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<{ cabBookings: any[]; pagination: { total: number; page: number; limit: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.append(key, value.toString()); });
    const response = await api.get<ApiResponse<any[]>>(`/admin/cab-bookings?${params}`);
    return { cabBookings: response.data.data, pagination: response.data.pagination! };
  }

  static async createCabBooking(data: { from_location: string; to_location: string; start_date: string; trip_type: 'one_way' | 'round_trip'; return_date?: string; notes?: string }): Promise<any> {
    const response = await api.post<ApiResponse<any>>('/admin/cab-bookings', data);
    return response.data.data;
  }

  static async updateCabBooking(id: string, data: { status?: string; assigned_driver_id?: string | null; assigned_driver_phone?: string; notes?: string }): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`/admin/cab-bookings/${id}`, data);
    return response.data.data;
  }

  // App Settings Management endpoints
  static async getAppSettings(): Promise<{
    id: string;
    appStatus: 'online' | 'maintenance';
    isMaintenanceMode: boolean;
    maintenanceMessage: string;
    maintenanceTitle: string;
    estimatedReturnTime?: string;
    lastUpdatedBy?: string;
    lastUpdated: string;
    createdAt: string;
  }> {
    const response = await api.get<ApiResponse<any>>('/admin/app-settings');
    return response.data.data;
  }

  static async toggleAppStatus(data: {
    status: 'online' | 'maintenance';
    maintenanceMessage?: string;
    maintenanceTitle?: string;
    estimatedReturnTime?: string | null;
  }): Promise<{
    id: string;
    appStatus: 'online' | 'maintenance';
    isMaintenanceMode: boolean;
    maintenanceMessage: string;
    maintenanceTitle: string;
    estimatedReturnTime?: string;
    lastUpdatedBy?: string;
    lastUpdated: string;
    createdAt: string;
  }> {
    const response = await api.put<ApiResponse<any>>('/admin/app-settings/toggle', data);
    return response.data.data;
  }

  static async updateMaintenanceMessage(data: {
    maintenanceMessage: string;
    maintenanceTitle: string;
    estimatedReturnTime?: string | null;
  }): Promise<{
    id: string;
    appStatus: 'online' | 'maintenance';
    isMaintenanceMode: boolean;
    maintenanceMessage: string;
    maintenanceTitle: string;
    estimatedReturnTime?: string;
    lastUpdatedBy?: string;
    lastUpdated: string;
    createdAt: string;
  }> {
    const response = await api.put<ApiResponse<any>>('/admin/app-settings/update-maintenance', data);
    return response.data.data;
  }

  // App Version Management
  static async getAppVersions(filters: {
    page?: number;
    limit?: number;
    search?: string;
    platform?: string;
    isActive?: string;
  } = {}): Promise<{
    versions: any[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const response = await api.get<ApiResponse<{
      versions: any[];
      pagination: { total: number; page: number; limit: number; pages: number };
    }>>('/admin/app-versions', { params: filters });
    return response.data.data;
  }

  static async createAppVersion(data: {
    version: string;
    downloadUrl: string;
    releaseNotes?: string;
    isForced?: boolean;
    minSupportedVersion?: string;
    platform?: 'android' | 'ios' | 'both';
  }): Promise<any> {
    const response = await api.post<ApiResponse<any>>('/admin/app-versions', data);
    return response.data.data;
  }

  static async updateAppVersion(id: string, data: {
    version?: string;
    downloadUrl?: string;
    releaseNotes?: string;
    isForced?: boolean;
    minSupportedVersion?: string;
    platform?: 'android' | 'ios' | 'both';
  }): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`/admin/app-versions/${id}`, data);
    return response.data.data;
  }

  static async deleteAppVersion(id: string): Promise<void> {
    await api.delete<ApiResponse<void>>(`/admin/app-versions/${id}`);
  }

  static async toggleAppVersionActive(id: string): Promise<any> {
    const response = await api.put<ApiResponse<any>>(`/admin/app-versions/${id}/toggle-active`);
    return response.data.data;
  }

}

export default AdminAPI; 