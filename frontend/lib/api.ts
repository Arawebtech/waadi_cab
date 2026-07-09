import { base_url } from '../environment.js'
import { Capacitor } from '@capacitor/core'
import appLogger, { getCorrelationIds } from './logger'

// Types for API responses
export interface SignupRequest {
  firstName: string
  lastName: string
  phoneNumber: string
  userType: string
}

export interface SignupResponse {
  success: boolean
  message: string
  data: {
    phoneNumber: string
    verificationId: string
    expiresAt: string
    step: string
  }
}

export interface LoginRequest {
  phoneNumber: string
}

export interface LoginResponse {
  success: boolean
  message: string
  data: {
    phoneNumber: string
    verificationId: string
    expiresAt: string
    step: string
  }
}

export interface VerifyLoginRequest {
  phoneNumber: string
  otp: string
  verificationId: string
  fcmToken?: string
}

export interface VerifyLoginResponse {
  success: boolean
  message: string
  data: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
      tokenType: string
      expiresIn: string
    }
  }
}

export interface ResendOTPRequest {
  phoneNumber: string
  purpose: "signup" | "login" | "reset-password"
}

export interface ResendOTPResponse {
  success: boolean
  message: string
  data: {
    phoneNumber: string
    verificationId: string
    expiresAt: string
  }
}

export interface VerifySignupRequest {
  phoneNumber: string
  otp: string
  verificationId: string
  firstName: string
  lastName: string
  userType: string
  fcmToken?: string
}

export interface User {
  firstName: string
  lastName: string
  phoneNumber: string
  userType: string
  isPhoneVerified: boolean
  isEmailVerified: boolean
  preferences: {
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
    }
    language: string
  }
  isActive: boolean
  _id: string
  vehicles: any[]
  createdAt: string
  updatedAt: string
  __v: number
  lastLogin: string
}

export interface VerifySignupResponse {
  success: boolean
  message: string
  data: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
      tokenType: string
      expiresIn: string
    }
  }
}

// Dashboard API types
export interface DashboardSummary {
  totalActivePasses: number
  totalSpent: number
  totalSpentFormatted: string
  expiringSoonCount: number
}

export interface ActivePass {
  id: string
  state: string
  amount: number
  passType: string
  vehicleType: string
  vehicleInfo?: string
  status: string
  expiresAt?: string
  validUpto?: string
  validUntil?: string
  createdAt: string
}

export interface RecentActivity {
  id: string
  bookingId: string
  type: string
  description: string
  state: string
  amount: number
  status: string
  timestamp: string
  timeAgo: string
  tax_slip_pdf?: TaxSlipPdf
}

export interface DashboardUser {
  name: string
  phoneNumber: string
  greeting: string
}

export interface DashboardResponse {
  success: boolean
  message: string
  data: {
    summary: DashboardSummary
    activePasses: ActivePass[]
    recentActivity: RecentActivity[]
    user: DashboardUser
  }
}

// Profile API types
export interface ProfileUser {
  _id: string
  firstName: string
  lastName: string
  phoneNumber: string
  userType: string
  isPhoneVerified: boolean
  isEmailVerified: boolean
  isActive: boolean
  vehicles: any[]
  createdAt: string
  updatedAt: string
  __v: number
  lastLogin: string
  preferences: {
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
    }
    language: string
  }
}

export interface ProfileResponse {
  success: boolean
  message: string
  data: {
    user: ProfileUser
  }
}

export interface ApiError {
  success: false
  message: string
  error?: any
}

// Storage keys for Capacitor compatibility
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'wadi_cab_access_token',
  REFRESH_TOKEN: 'wadi_cab_refresh_token',
  USER_DATA: 'wadi_cab_user_data',
  VERIFICATION_DATA: 'wadi_cab_verification_data'
}

// Global 401 handler function
let globalLogoutHandler: (() => void) | null = null

export const setGlobalLogoutHandler = (handler: () => void) => {
  globalLogoutHandler = handler
}

// Track if we're currently refreshing to prevent infinite loops
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

// Automatically refresh token on 401 errors
async function refreshTokenIfNeeded(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return await refreshPromise
  }

  // If no refresh token, can't refresh
  const refreshToken = tokenManager.getRefreshToken()
  if (!refreshToken) {
    console.warn('⚠️ No refresh token available, cannot refresh')
    return false
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      console.log('🔄 Attempting to refresh access token...')
      const result = await authAPI.refreshToken(refreshToken)
      
      if (result.success && 'data' in result && result.data.accessToken) {
        // Update access token in storage
        tokenManager.setAccessToken(result.data.accessToken)
        console.log('✅ Token refreshed successfully')
        return true
      } else {
        console.warn('❌ Token refresh failed:', result)
        // If refresh fails, logout user
        if (globalLogoutHandler) {
          console.log('🚪 Logging out due to failed token refresh')
          globalLogoutHandler()
        }
        return false
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error)
      // If refresh fails, logout user
      if (globalLogoutHandler) {
        console.log('🚪 Logging out due to token refresh error')
        globalLogoutHandler()
      }
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return await refreshPromise
}

// Handle 401 error globally - try to refresh token automatically
const handle401Error = async (): Promise<boolean> => {
  // 401 Unauthorized: Token expired or invalid - try to refresh
  console.warn('⚠️ Received 401 error, attempting to refresh token...')
  return await refreshTokenIfNeeded()
}

// Custom fetch wrapper that handles 401 errors with automatic token refresh
export const authenticatedFetch = async (url: string, options: RequestInit = {}, retryOn401: boolean = true): Promise<Response> => {
  const start = performance.now()
  const correlation = getCorrelationIds()
  appLogger.api('API request started', {
    sourceFile: 'api.ts',
    sourceFunction: 'authenticatedFetch',
    data: { url, method: options.method || 'GET' },
    requestId: correlation.requestId,
  })

  // Get current access token
  let accessToken = tokenManager.getAccessToken()
  
  // Add authorization header if we have a token
  const headers = new Headers(options.headers)
  if (accessToken && !url.includes('/auth/')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    headers.set('X-Platform', 'app')
  }
  
  const config: RequestInit = {
    ...options,
    headers: headers
  }
  
  let response = await fetch(url, config)
  
  // Handle 401 errors - try to refresh token and retry
  if (response.status === 401 && retryOn401 && !url.includes('/auth/')) {
    console.log('🔄 authenticatedFetch got 401, attempting token refresh...')
    const refreshSuccess = await handle401Error()
    
    if (refreshSuccess) {
      // Retry the request with new token
      const newAccessToken = tokenManager.getAccessToken()
      if (newAccessToken) {
        const retryHeaders = new Headers(options.headers)
        retryHeaders.set('Authorization', `Bearer ${newAccessToken}`)
        if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
          retryHeaders.set('X-Platform', 'app')
        }
        
        const retryConfig: RequestInit = {
          ...options,
          headers: retryHeaders
        }
        
        console.log('🔄 Retrying authenticatedFetch with refreshed token...')
        response = await fetch(url, retryConfig)
        
        if (response.ok) {
          console.log('✅ authenticatedFetch succeeded after token refresh')
        }
      }
    }
  }

  appLogger.api('API request completed', {
    sourceFile: 'api.ts',
    sourceFunction: 'authenticatedFetch',
    data: { url, status: response.status, durationMs: Math.round(performance.now() - start) },
    requestId: correlation.requestId,
  })

  return response
}

// HTTP utility function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOn401: boolean = true
): Promise<T | ApiError> {
  const start = performance.now()
  appLogger.api('API request started', {
    sourceFile: 'api.ts',
    sourceFunction: 'apiRequest',
    data: { endpoint, method: options.method || 'GET' },
  })

  try {
    const url = `${base_url}${endpoint}`

    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      console.log('[Waadi API]', options.method || 'GET', url, 'origin:', window.location.origin)
    }
    
    // Skip token refresh for auth endpoints
    const isAuthEndpoint = endpoint.startsWith('/auth/') && 
      (endpoint.includes('/login') || 
       endpoint.includes('/signup') || 
       endpoint.includes('/verify-') || 
       endpoint.includes('/resend-otp') ||
       endpoint.includes('/refresh-token'))
    
    // Get token (no expiration checks - user stays logged in)
    let accessToken = tokenManager.getAccessToken()
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      defaultHeaders['X-Platform'] = 'app'
    }

    // Add authorization header if we have a token
    if (accessToken && !isAuthEndpoint) {
      defaultHeaders['Authorization'] = `Bearer ${accessToken}`
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      // Handle 401 Unauthorized errors - try to refresh token and retry
      if (response.status === 401 && !isAuthEndpoint && retryOn401) {
        console.log('🔄 Got 401, attempting token refresh and retry...')
        const refreshSuccess = await handle401Error()
        
        if (refreshSuccess) {
          // Retry the request with new token
          const newAccessToken = tokenManager.getAccessToken()
          if (newAccessToken) {
            const retryConfig: RequestInit = {
              ...options,
              headers: {
                ...defaultHeaders,
                'Authorization': `Bearer ${newAccessToken}`,
                ...options.headers,
              },
            }
            
            console.log('🔄 Retrying request with refreshed token...')
            const retryResponse = await fetch(url, retryConfig)
            const retryData = await retryResponse.json()
            
            if (retryResponse.ok) {
              console.log('✅ Request succeeded after token refresh')
              return retryData as T
            } else {
              // Even after refresh, request failed
              return {
                success: false,
                message: retryData.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`,
                error: retryData
              }
            }
          }
        }
        
        // Refresh failed or no new token - return error
        return {
          success: false,
          message: data.message || 'Unauthorized. Please try again.',
          error: { ...data, isAuthError: true }
        }
      }

      return {
        success: false,
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        error: data
      }
    }

    return data as T
  } catch (error) {
    const url = `${base_url}${endpoint}`
    console.error('[Waadi API] Network error:', {
      url,
      endpoint,
      origin: typeof window !== 'undefined' ? window.location.origin : 'ssr',
      error,
    })
    appLogger.network('API network error', {
      sourceFile: 'api.ts',
      sourceFunction: 'apiRequest',
      data: { endpoint, url, durationMs: Math.round(performance.now() - start) },
    })
    // API Request Error
    return {
      success: false,
      message: 'Network error. Please check your internet connection.',
      error
    }
  }
}

// Auth API functions
export const authAPI = {
  // Signup API call
  async signup(userData: SignupRequest): Promise<SignupResponse | ApiError> {
    const result = await apiRequest<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    
    // Store verification data for OTP step
    if (result.success) {
      localStorage.setItem(STORAGE_KEYS.VERIFICATION_DATA, JSON.stringify({
        verificationId: result.data.verificationId,
        phoneNumber: result.data.phoneNumber,
        expiresAt: result.data.expiresAt,
        userData,
        purpose: 'signup'
      }))
    }
    
    return result
  },

  // Login API call
  async login(userData: LoginRequest): Promise<LoginResponse | ApiError> {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    
    // Store verification data for OTP step
    if (result.success) {
      localStorage.setItem(STORAGE_KEYS.VERIFICATION_DATA, JSON.stringify({
        verificationId: result.data.verificationId,
        phoneNumber: result.data.phoneNumber,
        expiresAt: result.data.expiresAt,
        purpose: 'login'
      }))
    }
    
    return result
  },

  // Resend OTP API call
  async resendOTP(request: ResendOTPRequest): Promise<ResendOTPResponse | ApiError> {
    const result = await apiRequest<ResendOTPResponse>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    // Update verification data with new verificationId and expiresAt
    if (result.success) {
      const verificationData = tokenManager.getVerificationData()
      if (verificationData) {
        localStorage.setItem(STORAGE_KEYS.VERIFICATION_DATA, JSON.stringify({
          ...verificationData,
          verificationId: result.data.verificationId,
          expiresAt: result.data.expiresAt,
        }))
      }
    }

    return result
  },

  // Verify signup API call
  async verifySignup(verifyData: VerifySignupRequest): Promise<VerifySignupResponse | ApiError> {
    const result = await apiRequest<VerifySignupResponse>('/auth/verify-signup', {
      method: 'POST',
      body: JSON.stringify(verifyData),
    })
    
    // Store tokens and user data on successful verification
    if (result.success) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.data.tokens.accessToken)
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.data.tokens.refreshToken)
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.data.user))
      
      // Clear verification data
      localStorage.removeItem(STORAGE_KEYS.VERIFICATION_DATA)
      localStorage.removeItem('signupData') // Legacy cleanup
    }
    
    return result
  },

  // Verify login API call
  async verifyLogin(verifyData: VerifyLoginRequest): Promise<VerifyLoginResponse | ApiError> {
    const result = await apiRequest<VerifyLoginResponse>('/auth/verify-login', {
      method: 'POST',
      body: JSON.stringify(verifyData),
    })
    
    // Store tokens and user data on successful verification
    if (result.success) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.data.tokens.accessToken)
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.data.tokens.refreshToken)
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(result.data.user))
      
      // Clear verification data
      localStorage.removeItem(STORAGE_KEYS.VERIFICATION_DATA)
    }
    
    return result
  },

  // Refresh token API call
  async refreshToken(refreshTokenValue: string): Promise<{ success: boolean; data: { accessToken: string } } | ApiError> {
    return await apiRequest<{ success: boolean; data: { accessToken: string } }>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    })
  },

  async logout(): Promise<{ success: boolean; message?: string } | ApiError> {
    const refreshToken = tokenManager.getRefreshToken()
    const accessToken = tokenManager.getAccessToken()
    if (!accessToken) {
      return { success: true, message: 'Already logged out' }
    }
    return await apiRequest<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    })
  },
}

// Dashboard API functions
export const dashboardAPI = {
  async fetchDashboard(): Promise<DashboardResponse | ApiError> {
    const accessToken = tokenManager.getAccessToken()
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Authentication required. Please login again.',
        error: 'No access token found'
      }
    }

    const result = await apiRequest<DashboardResponse>('/users/fetch-dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    return result
  }
}

// Profile API functions
export const profileAPI = {
  async getProfile(): Promise<ProfileResponse | ApiError> {
    const accessToken = tokenManager.getAccessToken()
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Authentication required. Please login again.',
        error: 'No access token found'
      }
    }

    const result = await apiRequest<ProfileResponse>('/users/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    return result
  }
}

// Border Tax API types
export interface State {
  _id: string
  name: string
  statecode?: string
  is_active: boolean
  displayOrder?: number
  defaultEntryDistrict?: {
    _id: string
    name: string
  } | null
}

export interface VehicleType {
  _id: string
  name: string
  state_id: {
    _id: string
    name: string
  }
  is_active: boolean
}

export interface District {
  _id: string
  name: string
  state_id: {
    _id: string
    name: string
  }
  is_active: boolean
}

export interface Plan {
  _id: string
  vehicle_type_id: {
    _id: string
    name: string
    state_id: {
      _id: string
      name: string
    }
  }
  plan_type: string
  amount: number
  is_active: boolean
}

export interface StatesResponse {
  success: boolean
  message: string
  data: State[]
  total: number
}

export interface VehicleTypesResponse {
  success: boolean
  message: string
  data: VehicleType[]
  total: number
}

export interface DistrictsResponse {
  success: boolean
  message: string
  data: District[]
  total: number
}

export interface PlansResponse {
  success: boolean
  message: string
  data: Plan[]
  total: number
}

// Version Tracking API types
export interface VersionTrackingRequest {
  userId: string
  appVersion: string
  platform?: 'android' | 'ios' | 'web'
}

export interface VersionTrackingResponse {
  success: boolean
  message: string
  data?: {
    userId: string
    appVersion: string
    platform: string
    lastVersionUpdate: string
  }
}

export interface VersionStatsResponse {
  success: boolean
  data?: {
    versionStats: Array<{
      _id: string
      count: number
      platforms: string[]
    }>
    platformStats: Array<{
      _id: string
      count: number
    }>
    totalUsers: number
    totalUsersWithVersion: number
    coverage: string
  }
}

// Border Tax API functions
export const borderTaxAPI = {
  async getStates(): Promise<StatesResponse | ApiError> {
    const result = await apiRequest<StatesResponse>('/states/admin', {
      method: 'GET',
    })
    
    return result
  },

  async getVehicleTypes(stateId: string): Promise<VehicleTypesResponse | ApiError> {
    const result = await apiRequest<VehicleTypesResponse>(`/vehicle-types?state_id=${stateId}`, {
      method: 'GET',
    })
    
    return result
  },

  async getDistricts(stateId: string): Promise<DistrictsResponse | ApiError> {
    const result = await apiRequest<DistrictsResponse>(`/districts?state_id=${stateId}`, {
      method: 'GET',
    })
    
    return result
  },

  async getPlans(vehicleTypeId: string): Promise<PlansResponse | ApiError> {
    const result = await apiRequest<PlansResponse>(`/plans?vehicle_type_id=${vehicleTypeId}`, {
      method: 'GET',
    })
    
    return result
  },

  async createBooking(bookingData: any): Promise<BookingResponse | ApiError> {
    const accessToken = tokenManager.getAccessToken()
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Authentication required. Please login again.',
        error: 'No access token found'
      }
    }

    const result = await apiRequest<BookingResponse>('/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(bookingData),
    })
    
    return result
  }
}

// Booking API types
export interface BookingRequest {
  visiting_state: string
  vehicle_number: string
  seat_capacity: string
  whatsapp_number: string
  entry_border: string
  tax_mode: string
  tax_from_date: string
  tax_upto_date: string
  amount: number
}

export interface BookingUser {
  _id: string
  firstName: string
  lastName: string
  phoneNumber: string
}

export interface BookingState {
  _id: string
  name: string
}

export interface PaymentDetails {
  transaction_id: string
}

export interface BookingValidity {
  is_expired: boolean
  valid_from: string
  valid_until: string
}

export interface TaxSlipPdf {
  filename: string
  original_name: string
  file_path: string
  file_size: number
  uploaded_at: string
  uploaded_by?: string
}

export interface Booking {
  user: BookingUser
  visiting_state: BookingState
  vehicle_number: string
  seat_capacity: string
  whatsapp_number: string
  entry_border: string
  tax_mode: string
  tax_from_date: string
  tax_upto_date: string
  amount: number
  status: string
  payment_details: PaymentDetails
  validity: BookingValidity
  tax_slip_pdf?: TaxSlipPdf
  _id: string
  createdAt: string
  updatedAt: string
  bookingId: string
  __v: number
}

export interface PaymentData {
  key: string
  txnid: string
  amount: string
  productinfo: string
  firstname: string
  email: string
  phone: string
  udf1: string
  udf2: string
  udf3: string
  udf4: string
  udf5: string
  udf6: string
  udf7: string
  udf8: string
  udf9: string
  udf10: string
  hash: string
  surl: string
  furl: string
  service_provider: string
  curl: string
  pg: string
}

export interface PayUPaymentPayload {
  gateway: 'payu'
  paymentUrl: string
  paymentData: PaymentData
  message: string
}

export interface CashfreePaymentPayload {
  gateway: 'cashfree'
  paymentUrl: string
  paymentData: {
    payment_session_id: string
    mode: string
    txnid: string
    amount?: string
    platform?: string
    /** @deprecated legacy field — use payment_session_id */
    session_id?: string
  }
  message: string
}

export type Payment = PayUPaymentPayload | CashfreePaymentPayload | null

export interface BookingResponse {
  success: boolean
  message: string
  data: {
    booking: Booking
    payment: Payment
    paymentError: null | string
  }
}

// Booking API functions
export const bookingAPI = {
  async createBooking(bookingData: BookingRequest): Promise<BookingResponse | ApiError> {
    const accessToken = tokenManager.getAccessToken()
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Authentication required. Please login again.',
        error: 'No access token found'
      }
    }

    const result = await apiRequest<BookingResponse>('/bookings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(bookingData),
    })
    
    return result
  },

  async searchBookingByPaymentReference(paymentReference: string): Promise<BookingDetailResponse | ApiError> {
    const result = await apiRequest<BookingDetailResponse>(`/bookings/search/${paymentReference}`, {
      method: 'GET'
    })
    
    return result
  }
}

// History API types
export interface HistoryBookingUser {
  _id: string
  firstName: string
  lastName: string
  phoneNumber: string
}

export interface HistoryBookingState {
  _id: string
  name: string
}

export interface HistoryBooking {
  _id: string
  user: HistoryBookingUser
  visiting_state: HistoryBookingState
  vehicle_number: string
  seat_capacity: string
  whatsapp_number: string
  entry_border: string
  tax_mode: string
  tax_from_date: string
  tax_upto_date: string
  amount: number
  status: string
  tax_slip_pdf?: TaxSlipPdf
  bookingId: string
  createdAt: string
  updatedAt: string
}

export interface HistoryPagination {
  total: number
  page: number
  limit: number
  pages: number
}

export interface HistoryResponse {
  success: boolean
  message: string
  data: HistoryBooking[]
  pagination: HistoryPagination
}

// Booking Detail API types
export interface BookingDetailPaymentDetails {
  transaction_id?: string
  payment_reference?: string
  payment_method?: string
  paid_at?: string
}

export interface BookingDetailValidity {
  is_expired: boolean
  valid_from: string
  valid_until: string
}

export interface BookingDetail {
  _id: string
  user: HistoryBookingUser
  visiting_state: HistoryBookingState
  vehicle_number: string
  seat_capacity: string
  whatsapp_number: string
  entry_border: string
  tax_mode: string
  tax_from_date: string
  tax_upto_date: string
  amount: number
  status: string
  createdAt: string
  updatedAt: string
  bookingId: string
  __v: number
  payment_details: BookingDetailPaymentDetails
  validity: BookingDetailValidity
  tax_slip_pdf?: TaxSlipPdf
}

export interface BookingDetailResponse {
  success: boolean
  message: string
  data: BookingDetail
}

// History API functions
export const historyAPI = {
  async getBookings(page: number = 1, limit: number = 10, status?: string): Promise<HistoryResponse | ApiError> {
    const accessToken = tokenManager.getAccessToken()
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Authentication required. Please login again.',
        error: 'No access token found'
      }
    }

    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })
    
    if (status) {
      params.append('status', status)
    }

    const result = await apiRequest<HistoryResponse>(`/bookings?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    return result
  },

  async getBookingById(bookingId: string): Promise<BookingDetailResponse | ApiError> {
    const accessToken = tokenManager.getAccessToken()
    
    if (!accessToken) {
      return {
        success: false,
        message: 'Authentication required. Please login again.',
        error: 'No access token found'
      }
    }

    const result = await apiRequest<BookingDetailResponse>(`/bookings/${bookingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    return result
  }
}

// Insurance Inquiry (public)
export interface InsuranceInquiryResponse {
  success: boolean
  message: string
  data: {
    _id: string
    vehicle_number: string
    phone_number: string
    status: string
    createdAt: string
  }
}

export const insuranceAPI = {
  async submitInquiry(vehicle_number: string, phone_number: string): Promise<InsuranceInquiryResponse | ApiError> {
    const result = await apiRequest<InsuranceInquiryResponse>('/insurance-inquiries', {
      method: 'POST',
      body: JSON.stringify({ vehicle_number, phone_number })
    })
    return result
  }
}

// Cab bookings (public)
export interface CabBookingPublic {
  _id: string
  from_location: string
  to_location: string
  start_date: string
  trip_type: 'one_way' | 'round_trip'
  return_date?: string
  status: 'unassigned' | 'assigned' | 'closed'
  createdAt: string
}

export interface CabBookingsResponse {
  success: boolean
  message: string
  data: CabBookingPublic[]
}

export const cabAPI = {
  async listUnassigned(limit: number = 10): Promise<CabBookingsResponse | ApiError> {
    const result = await apiRequest<CabBookingsResponse>(`/cab-bookings?status=unassigned&limit=${limit}`, { method: 'GET' })
    return result
  },
  async getById(id: string): Promise<{ success: boolean; message: string; data: CabBookingPublic } | ApiError> {
    const result = await apiRequest<{ success: boolean; message: string; data: CabBookingPublic }>(`/cab-bookings/${id}`, { method: 'GET' })
    return result
  },
  async expressInterest(bookingId: string): Promise<{ success: boolean; message: string } | ApiError> {
    // Get user data from token manager
    const userData = tokenManager.getUserData()
    if (!userData) {
      return { success: false, message: 'User not authenticated' }
    }
    
    const result = await apiRequest<{ success: boolean; message: string }>(`/cab-bookings/${bookingId}/interest`, {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userData._id,
        phone_number: userData.phoneNumber,
        first_name: userData.firstName,
        last_name: userData.lastName
      })
    })
    return result
  }
}

// App Settings API
export interface AppSettings {
  appStatus: 'online' | 'maintenance'
  isMaintenanceMode: boolean
  maintenanceMessage: string
  maintenanceTitle: string
  estimatedReturnTime?: string
  platformFee: number
}

export const appSettingsAPI = {
  async getAppStatus(): Promise<{ success: boolean; data: AppSettings } | ApiError> {
    const result = await apiRequest<{ success: boolean; data: AppSettings }>('/app-status', { method: 'GET' })
    return result
  }
}

// App Version API
export interface UpdateCheckResponse {
  success: boolean
  data: {
    updateRequired: boolean
    latestVersion: string | null
    downloadUrl: string | null
    releaseNotes: string
    isForced: boolean
    minSupportedVersion: string
  }
}

export const versionAPI = {
  async checkForUpdate(currentVersion: string, platform: string = 'both'): Promise<UpdateCheckResponse | ApiError> {
    const result = await apiRequest<UpdateCheckResponse>(`/check?currentVersion=${currentVersion}&platform=${platform}`, { method: 'GET' })
    return result
  }
}

// Version Tracking API functions
export const versionTrackingAPI = {
  async trackVersion(data: VersionTrackingRequest): Promise<VersionTrackingResponse | ApiError> {
    const result = await apiRequest<VersionTrackingResponse>('/version-track', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return result
  },

  async getVersionStats(): Promise<VersionStatsResponse | ApiError> {
    const result = await apiRequest<VersionStatsResponse>('/version-stats', {
      method: 'GET',
    })
    return result
  }
}

// Booking Validation API
export interface BookingValidationRequest {
  visitingStateId: string
  vehicleTypeId: string
  planId: string
  vehicleNumber: string
  whatsappNumber: string
  entryBorderId: string
  fromDate: string
  uptoDate: string
  frontendCalculatedAmount: number
}

export interface BookingValidationResponse {
  success: boolean
  message: string
  data?: {
    validatedAmount: number
    planDetails: {
      id: string
      type: string
      amount: number
      description: string
    }
    vehicleTypeDetails: {
      id: string
      name: string
      seatCapacity: string
    }
    stateDetails: {
      id: string
      name: string
      statecode?: string
    }
    validationResults: {
      stateValid: boolean
      vehicleTypeValid: boolean
      planValid: boolean
      datesValid: boolean
      amountValid: boolean
      vehicleNumberValid: boolean
      whatsappNumberValid: boolean
    }
    bookingData: {
      visitingStateId: string
      vehicleTypeId: string
      planId: string
      vehicleNumber: string
      whatsappNumber: string
      entryBorderId: string
      fromDate: string
      uptoDate: string
      amount: number
    }
  }
  errors?: {
    [key: string]: string | boolean | number
  }
}

export const validationAPI = {
  async validateBooking(data: BookingValidationRequest): Promise<BookingValidationResponse | ApiError> {
    console.log('🔍 validationAPI.validateBooking called with:', data)
    const result = await apiRequest<BookingValidationResponse>('/validate-booking', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    console.log('🔍 validationAPI.validateBooking result:', result)
    return result
  }
}

// Helper function to decode JWT token
function decodeJWT(token: string): any | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decoding JWT:', error)
    return null
  }
}

// Token expiration checks removed - users stay logged in until explicit logout

// Utility functions for token management
export const tokenManager = {
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  },

  setAccessToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  },

  getUserData(): User | null {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
    return userData ? JSON.parse(userData) : null
  },

  getVerificationData(): any | null {
    const verificationData = localStorage.getItem(STORAGE_KEYS.VERIFICATION_DATA)
    return verificationData ? JSON.parse(verificationData) : null
  },

  clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_DATA)
    localStorage.removeItem(STORAGE_KEYS.VERIFICATION_DATA)
  },

  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken()
    const userData = this.getUserData()
    
    // Simple check: just verify token and user data exist (no expiration check)
    const hasValidToken = !!(accessToken && accessToken.length > 10)
    const hasValidUserData = !!(userData && userData._id && userData.phoneNumber)
    
    return hasValidToken && hasValidUserData
  }
} 