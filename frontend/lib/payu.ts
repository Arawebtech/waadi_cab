// PayU Payment Gateway Integration for Capacitor
import { Capacitor } from '@capacitor/core'
import { base_url } from '../environment'

// Import token manager for authentication
import { tokenManager, authenticatedFetch } from './api'

// PayU Configuration
export interface PayUConfig {
  merchantKey: string
  merchantSalt: string
  isProduction: boolean
}

export interface PayUPaymentData {
  amount: string
  productInfo: string
  firstName: string
  email: string
  phone: string
  txnId: string
  surl: string // Success URL
  furl: string // Failure URL
  udf1?: string // Booking ID
  udf2?: string
  udf3?: string
  udf4?: string
  udf5?: string
  udf6?: string
  udf7?: string
  udf8?: string
  udf9?: string
  udf10?: string
  hash?: string
}

export interface PayUResponse {
  status: 'success' | 'failure' | 'cancel' | 'pending'
  paymentId?: string
  txnId: string
  amount: string
  error?: string
  paymentGatewayType?: string
  bankRefNumber?: string
  cardToken?: string
  razorpay_payment_id?: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

export type PayUResponse = PayUResponse

// PayU Service Class
export class PayUService {
  private config: PayUConfig
  private baseUrl: string

  constructor(config: PayUConfig) {
    this.config = config
    this.baseUrl = config.isProduction 
      ? 'https://secure.payu.in/_payment'
      : 'https://secure.payu.in/_payment'
  }

  // Generate transaction ID
  generateTxnId(): string {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `TXN_${timestamp}_${random}`
  }

  // Generate hash for PayU
  async generateHash(paymentData: PayUPaymentData): Promise<string> {
    console.log('🔐 Generating hash for payment...')
    console.log('📋 Payment Data:', paymentData)
    
    const { amount, productInfo, firstName, email, txnId, phone } = paymentData
    
    // Verify merchant key configuration
    console.log('🔑 Frontend merchant key:', this.config.merchantKey)
    console.log('🔑 Expected backend key: Y3vLqG (from environment.js)')
    if (this.config.merchantKey !== 'Y3vLqG') {
      console.warn('⚠️ WARNING: Frontend merchant key does not match expected value!')
    }
    
    console.log('🔑 Backend will use its own merchant key and salt')
    console.log('📝 Sending payment components to backend for hash generation')
    
    // Extract UDF fields
    const { 
      udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = '',
      udf6 = '', udf7 = '', udf8 = '', udf9 = '', udf10 = ''
    } = paymentData
    
    // Get access token for authentication
    const accessToken = tokenManager.getAccessToken()
    console.log('🎫 Access Token:', accessToken ? 'Present' : 'Missing')
    
    if (!accessToken) {
      throw new Error('Authentication required. Please login again.')
    }
    
    // Send individual payment components to backend
    // Backend will build the complete hash string using its own credentials
    const apiUrl = `${base_url}/payment/generate-hash`
    console.log('🌐 Calling API:', apiUrl)
    
    const requestBody = {
      txnid: txnId,
      amount,
      productinfo: productInfo,
      firstname: firstName,
      email: email || '',
      phone: phone || '',
      udf1, udf2, udf3, udf4, udf5,
      udf6, udf7, udf8, udf9, udf10
    }
    
    console.log('🔍 Field mapping check:')
    console.log('  Frontend txnId -> Backend txnid:', txnId)
    console.log('  Frontend productInfo -> Backend productinfo:', productInfo)
    console.log('  Frontend firstName -> Backend firstname:', firstName)
    
    console.log('📤 Sending to backend:', requestBody)
    
    // Log the expected hash string format for debugging
    console.log('🔐 Expected hash string format:')
    console.log('  key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt')
    console.log('  Backend will build this using its own merchant key and salt')
    
    const response = await authenticatedFetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log('📡 API Response Status:', response.status)
    console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()))
    
    const result = await response.json()
    console.log('📄 API Response Body:', result)
    
    if (!result.hash) {
      throw new Error(`Backend did not return hash: ${JSON.stringify(result)}`)
    }
    
    console.log('✅ Hash received from backend:', result.hash ? 'Present' : 'Missing')
    console.log('🔐 Hash length:', result.hash?.length || 0)
    console.log('🔐 Hash preview:', result.hash ? `${result.hash.substring(0, 20)}...` : 'None')
    
    return result.hash
  }

  // Initiate PayU payment
  async initiatePayment(
    paymentData: Omit<PayUPaymentData, 'hash'>,
    options?: { targetWindowName?: string; preferSameTabOnIOS?: boolean }
  ): Promise<PayUResponse> {
    try {
      console.log('🚀 Initiating PayU payment...')
      
      // Generate hash from backend
      console.log('🔐 Calling generateHash...')
      const hash = await this.generateHash(paymentData as PayUPaymentData)
      console.log('✅ Hash generated successfully:', hash ? 'Present' : 'Missing')
      
      const fullPaymentData: PayUPaymentData = {
        ...paymentData,
        hash
      }
      
      console.log('📦 Full Payment Data:', fullPaymentData)

      console.log('📱 Platform check - Capacitor.isNativePlatform():', Capacitor.isNativePlatform())
      
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Using native payment method...')
        return this.initiateNativePayment(fullPaymentData)
      } else {
        console.log('🌐 Using web payment method...')
        return this.initiateWebPayment(fullPaymentData, options)
      }
    } catch (error) {
      console.error('PayU payment initiation failed:', error)
      return {
        status: 'failure',
        txnId: paymentData.txnId,
        amount: paymentData.amount,
        error: 'Payment initiation failed'
      }
    }
  }

  // Native payment for mobile app
  private async initiateNativePayment(paymentData: PayUPaymentData): Promise<PayUResponse> {
    try {
      // Import Capacitor Browser plugin
      const { Browser } = await import('@capacitor/browser')
      
      // Build backend relay URL so native can open via GET, while backend posts to PayU
      const relayParams = new URLSearchParams({
        key: this.config.merchantKey,
        txnid: paymentData.txnId,
        amount: paymentData.amount,
        productinfo: paymentData.productInfo,
        firstname: paymentData.firstName,
        email: paymentData.email || '',
        phone: paymentData.phone || '',
        surl: paymentData.surl,
        furl: paymentData.furl,
        hash: paymentData.hash!,
        service_provider: 'payu_paisa',
        udf1: paymentData.udf1 || '',
        udf2: paymentData.udf2 || '',
        udf3: paymentData.udf3 || '',
        udf4: paymentData.udf4 || '',
        udf5: paymentData.udf5 || '',
        udf6: paymentData.udf6 || '',
        udf7: paymentData.udf7 || '',
        udf8: paymentData.udf8 || '',
        udf9: paymentData.udf9 || '',
        udf10: paymentData.udf10 || ''
      })

      const relayUrl = `${base_url}/payment/relay?${relayParams.toString()}`

      console.log('🔗 Native Payment via Relay - URL:', relayUrl)
      
      await Browser.open({
        url: relayUrl,
        windowName: '_self'
      })

      // Return pending status - actual result will come through callback URLs
      return {
        status: 'success', // This is just for opening the browser
        txnId: paymentData.txnId,
        amount: paymentData.amount
      }
    } catch (error) {
      console.error('Native payment error:', error)
      return {
        status: 'failure',
        txnId: paymentData.txnId,
        amount: paymentData.amount,
        error: 'Failed to open payment page'
      }
    }
  }

  // Web payment for browser
  private async initiateWebPayment(
    paymentData: PayUPaymentData,
    options?: { targetWindowName?: string; preferSameTabOnIOS?: boolean }
  ): Promise<PayUResponse> {
    try {
      console.log('🌐 Initiating web payment...')
      console.log('🔗 PayU Base URL:', this.baseUrl)
      
      // Create a form and submit it
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = this.baseUrl
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      if (options?.targetWindowName) {
        form.target = options.targetWindowName
      } else if (isIOS) {
        // iOS Safari often blocks opening new tabs after async work
        const preferSameTab = options?.preferSameTabOnIOS !== false
        form.target = preferSameTab ? '_self' : '_blank'
      } else {
        form.target = '_blank'
      }

      const fields = {
        // Include merchant key - PayU requires this field
        key: this.config.merchantKey,
        txnid: paymentData.txnId,
        amount: paymentData.amount,
        productinfo: paymentData.productInfo,
        firstname: paymentData.firstName,
        email: paymentData.email,
        phone: paymentData.phone,
        surl: paymentData.surl,
        furl: paymentData.furl,
        hash: paymentData.hash!,
        service_provider: 'payu_paisa',
        // Include UDF fields for better tracking
        udf1: paymentData.udf1 || '',
        udf2: paymentData.udf2 || '',
        udf3: paymentData.udf3 || ''
      }

      console.log('📝 Form Fields:', fields)
      console.log('🔑 Merchant Key being sent:', this.config.merchantKey)
      console.log('🔐 Hash being sent:', paymentData.hash)

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      })

      console.log('📋 Form created, appending to body...')
      document.body.appendChild(form)
      
      console.log('🚀 Submitting form to PayU...')
      form.submit()
      
      console.log('🧹 Removing form from body...')
      document.body.removeChild(form)
      
      console.log('✅ Form submitted successfully!')

      return {
        status: 'success',
        txnId: paymentData.txnId,
        amount: paymentData.amount
      }
    } catch (error) {
      console.error('Web payment error:', error)
      return {
        status: 'failure',
        txnId: paymentData.txnId,
        amount: paymentData.amount,
        error: 'Failed to initiate web payment'
      }
    }
  }

  // Verify payment status
  async verifyPayment(txnId: string): Promise<any> {
    try {
      // Get access token for authentication
      const accessToken = tokenManager.getAccessToken()
      
      if (!accessToken) {
        throw new Error('Authentication required. Please login again.')
      }
      
      const response = await authenticatedFetch(`${base_url}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ txnId })
      })
      
      return await response.json()
    } catch (error) {
      console.error('Payment verification failed:', error)
      throw error
    }
  }

  // Get payment status
  async getPaymentStatus(txnId: string): Promise<any> {
    try {
      console.log('🔍 Checking payment status for:', txnId)
      
      // Get access token for authentication
      const accessToken = tokenManager.getAccessToken()
      
      if (!accessToken) {
        throw new Error('Authentication required. Please login again.')
      }
      
      const response = await authenticatedFetch(`${base_url}/payment/status/${txnId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })
      
      console.log('📡 Payment status response:', response.status)
      const result = await response.json()
      console.log('📄 Payment status result:', result)
      
      return result
    } catch (error) {
      console.error('Payment status check failed:', error)
      throw error
    }
  }
}

// Create PayU instance
export const createPayUService = (config: PayUConfig) => {
  return new PayUService(config)
}

// Default configuration (to be moved to environment)
export const defaultPayUConfig: PayUConfig = {
  merchantKey: process.env.NEXT_PUBLIC_PAYU_MERCHANT_KEY || 'YOUR_MERCHANT_KEY',
  merchantSalt: process.env.NEXT_PUBLIC_PAYU_MERCHANT_SALT || 'YOUR_MERCHANT_SALT',
  isProduction: process.env.NEXT_PUBLIC_PAYU_ENVIRONMENT === 'production'
}