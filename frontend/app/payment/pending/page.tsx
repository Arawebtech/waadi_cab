"use client"

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const PaymentPendingContent = dynamic(() => import('./PaymentPendingContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Checking Payment Status</h2>
        <p className="text-gray-600">Please wait...</p>
      </div>
    </div>
  ),
})

export default function PaymentPendingPage() {
  return <PaymentPendingContent />
}
