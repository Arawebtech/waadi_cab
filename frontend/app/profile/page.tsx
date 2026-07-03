"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MobileLayout } from "@/components/mobile-layout"
import { useToast } from "@/components/ui/use-toast"
import { profileAPI, type ProfileUser } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { User, Car, Bell, Shield, ChevronRight, LogOut, Phone, Loader2, CheckCircle, XCircle, Wifi, WifiOff, Camera, Upload, X } from "lucide-react"
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { logout } = useAuth()
  const [profile, setProfile] = useState<ProfileUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    // Check online/offline status
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine)
    }

    // Set initial status
    handleOnlineStatus()

    // Add event listeners
    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)

    // Load profile image from localStorage
    loadProfileImage()

    // Fetch profile data
    fetchProfile()

    return () => {
      window.removeEventListener('online', handleOnlineStatus)
      window.removeEventListener('offline', handleOnlineStatus)
    }
  }, [])

  const loadProfileImage = () => {
    const savedImage = localStorage.getItem('profileImage')
    if (savedImage) {
      setProfileImage(savedImage)
    }
  }

  const saveProfileImage = (imageData: string) => {
    localStorage.setItem('profileImage', imageData)
    setProfileImage(imageData)
  }

  const handleImageUpload = async () => {
    try {
      setIsUploading(true)
      
      // Check if we're in a Capacitor environment
      if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
        // Use Capacitor Camera plugin
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: true,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt, // Let user choose between camera and gallery
          width: 400,
          height: 400
        })

        if (image.dataUrl) {
          saveProfileImage(image.dataUrl)
          toast({
            title: "Success",
            description: "Profile photo updated successfully",
          })
        }
      } else {
        // Fallback for web browsers - use file input
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0]
          if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
              toast({
                title: "Invalid File",
                description: "Please select an image file (JPEG, PNG, etc.)",
                variant: "destructive",
              })
              return
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
              toast({
                title: "File Too Large",
                description: "Please select an image smaller than 5MB",
                variant: "destructive",
              })
              return
            }

            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result as string
              saveProfileImage(result)
              toast({
                title: "Success",
                description: "Profile photo updated successfully",
              })
            }
            reader.onerror = () => {
              toast({
                title: "Error",
                description: "Failed to upload image. Please try again.",
                variant: "destructive",
              })
            }
            reader.readAsDataURL(file)
          }
        }
        input.click()
      }
    } catch (error) {
      console.error('Camera error:', error)
      
      // Handle user cancellation gracefully
      if (error.message === 'User cancelled photos app') {
        // User cancelled, no need to show error
        return
      }
      
      toast({
        title: "Error",
        description: "Failed to capture image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeProfileImage = () => {
    localStorage.removeItem('profileImage')
    setProfileImage(null)
    toast({
      title: "Removed",
      description: "Profile photo removed",
    })
  }

  const triggerFileInput = () => {
    // For Capacitor, we directly call the camera function
    handleImageUpload()
  }

  const fetchProfile = async () => {
    if (!navigator.onLine) {
      setIsOffline(true)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setRetryCount(prev => prev + 1)
      
      const result = await profileAPI.getProfile()
      
      if (result.success) {
        setProfile(result.data.user)
        setIsOffline(false)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setIsOffline(true)
        toast({
          title: "Network Error",
          description: "No internet connection. You can still sign out.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      // Try to call logout API if online
      if (navigator.onLine) {
        await logout()
      } else {
        // Offline logout - clear local storage and redirect
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('profileImage')
        sessionStorage.clear()
      }
      
      toast({
        title: "Signed Out",
        description: isOffline 
          ? "You have been signed out (offline mode)." 
          : "You have been successfully signed out.",
      })
      
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      console.error('Logout error:', error)
      
      // Force logout even if API fails
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('profileImage')
      sessionStorage.clear()
      
      toast({
        title: "Signed Out",
        description: "You have been signed out.",
      })
      
      router.push("/login")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <MobileLayout title="Profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </MobileLayout>
    )
  }

  // Offline state with logout option
  if (isOffline && !profile) {
    return (
      <MobileLayout title="Profile">
        <div className="px-4 py-8 text-center">
          <div className="bg-yellow-50 p-6 rounded-full w-20 h-20 mx-auto mb-4">
            <WifiOff className="h-12 w-12 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Internet Connection</h2>
          <p className="text-gray-600 mb-6">
            Unable to load your profile. Please check your connection and try again.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={fetchProfile} 
              variant="outline" 
              className="w-full"
              disabled={!navigator.onLine}
            >
              <Wifi className="h-4 w-4 mr-2" />
              Retry When Online
            </Button>
            
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            You can still sign out even without internet connection
          </p>
        </div>
      </MobileLayout>
    )
  }

  // Error state with logout option
  if (!profile && !isOffline) {
    return (
      <MobileLayout title="Profile">
        <div className="px-4 py-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Profile</h2>
          <p className="text-gray-600 mb-6">
            {retryCount > 3 ? "Multiple attempts failed. Please try again later." : "Please try again."}
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={fetchProfile} 
              variant="outline" 
              className="w-full"
              disabled={retryCount > 3}
            >
              {retryCount > 3 ? "Too Many Attempts" : "Retry"}
            </Button>
            
            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Profile">
      <div className="px-4 py-6">
        {/* Hidden file input - removed for Capacitor */}
        {/* <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        /> */}

        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">You're offline</span>
            </div>
            <p className="text-xs text-yellow-600 mt-1">
              Some features may not work. You can still sign out.
            </p>
          </div>
        )}

        {/* Profile Header with Photo Upload */}
        <Card className="mobile-card mb-6">
          <CardContent className="p-6 text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              {profileImage ? (
                <div className="relative">
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-100"
                  />
                  <button
                    onClick={removeProfileImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center border-4 border-blue-100">
                  <User className="h-12 w-12 text-blue-600" />
                </div>
              )}
              
              {/* Upload button */}
              <button
                onClick={triggerFileInput}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {profile?.firstName} {profile?.lastName}
            </h2>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <p className="text-gray-600">{profile?.phoneNumber || 'N/A'}</p>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant={profile?.userType === 'owner' ? 'default' : 'secondary'} className="text-xs">
                {profile?.userType ? profile.userType.charAt(0).toUpperCase() + profile.userType.slice(1) : 'User'}
              </Badge>
            </div>
            
            {/* Upload hint */}
            {!profileImage && (
              <p className="text-xs text-gray-500 mt-2">
                {typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() 
                  ? 'Tap the camera icon to take or select a profile photo'
                  : 'Tap the camera icon to add a profile photo'
                }
              </p>
            )}
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="mobile-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Shield className="h-5 w-5 mr-2" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Phone Verified</span>
              </div>
              {profile?.isPhoneVerified ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="text-sm text-gray-600">
              <p>Member since: {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}</p>
              <p>Last login: {profile?.lastLogin ? formatDate(profile.lastLogin) : 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card className="mobile-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Car className="h-5 w-5 mr-2" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.vehicles && profile.vehicles.length > 0 ? (
              <div className="space-y-2">
                {profile.vehicles.map((vehicle, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{vehicle.number || vehicle.vehicleNumber || 'Vehicle'}</p>
                    <p className="text-sm text-gray-600">{vehicle.type || 'Unknown Type'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-4">No vehicles added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="mobile-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Bell className="h-5 w-5 mr-2" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-600">Booking confirmations and updates</p>
              </div>
              <Badge variant={profile?.preferences?.notifications?.email ? 'default' : 'secondary'}>
                {profile?.preferences?.notifications?.email ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-gray-600">Pass expiry alerts</p>
              </div>
              <Badge variant={profile?.preferences?.notifications?.sms ? 'default' : 'secondary'}>
                {profile?.preferences?.notifications?.sms ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-gray-600">App notifications</p>
              </div>
              <Badge variant={profile?.preferences?.notifications?.push ? 'default' : 'secondary'}>
                {profile?.preferences?.notifications?.push ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Settings Menu */}
        <Card className="mobile-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Shield className="h-5 w-5 mr-2" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-between mobile-button"
              onClick={() => router.push('/privacy-settings')}
              disabled={isOffline}
            >
              Privacy Settings
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-between mobile-button"
              onClick={() => router.push('/help-support')}
              disabled={isOffline}
            >
              Help & Support
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-between mobile-button"
              onClick={() => router.push('/terms-conditions')}
              disabled={isOffline}
            >
              Terms & Conditions
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Logout - Always Available */}
        <Card className="mobile-card">
          <CardContent className="p-4">
            <Button 
              variant="destructive" 
              className="w-full mobile-button" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isOffline ? "Sign Out (Offline)" : "Sign Out"}
            </Button>
            {isOffline && (
              <p className="text-xs text-gray-500 text-center mt-2">
                You can sign out even without internet connection
              </p>
            )}
          </CardContent>
        </Card>

        {/* App Version */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">Wadi Cab v1.0.0</p>
          {isOffline && (
            <p className="text-xs text-yellow-600 mt-1">Offline Mode</p>
          )}
        </div>
      </div>
    </MobileLayout>
  )
}
