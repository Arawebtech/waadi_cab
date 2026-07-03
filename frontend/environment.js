function normalizeApiBaseUrl(raw) {
  const fallback = 'https://api.waadi.in/api/v1'
  const trimmed = (raw || fallback).trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/api/v1')) return trimmed
  return `${trimmed}/api/v1`
}

export const base_url = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

// Frontend URL configuration
export const frontend_url = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://book.waadi.in"

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
