'use client'

import { useEffect } from 'react'
import { BOOKING_UPDATED_EVENT, type BookingRealtimePayload } from '@/lib/socket-service'

export function useBookingRealtimeRefresh(
  onUpdate: (detail: BookingRealtimePayload) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<BookingRealtimePayload>
      onUpdate(customEvent.detail || {})
    }

    window.addEventListener(BOOKING_UPDATED_EVENT, handler)
    return () => window.removeEventListener(BOOKING_UPDATED_EVENT, handler)
  }, [enabled, onUpdate])
}
