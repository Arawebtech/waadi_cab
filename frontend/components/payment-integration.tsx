"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, Shield, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { PayUResponse } from '@/lib/payu'
import { borderTaxAPI } from '@/lib/api'
import {
  BackendPaymentPayload,
  PaymentGatewayName,
  getGatewayLabel,
  getPaymentReference,
  initiatePaymentFromBackend,
  isBackendPaymentPayload,
  verifyPaymentWithBackend,
} from '@/lib/payment-gateway'
import { verifyRazorpayPayment } from '@/lib/razorpay'
import { openRazorpayCheckout } from '@/lib/razorpay-checkout'
import {
  savePendingPayment,
  getPendingPayment,
  clearPendingPayment,
  isPaidBackendResult,
  buildPaymentPageUrl,
} from '@/lib/pending-payment'
import appLogger, { setCorrelationIds } from '@/lib/logger'
import journeyLogger from '@/lib/journeyLogger'

interface PaymentIntegrationProps {
  amount: number
  bookingData: {
    vehicleNumber: string
    visitingStateName: string
    visitingStateId: string
    vehicleTypeName: string
    vehicleTypeId: string
    planType: string
    planId: string
    entryBorderName: string
    entryBorderId: string
    fromDate: string
    uptoDate: string
    whatsappNumber: string
  }
  userInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  onPaymentSuccess: (paymentResponse: PayUResponse) => void
  onPaymentFailure: (error: string) => void
  disabled?: boolean
}

export function PaymentIntegration({
  amount,
  bookingData,
  userInfo,
  onPaymentSuccess,
  onPaymentFailure,
  disabled = false
}: PaymentIntegrationProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'ready' | 'processing' | 'redirecting'>('ready')
  const [activeGateway, setActiveGateway] = useState<PaymentGatewayName | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingAttemptsRef = useRef<number>(0)

  const handlePayment = async () => {
    try {
      journeyLogger.checkoutPayClicked({
        sourceFile: 'payment-integration.tsx',
        sourceFunction: 'handlePayment',
        data: { amount, vehicleNumber: bookingData.vehicleNumber },
      })

      appLogger.booking('Booking submission started', {
        sourceFile: 'payment-integration.tsx',
        sourceFunction: 'handlePayment',
        data: { amount, vehicleNumber: bookingData.vehicleNumber },
      })

      setIsProcessing(true)
      setPaymentStep('processing')

      toast({
        title: "Creating Booking",
        description: "Preparing your border tax pass...",
      })

      const bookingRequest = {
        visiting_state: bookingData.visitingStateId,
        vehicle_number: bookingData.vehicleNumber,
        seat_capacity: bookingData.vehicleTypeName,
        whatsapp_number: bookingData.whatsappNumber,
        entry_border: bookingData.entryBorderName,
        tax_mode: bookingData.planType,
        tax_from_date: bookingData.fromDate,
        tax_upto_date: bookingData.uptoDate,
        amount: amount
      }

      const bookingResult = await borderTaxAPI.createBooking(bookingRequest)

      if (!bookingResult.success) {
        throw new Error(bookingResult.message || 'Failed to create booking')
      }

      const booking = bookingResult.data.booking
      const paymentPayload = bookingResult.data.payment
      const paymentError = bookingResult.data.paymentError

      if (!booking || !booking._id) {
        throw new Error('Invalid booking data received - missing booking ID')
      }

      if (paymentError) {
        throw new Error(typeof paymentError === 'string' ? paymentError : 'Payment could not be initiated')
      }

      if (!isBackendPaymentPayload(paymentPayload)) {
        throw new Error('Payment gateway response missing from server')
      }

      const gateway = paymentPayload.gateway as PaymentGatewayName
      setActiveGateway(gateway)

      const paymentReference = getPaymentReference(paymentPayload)
      setCorrelationIds({ transactionId: paymentReference, bookingId: booking.bookingId })

      appLogger.booking('Booking created — opening payment', {
        sourceFile: 'payment-integration.tsx',
        sourceFunction: 'handlePayment',
        bookingId: booking.bookingId,
        transactionId: paymentReference,
        data: { gateway, amount },
      })

      toast({
        title: "Booking Created",
        description: `Booking ID: ${booking.bookingId}. Initializing payment...`,
      })

      setPaymentStep('redirecting')

      toast({
        title: "Initializing Payment",
        description: "Redirecting to payment gateway...",
      })

      // Remember the Razorpay txn before checkout so a later app reopen can
      // detect a webhook-confirmed success. This is not a paid/processing state.
      if (gateway === 'razorpay') {
        savePendingPayment({
          txnId: paymentReference,
          orderId: paymentReference,
          gateway,
          amount,
          bookingId: booking._id,
          bookingNumber: booking.bookingId,
          bookingData: { vehicleNumber: bookingData.vehicleNumber },
          timestamp: Date.now(),
        })
      }

      const response = await initiatePaymentFromBackend(paymentPayload, {
        preferSameTabOnIOS: true,
      })

      appLogger.payment('Payment gateway opened', {
        sourceFile: 'payment-integration.tsx',
        sourceFunction: 'handlePayment',
        bookingId: booking.bookingId,
        transactionId: paymentReference,
        data: { gateway, status: response.status },
      })

      if (response.status === 'success') {
        localStorage.setItem('pendingPayment', JSON.stringify({
          txnId: paymentReference,
          orderId: paymentReference,
          gateway,
          amount,
          bookingData,
          bookingId: booking._id,
          timestamp: Date.now()
        }))

        setIsProcessing(false)
        setPaymentStep('ready')

        const isNative = Capacitor.isNativePlatform()
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

        toast({
          title: "Payment Gateway Opened",
          description: isIOS
            ? "Payment opened in this tab (iOS restriction). You'll be redirected back after completion."
            : isNative
              ? "Please complete your payment. We'll verify the status when you return."
              : "Please complete your payment. You will be redirected after completion.",
        })

        if (isNative) {
          try {
            const { Browser } = await import('@capacitor/browser')
            Browser.addListener('browserFinished', async () => {
              try {
                await checkPaymentStatus(gateway, paymentReference)
              } catch {}
            })
          } catch {}

          startPolling(gateway, paymentReference)
        }
      } else {
        throw new Error(response.error || 'Payment initiation failed')
      }

    } catch (error) {
      appLogger.error('payment', 'Payment flow failed', {
        sourceFile: 'payment-integration.tsx',
        sourceFunction: 'handlePayment',
        data: { error: error instanceof Error ? error.message : String(error) },
      })
      console.error('Payment error:', error)
      setIsProcessing(false)
      setPaymentStep('ready')

      const errorMessage = error instanceof Error ? error.message : 'Payment failed'

      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      })

      onPaymentFailure(errorMessage)
    }
  }

  const startPolling = (gateway: PaymentGatewayName, referenceId: string) => {
    stopPolling()
    pollingAttemptsRef.current = 0
    pollingTimerRef.current = setInterval(async () => {
      try {
        pollingAttemptsRef.current += 1
        if (pollingAttemptsRef.current > 40) {
          stopPolling()
          return
        }
        await checkPaymentStatus(gateway, referenceId, { silent: true })
      } catch {
        // keep polling
      }
    }, 4000)
  }

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }

  const checkPaymentStatus = async (
    gateway: PaymentGatewayName,
    referenceId: string,
    options?: { silent?: boolean }
  ) => {
    const silent = options?.silent === true
    try {
      const result = await verifyPaymentWithBackend(gateway, referenceId)

      const isSuccess =
        result.success &&
        (result.data?.status === 'success' || result.data?.bookingStatus === 'paid')

      if (isSuccess) {
        setIsProcessing(false)
        setPaymentStep('ready')
        stopPolling()
        localStorage.removeItem('pendingPayment')

        toast({
          title: "Payment Successful",
          description: "Your border tax pass has been booked successfully!",
        })

        onPaymentSuccess({
          status: 'success',
          txnId: referenceId,
          amount: amount.toString(),
          paymentId: result.data?.paymentId,
          paymentGatewayType: gateway,
          bankRefNumber: result.data?.bankRefNumber
        })
      } else if (result.data?.status === 'failure' && !silent) {
        throw new Error(result.message || 'Payment verification failed')
      }
    } catch (error) {
      if (silent) {
        console.warn('Payment status poll:', error)
        return
      }
      console.error('Payment verification error:', error)
      setIsProcessing(false)
      setPaymentStep('ready')
      stopPolling()

      const errorMessage = error instanceof Error ? error.message : 'Payment verification failed'
      onPaymentFailure(errorMessage)
    }
  }

  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
      }
    }
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Secure Payment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Border Tax Pass</span>
            <span>₹{amount}</span>
          </div>
          <div className="text-xs text-gray-600">
            {bookingData.visitingStateName} • {bookingData.planType}
          </div>
          <div className="text-xs text-gray-600">
            Vehicle: {bookingData.vehicleNumber}
          </div>
          <div className="text-xs text-gray-600">
            Valid: {new Date(bookingData.fromDate).toLocaleDateString()} to{' '}
            {new Date(bookingData.uptoDate).toLocaleDateString()}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Shield className="h-4 w-4 text-green-600" />
          <span>Secured by {getGatewayLabel(activeGateway ?? undefined)}</span>
        </div>

        {paymentStep === 'processing' && (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing payment...</span>
          </div>
        )}

        {paymentStep === 'redirecting' && (
          <div className="flex items-center space-x-2 text-sm text-orange-600">
            <AlertCircle className="h-4 w-4" />
            <span>Redirecting to payment gateway...</span>
          </div>
        )}

        <Button
          onClick={handlePayment}
          disabled={disabled || isProcessing}
          className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {paymentStep === 'processing' ? 'Processing...' : 'Redirecting...'}
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5 mr-2" />
              Pay ₹{amount} Securely
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          We accept Credit Cards, Debit Cards, Net Banking, UPI & Wallets
        </div>
      </CardContent>
    </Card>
  )
}

export default PaymentIntegration
