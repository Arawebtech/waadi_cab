import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { base_url } from '../environment'
import { dispatchBookingUpdated } from './socket-service'

export interface PushNotificationData {
  title: string
  body: string
  data?: Record<string, any>
  id?: string
}

class PushNotificationService {
  private isInitialized = false
  private fcmToken: string | null = null

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Push notifications already initialized')
      return
    }

    try {
      console.log('🔔 Initializing push notifications...')
      console.log('🔔 Platform:', Capacitor.getPlatform())

      // Check current permissions first
      const currentPermissions = await PushNotifications.checkPermissions()
      console.log('🔔 Current permissions:', currentPermissions)

      // Request permissions
      const permissionStatus = await PushNotifications.requestPermissions()
      console.log('🔔 Permission request result:', permissionStatus)
      
      if (permissionStatus.receive === 'granted') {
        console.log('✅ Push notification permissions granted')
        
        // Register for push notifications
        console.log('🔔 Registering for push notifications...')
        await PushNotifications.register()
        console.log('🔔 Push notification registration completed')
        
        // Set up listeners
        this.setupListeners()
        
        this.isInitialized = true
        console.log('✅ Push notifications initialized successfully')
      } else {
        console.log('❌ Push notification permissions denied')
        console.log('❌ Permission status:', permissionStatus)
      }
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error)
      console.error('❌ Error details:', error.message)
    }
  }

  private setupListeners(): void {
    console.log('🔧 Setting up push notification listeners...')
    
    // Registration success
    PushNotifications.addListener('registration', (token) => {
      console.log('🔔 Push registration success:', token.value)
      console.log('🔔 Token length:', token.value.length)
      console.log('🔔 Token preview:', token.value.substring(0, 50) + '...')
      this.fcmToken = token.value
      
      // Send token to your backend
      this.sendTokenToBackend(token.value)
    })

    // Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error.error)
      console.error('❌ Registration error details:', error)
    })

    // Push notification received (when app is in foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📱 Push notification received (foreground):', notification)
      console.log('📱 Notification title:', notification.title)
      console.log('📱 Notification body:', notification.body)
      console.log('📱 Notification data:', notification.data)
      console.log('📱 Notification ID:', notification.id)

      const data = notification.data || {}
      const type = (data.type || '').toString()
      if (type === 'tax_slip_ready') {
        dispatchBookingUpdated({
          bookingId: data.bookingId,
          source: 'push-tax-slip-ready',
        })
      }
      
      // Show local notification
      this.showLocalNotification({
        title: notification.title || 'Wadi Cab',
        body: notification.body || '',
        data: notification.data,
        id: notification.id
      })
    })

    // Push notification clicked (when app is in background/closed)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('👆 Push notification action performed (background):', notification)
      console.log('👆 Action notification:', notification.notification)
      console.log('👆 Action data:', notification.notification?.data)
      console.log('👆 Action ID:', notification.notification?.id)
      
      // Handle notification click
      this.handleNotificationClick(notification)
    })
    
    console.log('✅ Push notification listeners setup complete')
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const response = await fetch(`${base_url}/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Capacitor.getPlatform(),
          userId: this.getUserId(), // Get from your auth system
        }),
      })

      if (response.ok) {
        console.log('✅ FCM token sent to backend successfully')
      } else {
        console.error('❌ Failed to send FCM token to backend')
      }
    } catch (error) {
      console.error('❌ Error sending FCM token to backend:', error)
    }
  }

  private getUserId(): string | null {
    // Get user ID from your authentication system
    // This could be from localStorage, context, etc.
    try {
      // Prefer app auth storage if available
      const authRaw = localStorage.getItem('auth') || localStorage.getItem('user') || localStorage.getItem('userData')
      if (!authRaw) return null
      const obj = JSON.parse(authRaw)
      // Try common keys
      return obj._id || obj.id || obj.userId || obj.user?.id || obj.user?._id || null
    } catch {
      return null
    }
  }

  private showLocalNotification(notification: PushNotificationData): void {
    // For web, you can use the browser's notification API
    if (Capacitor.getPlatform() === 'web') {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.body,
          icon: '/icon-192x192.png', // Your app icon
          badge: '/icon-192x192.png',
          tag: notification.id,
          data: notification.data,
        })
      }
    }
  }

  private handleNotificationClick(notification: any): void {
    // Handle notification click - route by type
    const data = notification?.notification?.data || {}
    const type = (data.type || '').toString()

    if (type === 'insurance') {
      window.location.href = '/insurance-inquiry'
      return
    }
    if (type === 'border-tax' || type === 'border_tax' || type === 'borderTax') {
      window.location.href = '/border-tax'
      return
    }
    // Default and booking
    window.location.href = '/dashboard'
  }

  async getFCMToken(): Promise<string | null> {
    return this.fcmToken
  }

  async checkPermissions(): Promise<boolean> {
    try {
      const permissionStatus = await PushNotifications.checkPermissions()
      return permissionStatus.receive === 'granted'
    } catch (error) {
      console.error('❌ Error checking permissions:', error)
      return false
    }
  }

  async removeAllDeliveredNotifications(): Promise<void> {
    try {
      await PushNotifications.removeAllDeliveredNotifications()
      console.log('✅ All delivered notifications removed')
    } catch (error) {
      console.error('❌ Error removing delivered notifications:', error)
    }
  }

  async getDeliveredNotifications(): Promise<any[]> {
    try {
      const result = await PushNotifications.getDeliveredNotifications()
      return result.notifications
    } catch (error) {
      console.error('❌ Error getting delivered notifications:', error)
      return []
    }
  }

  // Debug method to test notifications
  async testNotification(): Promise<void> {
    console.log('🧪 Testing push notification...')
    console.log('🧪 Current FCM token:', this.fcmToken)
    console.log('🧪 Is initialized:', this.isInitialized)
    
    try {
      const response = await fetch(`${base_url}/push/test-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '🧪 Debug Test',
          body: 'Testing push notification from frontend',
          data: {
            type: 'debug',
            timestamp: new Date().toISOString(),
          },
        }),
      })

      const result = await response.json()
      console.log('🧪 Test notification response:', result)
      
      if (result.success) {
        console.log('✅ Test notification sent successfully')
        console.log('✅ Message ID:', result.messageId)
      } else {
        console.error('❌ Test notification failed:', result.message)
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error)
    }
  }

  // Update FCM token for authenticated user
  async updateTokenForUser(): Promise<void> {
    try {
      if (!this.fcmToken) {
        console.warn('⚠️ No FCM token available to update')
        return
      }
      
      const response = await fetch(`${base_url}/push/update-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
        body: JSON.stringify({
          token: this.fcmToken,
          platform: Capacitor.getPlatform(),
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ FCM token updated for user successfully')
      } else {
        console.error('❌ Failed to update FCM token:', result.message)
      }
    } catch (error) {
      console.error('❌ Error updating FCM token for user:', error)
    }
  }
  
  // Helper method to get access token
  private getAccessToken(): string | null {
    try {
      return localStorage.getItem('wadi_cab_access_token')
    } catch {
      return null
    }
  }

  // Debug method to check all notification states
  async debugNotificationState(): Promise<void> {
    console.log('🔍 === PUSH NOTIFICATION DEBUG STATE ===')
    console.log('🔍 Is initialized:', this.isInitialized)
    console.log('🔍 FCM token:', this.fcmToken)
    console.log('🔍 Platform:', Capacitor.getPlatform())
    
    try {
      const permissions = await this.checkPermissions()
      console.log('🔍 Permissions granted:', permissions)
      
      const delivered = await this.getDeliveredNotifications()
      console.log('🔍 Delivered notifications:', delivered.length)
      
      console.log('🔍 === END DEBUG STATE ===')
    } catch (error) {
      console.error('❌ Error in debug state:', error)
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService()
