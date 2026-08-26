/**
 * Official Razorpay checkout for this Capacitor app.
 *
 * Native (Android/iOS): capacitor-razorpay → Razorpay Android/iOS SDK.
 * Web: Standard Checkout (checkout.js) in the same page — not a backend relay browser.
 *
 * Checkout close / UPI app switch / missing SDK callback is NOT a payment failure.
 * Backend verification + webhooks remain the source of truth.
 */

import { Capacitor } from '@capacitor/core'
import { Checkout } from 'capacitor-razorpay'
import type { RazorpayPaymentData } from './razorpay'

type RazorpayNativeOpenOptions = {
  key: string
  amount: string
}

export type RazorpayCheckoutOutcome =
  | {
      status: 'completed'
      razorpay_payment_id: string
      razorpay_order_id: string
      razorpay_signature: string
    }
  | { status: 'dismissed'; reason?: string }
  | { status: 'failed'; reason?: string }

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      on: (event: string, handler: (response: unknown) => void) => void
    }
  }
}

function buildCheckoutOptions(paymentData: RazorpayPaymentData): RazorpayNativeOpenOptions & Record<string, unknown> {
  return {
    key: String(paymentData.key_id || ''),
    amount: String(paymentData.amount || ''),
    currency: paymentData.currency || 'INR',
    name: paymentData.name || 'Waadi Cab',
    description: paymentData.description || 'Border Tax Pass',
    order_id: paymentData.razorpay_order_id,
    prefill: {
      name: paymentData.prefill_name || '',
      email: paymentData.prefill_email || '',
      contact: paymentData.prefill_contact || '',
    },
    theme: { color: '#16a34a' },
    retry: { enabled: true },
    modal: {
      confirm_close: true,
      escape: false,
      backdropclose: false,
    },
  }
}

function extractSuccessPayload(data: unknown): {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
} | null {
  if (!data || typeof data !== 'object') return null

  const root = data as Record<string, unknown>
  let nested: unknown = root.response ?? root

  if (typeof nested === 'string') {
    try {
      nested = JSON.parse(nested)
    } catch {
      return null
    }
  }

  if (!nested || typeof nested !== 'object') return null
  const payload = nested as Record<string, unknown>
  const paymentId = String(payload.razorpay_payment_id || '')
  const orderId = String(payload.razorpay_order_id || '')
  const signature = String(payload.razorpay_signature || '')
  if (!paymentId || !orderId || !signature) return null
  return {
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    razorpay_signature: signature,
  }
}

function classifyCheckoutError(error: unknown): 'dismissed' | 'failed' | 'unknown' {
  let parsed: Record<string, unknown> = {}
  if (typeof error === 'string') {
    try {
      parsed = JSON.parse(error)
    } catch {
      parsed = { message: error }
    }
  } else if (error && typeof error === 'object') {
    parsed = error as Record<string, unknown>
    const code = parsed.code
    if (typeof code === 'string' && code.trim().startsWith('{')) {
      try {
        parsed = { ...parsed, ...(JSON.parse(code) as Record<string, unknown>) }
      } catch {
        /* keep original */
      }
    }
  }

  const blob = JSON.stringify(parsed).toLowerCase()
  if (
    blob.includes('cancel') ||
    blob.includes('dismiss') ||
    blob.includes('backpressed') ||
    blob.includes('"code":0') ||
    blob.includes('"code": 0')
  ) {
    return 'dismissed'
  }
  if (blob.includes('payment_failed') || blob.includes('bad_request_error')) {
    return 'failed'
  }
  return 'unknown'
}

function loadCheckoutJs(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout requires a browser window'))
  }
  if (typeof window.Razorpay === 'function') return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay Checkout')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout'))
    document.body.appendChild(script)
  })
}

function openWebCheckout(options: Record<string, unknown>): Promise<RazorpayCheckoutOutcome> {
  return new Promise((resolve, reject) => {
    loadCheckoutJs()
      .then(() => {
        if (typeof window.Razorpay !== 'function') {
          reject(new Error('Razorpay Checkout is unavailable'))
          return
        }

        let settled = false
        const finish = (outcome: RazorpayCheckoutOutcome) => {
          if (settled) return
          settled = true
          resolve(outcome)
        }

        const checkoutOptions: Record<string, unknown> = {
          ...options,
          handler: (response: unknown) => {
            const payload = extractSuccessPayload(response)
            if (!payload) {
              finish({ status: 'dismissed', reason: 'Checkout returned an incomplete response' })
              return
            }
            finish({ status: 'completed', ...payload })
          },
          modal: {
            ...((options.modal as object) || {}),
            ondismiss: () => finish({ status: 'dismissed', reason: 'checkout_closed' }),
          },
        }

        const rzp = new window.Razorpay(checkoutOptions)
        rzp.on('payment.failed', () => {
          finish({ status: 'failed', reason: 'payment_failed' })
        })
        rzp.open()
      })
      .catch(reject)
  })
}

async function openNativeCheckout(
  options: RazorpayNativeOpenOptions & Record<string, unknown>
): Promise<RazorpayCheckoutOutcome> {
  if (!Checkout?.open) {
    throw new Error('Razorpay native Checkout plugin is not available')
  }

  try {
    const data = await Checkout.open({
      ...options,
      key: options.key,
      amount: options.amount,
    })
    const payload = extractSuccessPayload(data)
    if (!payload) {
      return { status: 'dismissed', reason: 'native_checkout_no_payload' }
    }
    return { status: 'completed', ...payload }
  } catch (error) {
    const kind = classifyCheckoutError(error)
    if (kind === 'failed') {
      return { status: 'failed', reason: error instanceof Error ? error.message : 'payment_failed' }
    }
    return { status: 'dismissed', reason: error instanceof Error ? error.message : 'checkout_closed' }
  }
}

export async function openRazorpayCheckout(
  paymentData: RazorpayPaymentData
): Promise<RazorpayCheckoutOutcome> {
  const options = buildCheckoutOptions(paymentData)

  if (Capacitor.isNativePlatform()) {
    try {
      return await openNativeCheckout(options)
    } catch (nativeError) {
      console.warn('Razorpay native SDK unavailable, falling back to in-app checkout.js', nativeError)
    }
  }

  return openWebCheckout(options)
}
