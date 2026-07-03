"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, Shield, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { PayUService, PayUPaymentData, PayUResponse } from '@/lib/payu'
import { payuConfig, base_url } from '../environment'
import { borderTaxAPI, tokenManager, authenticatedFetch } from '@/lib/api'

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
  const { toast } = useToast()
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingAttemptsRef = useRef<number>(0)

  // Create PayU service instance
  const payuService = React.useMemo(() => new PayUService(payuConfig), [])

  const handlePayment = async () => {
    try {
      setIsProcessing(true)
      setPaymentStep('processing')

      console.log('🚀 Payment initiated with:', {
        amount: amount,
        amountType: typeof amount,
        bookingData: bookingData,
        userInfo: userInfo
      })

      toast({
        title: "Creating Booking",
        description: "Preparing your border tax pass...",
      })

      // Step 1: Create booking first
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
      
      console.log('📋 Booking creation result:', bookingResult)
      
      if (!bookingResult.success) {
        throw new Error(bookingResult.message || 'Failed to create booking')
      }

      const booking = bookingResult.data.booking // The booking is inside the booking property
      console.log('📋 Booking data received:', booking)
      console.log('📋 Booking._id:', booking._id)
      console.log('📋 Booking.bookingId:', booking.bookingId)
      
      if (!booking || !booking._id) {
        throw new Error('Invalid booking data received - missing booking ID')
      }
      
      toast({
        title: "Booking Created",
        description: `Booking ID: ${booking.bookingId}. Initializing payment...`,
      })

      // Step 2: Generate transaction ID  
      const txnId = payuService.generateTxnId()

      // Step 3: Validate and prepare payment data
      // PayU requires minimum amount of ₹1 and proper format
      if (!amount || amount < 1) {
        throw new Error('Invalid amount: Minimum ₹1 required for payment')
      }
      
      // Format amount to 2 decimal places as string (PayU requirement)
      const formattedAmount = parseFloat(amount.toString()).toFixed(2)
      
      const isNative = Capacitor.isNativePlatform()
      const successUrl = `${base_url}/payment/success${isNative ? '?platform=app' : ''}`
      const failureUrl = `${base_url}/payment/failure${isNative ? '?platform=app' : ''}`

      const paymentData: Omit<PayUPaymentData, 'hash'> = {
        amount: formattedAmount,
        productInfo: `Border Tax Pass - ${bookingData.visitingStateName} (${bookingData.planType})`,
        firstName: userInfo.firstName,
        email: userInfo.email,
        phone: userInfo.phone,
        txnId: txnId,
        surl: successUrl,
        furl: failureUrl,
        udf1: booking._id, // Store booking ID for backend callback
        udf2: booking.bookingId,
        udf3: bookingData.vehicleNumber
      }
      
      console.log('📦 Payment Data being sent to PayU service:', paymentData)
      
      console.log('💰 Payment amount validation:', {
        originalAmount: amount,
        formattedAmount: formattedAmount,
        isValid: amount >= 1
      })

      // Step 4: Update booking with transaction ID using the updateBookingStatus endpoint
      const updateResult = await authenticatedFetch(`${base_url}/bookings/${booking._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`
        },
        body: JSON.stringify({
          status: 'pending',
          payment_method: 'payu',
          transaction_id: txnId
        })
      })

      if (!updateResult.ok) {
        throw new Error('Failed to update booking with transaction ID')
      }

      setPaymentStep('redirecting')
      
      toast({
        title: "Initializing Payment",
        description: "Redirecting to payment gateway...",
      })

      // Step 5: Initiate payment
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      const response = await payuService.initiatePayment(paymentData, {
        preferSameTabOnIOS: true,
      })

      if (response.status === 'success') {
        // Store transaction details for verification
        localStorage.setItem('pendingPayment', JSON.stringify({
          txnId,
          amount,
          bookingData,
          bookingId: booking._id,
          timestamp: Date.now()
        }))

        setIsProcessing(false)
        setPaymentStep('ready')
        
        toast({
          title: "Payment Gateway Opened",
          description: isIOS
            ? "Payment opened in this tab (iOS restriction). You'll be redirected back after completion."
            : "Please complete your payment in the new tab. You will be redirected after completion.",
        })

        // If running as a native app, start polling backend for final status
        if (isNative) {
          try {
            const { Browser } = await import('@capacitor/browser')
            // When user closes the payment view, immediately check status once
            Browser.addListener('browserFinished', async () => {
              try {
                await checkPaymentStatus(txnId)
              } catch {}
            })
          } catch {}

          // Start periodic polling until success or timeout
          startPolling(txnId)
        }

      } else {
        throw new Error(response.error || 'Payment initiation failed')
      }

    } catch (error) {
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

  const startPolling = (txnId: string) => {
    stopPolling()
    pollingAttemptsRef.current = 0
    // Poll every 4s, up to 150s (~37 attempts)
    pollingTimerRef.current = setInterval(async () => {
      try {
        pollingAttemptsRef.current += 1
        if (pollingAttemptsRef.current > 40) {
          stopPolling()
          return
        }
        await checkPaymentStatus(txnId)
      } catch {
        // ignore and keep polling
      }
    }, 4000)
  }

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }

  const checkPaymentStatus = async (txnId: string) => {
    try {
      const result = await payuService.verifyPayment(txnId)
      
      if (result.success && result.data.status === 'success') {
        setIsProcessing(false)
        setPaymentStep('ready')
        stopPolling()
        
        // Clear pending payment
        localStorage.removeItem('pendingPayment')
        
        toast({
          title: "Payment Successful",
          description: "Your border tax pass has been booked successfully!",
        })
        
        onPaymentSuccess({
          status: 'success',
          txnId: txnId,
          amount: amount.toString(),
          paymentId: result.data.paymentId,
          paymentGatewayType: result.data.paymentGatewayType,
          bankRefNumber: result.data.bankRefNumber
        })
      } else {
        throw new Error(result.message || 'Payment verification failed')
      }
    } catch (error) {
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
        {/* Payment Summary */}
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

        {/* Security Badge */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Shield className="h-4 w-4 text-green-600" />
          <span>Secured by PayU Payment Gateway</span>
        </div>

        {/* Payment Status */}
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

        {/* Payment Button */}
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

        {/* Payment Methods Info */}
        <div className="text-xs text-gray-500 text-center">
          We accept Credit Cards, Debit Cards, Net Banking, UPI & Wallets
        </div>
      </CardContent>
    </Card>
  )
}

export default PaymentIntegration