/**
 * Cashfree Payment Gateway — status / verify helpers only.
 * Initiation is handled in payment-gateway.ts (mirrors PayU routing there).
 */
import { base_url } from '../environment'
import { tokenManager, authenticatedFetch } from './api'

export interface CashfreeConfig {
  environment: 'sandbox' | 'production'
  isProduction: boolean
}

/** Flat relay params — same pattern as PayU paymentData (string key/value for URLSearchParams). */
export interface CashfreePaymentData {
  payment_session_id: string
  mode: string
  txnid: string
  amount?: string
  platform?: string
  /** @deprecated legacy field — use payment_session_id */
  session_id?: string
}

export async function verifyCashfreePayment(txnId: string): Promise<any> {
  const accessToken = tokenManager.getAccessToken()
  if (!accessToken) {
    throw new Error('Authentication required. Please login again.')
  }

  const response = await authenticatedFetch(`${base_url}/payment/cashfree/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ txnId }),
  })

  return response.json()
}

export async function getCashfreePaymentStatus(txnId: string): Promise<any> {
  const accessToken = tokenManager.getAccessToken()
  if (!accessToken) {
    throw new Error('Authentication required. Please login again.')
  }

  const response = await authenticatedFetch(
    `${base_url}/payment/cashfree/status/${encodeURIComponent(txnId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  return response.json()
}

export const defaultCashfreeConfig: CashfreeConfig = {
  environment: (process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || 'production') as 'sandbox' | 'production',
  isProduction: (process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT || 'production') === 'production',
}
