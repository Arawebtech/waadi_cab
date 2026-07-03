"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/mobile-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, Share2, Home, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import journeyLogger from '@/lib/journeyLogger'

export default function PaymentSuccessContent() {
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [paymentVerified, setPaymentVerified] = useState(false)
  const [bookingId, setBookingId] = useState('')
  const [amount, setAmount] = useState('')
  const [txnId, setTxnId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      processPaymentSuccess()
    }, 200)

    return () => clearTimeout(timer)
  }, [])

  const processPaymentSuccess = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const txnIdFromUrl = urlParams.get('txnid') || urlParams.get('order_id')
      const status = urlParams.get('status')
      const amountFromUrl = urlParams.get('amount')
      const bookingIdFromUrl = urlParams.get('bookingId')

      if (!txnIdFromUrl) {
        throw new Error('Transaction ID not found')
      }

      setTxnId(txnIdFromUrl)

      if (!status || status !== 'success') {
        throw new Error('Invalid payment status')
      }
      if (!amountFromUrl || !bookingIdFromUrl) {
        throw new Error('Payment details incomplete')
      }

      setPaymentVerified(true)
      setBookingId(bookingIdFromUrl)
      setAmount(amountFromUrl)

      journeyLogger.paymentSuccess({
        sourceFile: 'PaymentSuccessContent.tsx',
        sourceFunction: 'processPaymentSuccess',
        bookingId: bookingIdFromUrl,
        transactionId: txnIdFromUrl,
        data: { amount: amountFromUrl, status },
      })
      journeyLogger.bookingConfirmed({
        sourceFile: 'PaymentSuccessContent.tsx',
        sourceFunction: 'processPaymentSuccess',
        bookingId: bookingIdFromUrl,
        transactionId: txnIdFromUrl,
        data: { amount: amountFromUrl },
      })
      journeyLogger.bookingCompleted({
        sourceFile: 'PaymentSuccessContent.tsx',
        sourceFunction: 'processPaymentSuccess',
        bookingId: bookingIdFromUrl,
        transactionId: txnIdFromUrl,
        data: { amount: amountFromUrl },
      })

      localStorage.removeItem('pendingPayment')
      localStorage.removeItem('borderTaxFormData')

      toast({
        title: 'Payment Successful!',
        description: 'Your border tax pass has been booked successfully.',
      })
    } catch (error) {
      console.error('Payment success processing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unable to process payment success'
      setError(errorMessage)
      setPaymentVerified(false)

      toast({
        title: 'Payment Processing Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPass = () => {
    toast({
      title: 'Download Pass',
      description: 'Pass download feature will be available soon.',
    })
  }

  const handleSharePass = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Border Tax Pass',
        text: `My border tax pass booking ID: ${bookingId}`,
        url: window.location.href,
      })
    } else {
      toast({
        title: 'Share Pass',
        description: 'Share feature will be available soon.',
      })
    }
  }

  if (isLoading) {
    return (
      <MobileLayout title="Processing Payment" showBackButton={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  if (!paymentVerified) {
    return (
      <MobileLayout title="Payment Failed" showBackButton={false}>
        <div className="px-4 py-8 text-center">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <div className="text-red-600 text-2xl">✗</div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Verification Failed</h2>
          <p className="text-gray-600 mb-6">{error || "We couldn't verify your payment. Please try again."}</p>
          <Button onClick={() => router.push('/border-tax')} className="w-full">
            Try Again
          </Button>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Payment Successful" showBackButton={false}>
      <div className="px-4 py-8">
        <div className="text-center mb-8">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your border tax pass has been booked successfully.</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Booking Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium">{bookingId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium">₹{amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-medium text-sm">{txnId || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button onClick={handleDownloadPass} className="w-full" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download Pass
          </Button>
          <Button onClick={handleSharePass} className="w-full" variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share Pass
          </Button>
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </MobileLayout>
  )
}
