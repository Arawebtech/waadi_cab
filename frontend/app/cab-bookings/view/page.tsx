"use client"
import React, { useEffect, useState } from 'react'
import { MobileLayout } from '@/components/mobile-layout'
import { Card } from '@/components/ui/card'
import { cabAPI, type CabBookingPublic, ApiError } from '@/lib/api'
import { Calendar, Loader2, CheckCircle } from 'lucide-react'

export default function CabBookingDetailViewPage() {
  const [item, setItem] = useState<CabBookingPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? sessionStorage.getItem('cab_view_id') : null
    async function load() {
      if (!storedId) { setLoading(false); return }
      const res = await cabAPI.getById(storedId)
      if ((res as ApiError).success === false) setItem(null); else setItem((res as any).data)
      setLoading(false)
    }
    load()
    // Read prior submissions
    if (typeof window !== 'undefined' && storedId) {
      const raw = localStorage.getItem('cab_interest_ids')
      if (raw) {
        try { const setIds = new Set(JSON.parse(raw)); if (setIds.has(storedId)) setSubmitted(true) } catch {}
      }
    }
  }, [])

  const submit = async () => {
    const id = typeof window !== 'undefined' ? sessionStorage.getItem('cab_view_id') : null
    if (!id) return
    setSubmitting(true)
    const res = await cabAPI.expressInterest(id)
    setSubmitting(false)
    if ((res as ApiError).success === false) return
    setSubmitted(true)
    // Persist submission
    const raw = typeof window !== 'undefined' ? localStorage.getItem('cab_interest_ids') : null
    const ids = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
    ids.add(id)
    if (typeof window !== 'undefined') localStorage.setItem('cab_interest_ids', JSON.stringify(Array.from(ids)))
  }

  return (
    <MobileLayout title="Cab Booking">
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : !item ? (
          <div className="text-center text-gray-600">No booking selected</div>
        ) : (
          <Card className="p-4">
            <div className="text-sm font-semibold text-gray-900">{item.from_location} → {item.to_location}</div>
            <div className="text-xs text-gray-600 mt-1 flex items-center"><Calendar className="h-4 w-4 mr-1" />{new Date(item.start_date).toLocaleDateString()} • {item.trip_type === 'one_way' ? 'One Way' : 'Round Trip'}</div>
            {item.return_date && <div className="text-xs text-gray-600">Return: {new Date(item.return_date).toLocaleDateString()}</div>}

            {submitted ? (
              <div className="mt-4 flex items-center text-green-600 text-sm font-medium"><CheckCircle className="h-4 w-4 mr-1" />We will contact you soon.</div>
            ) : (
              <div className="mt-4">
                <div className="text-sm text-gray-700 mb-3">Interested in this booking?</div>
                <button 
                  disabled={submitting} 
                  onClick={submit} 
                  className="w-full px-4 py-3 rounded-md bg-blue-600 text-white disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Sending...' : 'I\'m Interested'}
                </button>
              </div>
            )}
          </Card>
        )}
      </div>
    </MobileLayout>
  )
}


