import { base_url } from '../environment'

// Safe environment configuration for Next.js
export const config = {
  // Backend API URL (includes /api/v1)
  backendUrl: base_url,
  
  // Frontend URL - with fallback for SSR
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost',
  
  // PayU Configuration
  payu: {
    merchantKey: process.env.NEXT_PUBLIC_PAYU_MERCHANT_KEY || 'YOUR_MERCHANT_KEY_HERE',
    merchantSalt: process.env.NEXT_PUBLIC_PAYU_MERCHANT_SALT || 'YOUR_MERCHANT_SALT_HERE',
    environment: process.env.NEXT_PUBLIC_PAYU_ENVIRONMENT || 'production',
    isProduction: process.env.NEXT_PUBLIC_PAYU_ENVIRONMENT === 'production',
    baseUrl: process.env.NEXT_PUBLIC_PAYU_ENVIRONMENT === 'production' 
      ? 'https://secure.payu.in/_payment'
      : 'https://secure.payu.in/_payment'
  }
}

// Validate configuration
export const validateConfig = () => {
  const errors = []
  
  // Validating configuration
  
  if (!config.backendUrl.startsWith('http')) {
    errors.push('Invalid backend URL')
  }
  
  if (!config.frontendUrl.startsWith('http')) {
    errors.push('Invalid frontend URL')
  }
  
  if (config.payu.merchantKey === 'YOUR_MERCHANT_KEY_HERE') {
    errors.push('PayU merchant key not configured')
  }
  
  if (config.payu.merchantSalt === 'YOUR_MERCHANT_SALT_HERE') {
    errors.push('PayU merchant salt not configured')
  }
  
  if (errors.length > 0) {
    // Configuration validation failed
  } else {
    // Configuration validation passed
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Helper function to get frontend URL safely
export const getFrontendUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use window.location as fallback
    return window.location.origin
  }
  // Server-side: use environment variable
  return config.frontendUrl
}

// Helper function to build payment URLs
export const buildPaymentUrl = (path: string, params?: Record<string, string>): string => {
  try {
    const baseUrl = getFrontendUrl()
    
    // Ensure baseUrl is valid
    if (!baseUrl || !baseUrl.startsWith('http')) {
      throw new Error(`Invalid base URL: ${baseUrl}`)
    }
    
    const url = new URL(path, baseUrl)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value)
        }
      })
    }
    
    return url.toString()
  } catch (error) {
    console.error('Error building payment URL:', error)
    // Fallback to a safe URL
    return `http://localhost${path}`
  }
} 