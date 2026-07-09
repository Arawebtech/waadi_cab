import { io, Socket } from 'socket.io-client'
import { api_url } from '../environment'

export const BOOKING_UPDATED_EVENT = 'waadi:booking-updated'

export type BookingRealtimePayload = {
  booking?: Record<string, unknown>
  bookingId?: string
  source?: string
}

function normalizeSocketUrl(): string {
  return api_url.replace(/\/+$/, '')
}

class MobileSocketService {
  private socket: Socket | null = null
  private userId: string | null = null

  connect(userId: string) {
    if (!userId) return

    this.userId = userId

    if (this.socket?.connected) {
      this.socket.emit('join-user', { userId })
      return
    }

    if (this.socket) {
      this.socket.connect()
      return
    }

    this.socket = io(normalizeSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })

    this.socket.on('connect', () => {
      if (this.userId) {
        this.socket?.emit('join-user', { userId: this.userId })
      }
    })

    this.socket.on('booking-updated', (data: { booking?: Record<string, unknown> }) => {
      this.dispatchBookingUpdate(data?.booking, 'booking-updated')
    })

    this.socket.on('tax-slip-ready', (data: { booking?: Record<string, unknown> }) => {
      this.dispatchBookingUpdate(data?.booking, 'tax-slip-ready')
    })
  }

  private dispatchBookingUpdate(
    booking: Record<string, unknown> | undefined,
    source: string
  ) {
    if (typeof window === 'undefined') return

    const detail: BookingRealtimePayload = {
      booking,
      bookingId: (booking?._id as string) || (booking?.id as string),
      source,
    }

    window.dispatchEvent(new CustomEvent(BOOKING_UPDATED_EVENT, { detail }))
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
    this.userId = null
  }

  isConnected() {
    return !!this.socket?.connected
  }
}

export const mobileSocketService = new MobileSocketService()

export function dispatchBookingUpdated(detail: BookingRealtimePayload) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(BOOKING_UPDATED_EVENT, { detail }))
}
