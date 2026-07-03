/**
 * payment-gateway.ts
 *
 * Gateway router — PayU paths are unchanged. Cashfree uses the same Browser / form redirect pattern.
 */

import { Capacitor } from '@capacitor/core'
import { base_url } from '../environment'
import { authenticatedFetch, tokenManager } from './api'
import { CashfreePaymentData } from './cashfree'
import { PayUResponse } from './payu'
import journeyLogger from './journeyLogger'

export type PaymentGatewayName = 'payu' | 'cashfree'

export interface BackendPayUPayment {
  gateway: 'payu'
  paymentUrl: string
  paymentData: Record<string, string>
  message?: string
}

export interface BackendCashfreePayment {
  gateway: 'cashfree'
  paymentUrl: string
  paymentData: CashfreePaymentData
  message?: string
}

export type BackendPaymentPayload = BackendPayUPayment | BackendCashfreePayment

function toStringRecord(data: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {}
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      out[key] = String(value)
    }
  })
  return out
}

function assertValidPaymentSessionId(value: string | undefined): string {
  const id = String(value || '').trim()
  if (!id) {
    throw new Error('Cashfree payment_session_id is missing')
  }
  if (!id.startsWith('session_')) {
    throw new Error('Invalid Cashfree payment_session_id — must start with "session_"')
  }
  return id
}

/** Relay accepts only checkout fields — never order_id / txnid for SDK launch. */
function buildCashfreeRelayParams(paymentData: Record<string, string>): Record<string, string> {
  const paymentSessionId = assertValidPaymentSessionId(
    paymentData.payment_session_id || paymentData.session_id
  )
  const modeRaw = (paymentData.mode || 'production').trim().toLowerCase()
  const params: Record<string, string> = {
    payment_session_id: paymentSessionId,
    mode: modeRaw === 'production' ? 'production' : 'sandbox',
  }
  if (paymentData.platform) {
    params.platform = paymentData.platform
  }
  return params
}

function submitPayUForm(
  paymentUrl: string,
  paymentData: Record<string, string>,
  options?: { preferSameTabOnIOS?: boolean; targetWindowName?: string }
): PayUResponse {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = paymentUrl

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  if (options?.targetWindowName) {
    form.target = options.targetWindowName
  } else if (Capacitor.isNativePlatform()) {
    form.target = '_self'
  } else if (isIOS) {
    form.target = options?.preferSameTabOnIOS !== false ? '_self' : '_blank'
  } else {
    form.target = '_blank'
  }

  Object.entries(paymentData).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = value ?? ''
    form.appendChild(input)
  })

  document.body.appendChild(form)

  journeyLogger.paymentRedirectPayU({
    sourceFile: 'payment-gateway.ts',
    sourceFunction: 'submitPayUForm',
    transactionId: paymentData.txnid || paymentData.txnId,
    data: { paymentUrl, platform: 'web' },
  })

  form.submit()
  document.body.removeChild(form)

  return {
    status: 'success',
    txnId: paymentData.txnid || paymentData.txnId || '',
    amount: paymentData.amount || '',
  }
}

/**
 * Cashfree web checkout — mirrors submitPayUForm (form submit opens browser tab).
 * PayU POSTs to secure.payu.in; Cashfree POSTs to backend /payment/cashfree/relay which redirects to Cashfree.
 */
function submitCashfreeRelayForm(
  paymentData: Record<string, string>,
  options?: { preferSameTabOnIOS?: boolean; targetWindowName?: string }
): PayUResponse {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = `${base_url}/payment/cashfree/relay`

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  if (options?.targetWindowName) {
    form.target = options.targetWindowName
  } else if (Capacitor.isNativePlatform()) {
    form.target = '_self'
  } else if (isIOS) {
    form.target = options?.preferSameTabOnIOS !== false ? '_self' : '_blank'
  } else {
    form.target = '_blank'
  }

  Object.entries(paymentData).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = value ?? ''
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)

  return {
    status: 'success',
    txnId: '',
    amount: '',
  }
}

async function openPayUNativeRelay(paymentData: Record<string, string>): Promise<PayUResponse> {
  const { Browser } = await import('@capacitor/browser')
  const relayUrl = `${base_url}/payment/relay?${new URLSearchParams(paymentData).toString()}`

  journeyLogger.paymentRedirectPayU({
    sourceFile: 'payment-gateway.ts',
    sourceFunction: 'openPayUNativeRelay',
    transactionId: paymentData.txnid || paymentData.txnId,
    data: { relayUrl, platform: 'app' },
  })

  await Browser.open({ url: relayUrl, windowName: '_self' })

  return {
    status: 'success',
    txnId: paymentData.txnid || '',
    amount: paymentData.amount || '',
  }
}

/** Exact mirror of openPayUNativeRelay — same Browser.open, same URLSearchParams pattern. */
async function openCashfreeNativeRelay(relayParams: Record<string, string>): Promise<PayUResponse> {
  const { Browser } = await import('@capacitor/browser')

  const relayUrl = `${base_url}/payment/cashfree/relay?${new URLSearchParams(relayParams).toString()}`

  console.log('🔗 Cashfree Android relay:', {
    relayUrl,
    payment_session_id: `${relayParams.payment_session_id?.substring(0, 24)}…`,
    mode: relayParams.mode,
    platform: relayParams.platform || 'web',
  })

  await Browser.open({ url: relayUrl, windowName: '_self' })

  return {
    status: 'success',
    txnId: '',
    amount: '',
  }
}

export function getPaymentReference(payment: BackendPaymentPayload): string {
  return payment.paymentData.txnid || ''
}

export async function initiatePaymentFromBackend(
  payment: BackendPaymentPayload,
  options?: { preferSameTabOnIOS?: boolean }
): Promise<PayUResponse> {
  if (payment.gateway === 'payu') {
    if (Capacitor.isNativePlatform()) {
      return openPayUNativeRelay(payment.paymentData)
    }
    return submitPayUForm(payment.paymentUrl, payment.paymentData, options)
  }

  const cfData = toStringRecord(payment.paymentData as Record<string, string | undefined>)
  if (!cfData.platform && Capacitor.isNativePlatform()) {
    cfData.platform = 'app'
  }

  const relayParams = buildCashfreeRelayParams(cfData)

  console.log('💳 Cashfree checkout init:', {
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    mode: relayParams.mode,
    payment_session_id: `${relayParams.payment_session_id.substring(0, 24)}…`,
    txnid: cfData.txnid,
  })

  if (Capacitor.isNativePlatform()) {
    const result = await openCashfreeNativeRelay(relayParams)
    return { ...result, txnId: cfData.txnid || '', amount: cfData.amount || '' }
  }

  const webResult = submitCashfreeRelayForm(relayParams, options)
  return { ...webResult, txnId: cfData.txnid || '', amount: cfData.amount || '' }
}

export async function verifyPaymentWithBackend(
  gateway: PaymentGatewayName,
  referenceId: string
): Promise<any> {
  const accessToken = tokenManager.getAccessToken()
  if (!accessToken) {
    throw new Error('Authentication required. Please login again.')
  }

  const statusPath =
    gateway === 'cashfree'
      ? `/payment/cashfree/status/${encodeURIComponent(referenceId)}`
      : `/payment/status/${encodeURIComponent(referenceId)}`

  const response = await authenticatedFetch(`${base_url}${statusPath}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  return response.json()
}

export function getGatewayLabel(gateway?: PaymentGatewayName): string {
  if (gateway === 'cashfree') return 'Cashfree Payment Gateway'
  if (gateway === 'payu') return 'PayU Payment Gateway'
  return 'Secure Payment Gateway'
}

export function isBackendPaymentPayload(value: unknown): value is BackendPaymentPayload {
  if (!value || typeof value !== 'object') return false
  const gateway = (value as BackendPaymentPayload).gateway
  if (gateway === 'payu') {
    return !!(value as BackendPayUPayment).paymentUrl && !!(value as BackendPayUPayment).paymentData
  }
  if (gateway !== 'cashfree') return false
  const cf = value as BackendCashfreePayment
  const pd = cf.paymentData
  const sessionId = pd?.payment_session_id || pd?.session_id
  return !!(pd?.txnid && sessionId && (cf.paymentUrl || pd.mode))
}
