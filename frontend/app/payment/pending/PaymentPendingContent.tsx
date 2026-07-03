"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/mobile-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Home, Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { PaymentGatewayName, verifyPaymentWithBackend } from '@/lib/payment-gateway'
import journeyLogger from '@/lib/journeyLogger'

const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 45

export default function PaymentPendingContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [txnId, setTxnId] = useState('')
  const [amount, setAmount] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [gateway, setGateway] = useState<PaymentGatewayName>('cashfree')
  const [isChecking, setIsChecking] = useState(true)
  const pollCountRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const redirectForState = useCallback(
    (orderId: string, status: 'success' | 'failure', data?: Record<string, string>) => {
      if (status === 'success') {
        router.replace(
          `/payment/success?txnid=${encodeURIComponent(orderId)}&status=success&amount=${encodeURIComponent(data?.amount || amount)}&bookingId=${encodeURIComponent(data?.bookingId || bookingId)}`
        )
        return
      }
      router.replace(
        `/payment/failure?txnid=${encodeURIComponent(orderId)}&status=failure&amount=${encodeURIComponent(data?.amount || amount)}&error=${encodeURIComponent('Payment was not completed')}`
      )
    },
    [amount, bookingId, router]
  )

  const verifyOnce = useCallback(async () => {
    if (!txnId) return

    const result = await verifyPaymentWithBackend(gateway, txnId)
    const isSuccess =
      result.success &&
      (result.data?.status === 'success' || result.data?.bookingStatus === 'paid')

    if (isSuccess) {
      stopPolling()
      localStorage.removeItem('pendingPayment')
      redirectForState(txnId, 'success', {
        amount: String(result.data?.amount ?? amount),
        bookingId: String(result.data?.bookingId ?? bookingId),
      })
      return
    }

    if (result.data?.status === 'failure') {
      stopPolling()
      localStorage.removeItem('pendingPayment')
      redirectForState(txnId, 'failure', {
        amount: String(result.data?.amount ?? amount),
        bookingId: String(result.data?.bookingId ?? bookingId),
      })
    }
  }, [amount, bookingId, gateway, redirectForState, stopPolling, txnId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderId = params.get('txnid') || params.get('order_id') || ''
    const amountVal = params.get('amount') || ''
    const bookingIdVal = params.get('bookingId') || ''
    setTxnId(orderId)
    setAmount(amountVal)
    setBookingId(bookingIdVal)

    if (orderId) {
      journeyLogger.paymentPending({
        sourceFile: 'PaymentPendingContent.tsx',
        sourceFunction: 'useEffect',
        bookingId: bookingIdVal || undefined,
        transactionId: orderId,
        data: { amount: amountVal },
      })
    }

    const gw = params.get('gateway')
    if (gw === 'payu' || gw === 'cashfree') {
      setGateway(gw)
    } else {
      try {
        const pending = localStorage.getItem('pendingPayment')
        if (pending) {
          const parsed = JSON.parse(pending)
          if (parsed.gateway === 'payu' || parsed.gateway === 'cashfree') {
            setGateway(parsed.gateway)
          }
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!txnId) return

    pollCountRef.current = 0
    verifyOnce().finally(() => setIsChecking(false))

    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling()
        return
      }
      await verifyOnce()
    }, POLL_INTERVAL_MS)

    return () => stopPolling()
  }, [stopPolling, txnId, verifyOnce])

  const handleManualRefresh = async () => {
    setIsChecking(true)
    try {
      await verifyOnce()
      toast({ title: 'Status checked', description: 'We are still waiting for payment confirmation.' })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <MobileLayout title="Payment Pending" showBackButton={false}>
      <div className="px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-sm">
              Your payment is being processed. This page will update automatically once the payment is confirmed.
            </p>
            {txnId && (
              <p className="text-xs text-gray-500 break-all">Transaction: {txnId}</p>
            )}
            {isChecking && (
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking payment status...
              </div>
            )}
            <Button onClick={handleManualRefresh} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Again
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="ghost" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  )
}
