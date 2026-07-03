"use client"
import React, { useEffect, useState } from 'react'
import { MobileLayout } from '@/components/mobile-layout'
import { Card } from '@/components/ui/card'
import { cabAPI, type CabBookingPublic, ApiError } from '@/lib/api'
import { Calendar, MapPin, Loader2, CheckCircle } from 'lucide-react'

export default function CabBookingsListPage() {
  const [items, setItems] = useState<CabBookingPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    const res = await cabAPI.listUnassigned(50)
    if ((res as ApiError).success === false) {
      setItems([])
    } else {
      setItems((res as any).data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    // Load previously submitted interests from localStorage
    const raw = typeof window !== 'undefined' ? localStorage.getItem('cab_interest_ids') : null
    if (raw) {
      try { setSubmittedIds(new Set(JSON.parse(raw))) } catch {}
    }
    load()
  }, [])

  const openInterest = (id: string) => {
    setSelectedId(id)
    setConfirmOpen(true)
  }

  const submitInterest = async () => {
    if (!selectedId) return
    setSubmitting(true)
    const res = await cabAPI.expressInterest(selectedId)
    setSubmitting(false)
    if ((res as ApiError).success === false) return
    setSubmittedIds(prev => {
      const next = new Set(prev)
      next.add(selectedId)
      if (typeof window !== 'undefined') localStorage.setItem('cab_interest_ids', JSON.stringify(Array.from(next)))
      return next
    })
    setConfirmOpen(false)
  }

  return (
    <MobileLayout title="Cab Bookings">
      <div className="px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-600">No unassigned bookings available right now.</div>
        ) : (
          <div className="space-y-3">
            {items.map((b) => (
              <Card key={b._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{b.from_location} → {b.to_location}</div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center"><Calendar className="h-4 w-4 mr-1" />{new Date(b.start_date).toLocaleDateString()} • {b.trip_type === 'one_way' ? 'One Way' : 'Round Trip'}</div>
                    {b.return_date && <div className="text-xs text-gray-600">Return: {new Date(b.return_date).toLocaleDateString()}</div>}
                  </div>
                  {submittedIds.has(b._id) ? (
                    <div className="flex items-center text-green-600 text-sm font-medium"><CheckCircle className="h-4 w-4 mr-1" />Interested</div>
                  ) : (
                    <button onClick={() => openInterest(b._id)} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-md">I'm Interested</button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 w-full max-w-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Confirm Interest</h3>
              <p className="text-sm text-gray-600 mb-4">We will contact you soon using your registered phone number.</p>
              <div className="flex justify-end space-x-2">
                <button onClick={()=>setConfirmOpen(false)} className="px-3 py-2 rounded-md text-sm bg-gray-100">Cancel</button>
                <button disabled={submitting} onClick={submitInterest} className="px-3 py-2 rounded-md text-sm bg-blue-600 text-white disabled:opacity-50">{submitting ? 'Submitting...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  )
}


