"use client"
import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/mobile-layout'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ApiError, insuranceAPI } from '@/lib/api'
import { Car, Phone, ShieldCheck, Loader2, CheckCircle, MessageCircle } from 'lucide-react'

export default function InsuranceInquiryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [vehicle, setVehicle] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFormValid = useMemo(() => {
    const v = vehicle.trim().toUpperCase()
    const p = phone.trim()
    const vehicleOk = v.length >= 6 // simple guard
    const phoneOk = /^\d{10}$/.test(p)
    return vehicleOk && phoneOk
  }, [vehicle, phone])

  const openWhatsAppSupport = () => {
    // Format phone number for WhatsApp (India country code: 91)
    const phoneNumber = '918930449797' // Support number: 8930449797
    const message = encodeURIComponent('Hello, I need help with insurance inquiry.')
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return
    setError(null)
    setSubmitting(true)
    const res = await insuranceAPI.submitInquiry(vehicle.trim().toUpperCase(), phone.trim())
    setSubmitting(false)
    if ((res as ApiError).success === false) {
      const msg = (res as ApiError).message || 'Failed to submit inquiry'
      setError(msg)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <MobileLayout title="Insurance">
        <div className="px-4 py-6">
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-green-600 p-2 rounded-full">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-green-900">Inquiry Submitted</h1>
                  <p className="text-sm text-green-800">We will contact you soon about your car insurance.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 active:scale-[0.99]"
            >
              Go to Dashboard
            </button>
            <Link href="/insurance-inquiry" className="block">
              <button className="w-full bg-white text-gray-900 border rounded-lg py-2.5 font-medium active:scale-[0.99]">
                Submit Another Inquiry
              </button>
            </Link>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Insurance">
      <div className="px-4 py-6">
        {/* Header Banner */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-5">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-full">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold">Get Car Insurance</h2>
                <p className="text-indigo-100 text-sm">Share your details and we will reach out shortly.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
            <div className="relative">
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value.toUpperCase())}
                placeholder="e.g. RJ14AB1234"
                className="w-full rounded-md border-gray-300 pl-10 h-11 focus:border-blue-500 focus:ring-blue-500 font-medium tracking-wider uppercase"
                inputMode="text"
                autoCapitalize="characters"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Enter your registered vehicle number.</p>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                placeholder="e.g. 9876543210"
                className="w-full rounded-md border-gray-300 pl-10 h-11 focus:border-blue-500 focus:ring-blue-500"
                inputMode="numeric"
                pattern="\d{10}"
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">We’ll call or WhatsApp you on this number.</p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>
          )}

          <button
            disabled={submitting || !isFormValid}
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg h-11 font-medium hover:bg-blue-700 disabled:opacity-50 active:scale-[0.99] flex items-center justify-center"
          >
            {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>) : 'Submit Inquiry'}
          </button>

          <p className="text-xs text-gray-500 text-center">By submitting, you agree to be contacted for insurance assistance.</p>
        </form>

        {/* WhatsApp Support Button */}
        <div className="mt-6">
          <button
            onClick={openWhatsAppSupport}
            className="w-full bg-green-600 text-white rounded-lg h-11 font-medium hover:bg-green-700 active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Contact Support on WhatsApp</span>
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">Need immediate help? Chat with our support team</p>
        </div>
      </div>
    </MobileLayout>
  )
}


