import type { PaymentGatewayName } from './payment-gateway'
import type { RazorpayPaymentData } from './razorpay'
import { verifyPaymentWithBackend } from './payment-gateway'

const STORAGE_KEY = 'pendingPayment'

export type PendingPayment = {
  txnId: string
  orderId?: string
  gateway: PaymentGatewayName
  amount: number | string
  bookingId?: string
  bookingNumber?: string
  bookingData?: { vehicleNumber?: string }
  paymentData?: RazorpayPaymentData
  timestamp: number
}

export function savePendingPayment(payload: PendingPayment): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPendingPayment(): PendingPayment | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingPayment
    if (!parsed?.txnId || !parsed.gateway) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPendingPayment(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function isPaidBackendResult(result: any): boolean {
  return !!(
    result &&
    (result.data?.status === 'success' ||
      result.data?.bookingStatus === 'paid' ||
      result.data?.bookingStatus === 'paid')
  )
}

export function isFailedBackendResult(result: any): boolean {
  return result?.data?.status === 'failure' || result?.data?.status === 'failed'
}

export function buildPaymentPageUrl(
  path: '/payment/success' | '/payment/pending' | '/payment/failure',
  pending: Pick<PendingPayment, 'txnId' | 'amount' | 'bookingNumber' | 'bookingId' | 'gateway'>,
  extra?: Record<string, string>
): string {
  const q = new URLSearchParams()
  q.set('txnid', pending.txnId)
  q.set('gateway', pending.gateway)
  if (pending.amount != null) q.set('amount', String(pending.amount))
  if (pending.bookingNumber) q.set('bookingId', String(pending.bookingNumber))
  else if (pending.bookingId) q.set('bookingId', String(pending.bookingId))
  if (path === '/payment/success') q.set('status', 'success')
  if (path === '/payment/pending') q.set('status', 'pending')
  if (path === '/payment/failure') q.set('status', 'failure')
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value) q.set(key, value)
  })
  return `${path}?${q.toString()}`
}

/**
 * On app resume / launch: if Razorpay already captured the payment, show Success.
 * Unpaid / cancelled / closed checkout: do nothing (keep previous behavior).
 */
export async function reconcilePendingRazorpay(
  navigate: (url: string) => void
): Promise<void> {
  const pending = getPendingPayment()
  if (!pending || pending.gateway !== 'razorpay' || !pending.txnId) return
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/payment/success')) {
    return
  }

  try {
    const result = await verifyPaymentWithBackend('razorpay', pending.txnId)
    if (isPaidBackendResult(result)) {
      clearPendingPayment()
      navigate(buildPaymentPageUrl('/payment/success', pending))
    }
  } catch (error) {
    console.warn('Razorpay resume reconcile skipped:', error)
  }
}
