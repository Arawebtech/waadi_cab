function normalizeApiHost(raw) {
  const fallback = 'https://api.waadi.in'
  let trimmed = (raw || fallback).trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/api/v1')) {
    trimmed = trimmed.slice(0, -'/api/v1'.length).replace(/\/+$/, '')
  }
  return trimmed
}

export const api_url = normalizeApiHost(process.env.NEXT_PUBLIC_API_URL)
export const base_url = `${api_url}/api/v1`

// Frontend URL configuration
export const frontend_url = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://31.97.229.97:3000"

// PayU Payment Gateway Configuration
export const payuConfig = {
  merchantKey: process.env.NEXT_PUBLIC_PAYU_MERCHANT_KEY || "Y3vLqG", // Replace with your actual key
  merchantSalt: process.env.NEXT_PUBLIC_PAYU_MERCHANT_SALT || "6HhDKF6HhOoTogOEyXRqj2icBveXx3wo", // Replace with your actual salt
  isProduction: process.env.NEXT_PUBLIC_PAYU_ENVIRONMENT === "production",
  baseUrl: process.env.NEXT_PUBLIC_PAYU_ENVIRONMENT === "production" 
    ? "https://secure.payu.in/_payment"
    : "https://secure.payu.in/_payment"
}

// Cashfree Payment Gateway Configuration
export const cashfreeConfig = {
  environment: process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || "production",
  isProduction: (process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || "production") === "production",
}
// IMPORTANT: For local development, you need a tunnel (like ngrok) to make PayU callbacks accessible
// The success/failure URLs must be publicly accessible for PayU to redirect users back
// Example tunnel setup: ngrok http 3000
// Then use: https://your-tunnel-url.ngrok.io/payment/success and https://your-tunnel-url.ngrok.io/payment/failure
