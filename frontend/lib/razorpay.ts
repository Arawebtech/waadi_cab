/**
 * Razorpay Payment Gateway — status / verify helpers only.
 */
import { base_url } from '../environment'
import { tokenManager, authenticatedFetch } from './api'

export interface RazorpayPaymentData {
  txnid: string
  razorpay_order_id: string
  key_id: string
  amount: string
  currency?: string
  name?: string
  description?: string
  prefill_name?: string
  prefill_email?: string
  prefill_contact?: string
  callback_url?: string
  mode?: string
  platform?: string
}

export async function verifyRazorpayPayment(txnId: string): Promise<any> {
  const accessToken = tokenManager.getAccessToken()
  if (!accessToken) throw new Error('Authentication required. Please login again.')

  const response = await authenticatedFetch(`${base_url}/payment/razorpay/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ txnId }),
  })

  return response.json()
}

export async function getRazorpayPaymentStatus(txnId: string): Promise<any> {
  const accessToken = tokenManager.getAccessToken()
  if (!accessToken) throw new Error('Authentication required. Please login again.')

  const response = await authenticatedFetch(
    `${base_url}/payment/razorpay/status/${encodeURIComponent(txnId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  return response.json()
}
