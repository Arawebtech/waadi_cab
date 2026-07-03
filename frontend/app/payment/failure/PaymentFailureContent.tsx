'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/mobile-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function PaymentFailureContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [txnId, setTxnId] = useState('')
  const [status, setStatus] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // Parse URL parameters manually to avoid hydration issues
    const urlParams = new URLSearchParams(window.location.search)
    setTxnId(urlParams.get('txnid') || '')
    setStatus(urlParams.get('status') || '')
    setErrorCode(urlParams.get('error_code') || '')
    setErrorMessage(urlParams.get('error') || '')

    // Show failure message
    toast({
      title: "Payment Failed",
      description: urlParams.get('error') || "Your payment was not completed. Please try again.",
      variant: "destructive",
    })
  }, [toast])

  const handleRetry = () => {
    // Clear any pending payment data
    localStorage.removeItem('pendingPayment')
    
    // Go back to border tax form
    router.push('/border-tax')
  }

  const handleGoHome = () => {
    // Clear any pending payment data
    localStorage.removeItem('pendingPayment')
    
    // Go to dashboard
    router.push('/dashboard')
  }

  // Update page title to show transaction details
  useEffect(() => {
    if (txnId) {
      document.title = `Payment Failed - ${txnId}`
    }
  }, [txnId])

  return (
    <MobileLayout title="Payment Failed" showBackButton={false}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Payment Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-gray-600">
                {errorMessage || "Unfortunately, your payment could not be processed."}
              </p>
              {txnId && (
                <p className="text-sm text-gray-500">
                  Transaction ID: {txnId}
                </p>
              )}
              {status && (
                <p className="text-sm text-gray-500">
                  Status: {status}
                </p>
              )}
              {errorCode && (
                <p className="text-sm text-gray-500">
                  Error Code: {errorCode}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button
                onClick={handleGoHome}
                variant="outline"
                className="w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                If you continue to experience issues, please contact our support team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  )
}
