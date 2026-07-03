export const base_url = "https://api.waadi.in/api/v1"

// Frontend URL configuration
export const frontend_url = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost"

// PayU Payment Gateway Configuration
export const payuConfig = {
  merchantKey: process.env.NEXT_PUBLIC_PAYU_MERCHANT_KEY || "Y3vLqG", // Replace with your actual key
  merchantSalt: process.env.NEXT_PUBLIC_PAYU_MERCHANT_SALT || "6HhDKF6HhOoTogOEyXRqj2icBveXx3wo", // Replace with your actual salt
  isProduction: process.env.NEXT_PUBLIC_PAYU_ENVIRONMENT === "production",
  baseUrl: process.env.NEXT_PUBLIC_PAYU_ENVIRONMENT === "production" 
    ? "https://secure.payu.in/_payment"
    : "https://secure.payu.in/_payment"
}
// IMPORTANT: For local development, you need a tunnel (like ngrok) to make PayU callbacks accessible
// The success/failure URLs must be publicly accessible for PayU to redirect users back
// Example tunnel setup: ngrok http 3000
// Then use: https://your-tunnel-url.ngrok.io/payment/success and https://your-tunnel-url.ngrok.io/payment/failure
