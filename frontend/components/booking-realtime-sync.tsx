'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { tokenManager } from '@/lib/api'
import { mobileSocketService } from '@/lib/socket-service'

/**
 * Keeps a Socket.IO connection open for the logged-in user so
 * booking/document updates arrive without manual refresh.
 */
export default function BookingRealtimeSync() {
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      mobileSocketService.disconnect()
      return
    }

    const user = tokenManager.getUserData()
    const userId = user?._id
    if (!userId) return

    mobileSocketService.connect(userId)

    return () => {
      mobileSocketService.disconnect()
    }
  }, [isAuthenticated, isLoading])

  return null
}
