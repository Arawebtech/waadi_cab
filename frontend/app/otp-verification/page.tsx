"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/components/ui/use-toast"
import { authAPI, tokenManager, type VerifySignupRequest, type VerifyLoginRequest } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Shield, ArrowLeft, Loader2, Smartphone, Clock, RefreshCw } from "lucide-react"
import { OTPInput } from "@/components/ui/otp-input"
import Link from "next/link"
import { pushNotificationService } from "@/lib/push-notifications"

interface VerificationData {
  phoneNumber: string
  purpose: 'signup' | 'login'
  verificationId: string
  expiresAt: string
  userData?: {
    firstName: string
    lastName: string
    userType: string
  }
}

export default function OtpVerificationPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const { refreshAuthState } = useAuth()
  
  const [otp, setOtp] = useState("")
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  // Initialize verification data and countdown
  useEffect(() => {
    const initializeVerification = () => {
      const storedVerificationData = tokenManager.getVerificationData()
      
      if (!storedVerificationData) {
        toast({
          title: "Verification Required",
          description: "No verification data found. Please start the process again.",
          variant: "destructive",
        })
        router.push("/")
        return
      }

      setVerificationData(storedVerificationData)

      // Check if OTP has expired
      const expiresAt = new Date(storedVerificationData.expiresAt)
      const now = new Date()
      
      if (now > expiresAt) {
        toast({
          title: "OTP Expired",
          description: "Your OTP has expired. Please request a new one.",
          variant: "destructive",
        })
        setCanResend(true)
        setCountdown(0)
        return
      }

      // Calculate remaining time
      const remainingTime = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      setCountdown(Math.min(remainingTime, 30))
    }

    initializeVerification()
  }, [router, toast])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true)
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const verifyOtp = useCallback(async () => {
    if (isLoading) return
    
    if (otp.length !== 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 4-digit OTP",
        variant: "destructive",
      })
      return
    }

    if (!verificationData) {
      toast({
        title: "Verification Error",
        description: "Verification data not found. Please restart the process.",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    setIsLoading(true)

    try {
      // Get FCM token before verification
      let fcmToken = null
      try {
        const token = await pushNotificationService.getFCMToken()
        fcmToken = token
        console.log('🔔 FCM token obtained for verification:', token ? `${token.substring(0, 20)}...` : 'null')
      } catch (error) {
        console.warn('⚠️ Could not get FCM token for verification:', error)
        // Continue without FCM token
      }

      let result

      if (verificationData.purpose === 'signup') {
        const verifyRequest: VerifySignupRequest = {
          phoneNumber: verificationData.phoneNumber,
          otp: otp,
          verificationId: verificationData.verificationId,
          firstName: verificationData.userData!.firstName,
          lastName: verificationData.userData!.lastName,
          userType: verificationData.userData!.userType,
          fcmToken: fcmToken,
        }
        result = await authAPI.verifySignup(verifyRequest)
      } else {
        const verifyRequest: VerifyLoginRequest = {
          phoneNumber: verificationData.phoneNumber,
          otp: otp,
          verificationId: verificationData.verificationId,
          fcmToken: fcmToken,
        }
        result = await authAPI.verifyLogin(verifyRequest)
      }

      if (result.success) {
        setShowSuccessAnimation(true)
        
        toast({
          title: "Verification Successful!",
          description: result.message,
        })
        
        // Register FCM token after successful authentication
        try {
          console.log('🔔 Registering FCM token after authentication...')
          await pushNotificationService.initialize()
          
          // Update token for the authenticated user
          await pushNotificationService.updateTokenForUser()
          
          console.log('✅ FCM token registration completed')
        } catch (error) {
          console.error('❌ FCM token registration failed:', error)
          // Don't block the flow if FCM registration fails
        }
        
        refreshAuthState()
        
        // Delay redirect to show success animation
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else {
        toast({
          title: "Verification Failed",
          description: result.message,
          variant: "destructive",
        })
        setOtp("")
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      toast({
        title: "Verification Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      setOtp("")
    } finally {
      setIsLoading(false)
    }
  }, [otp, verificationData, isLoading, toast, router, refreshAuthState])

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    await verifyOtp()
  }

  const handleResendOtp = async () => {
    if (!verificationData) {
      toast({
        title: "Verification Error",
        description: "Verification data not found. Please restart the process.",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    setIsResending(true)

    try {
      const result = await authAPI.resendOTP({
        phoneNumber: verificationData.phoneNumber,
        purpose: verificationData.purpose
      })
      
      if (result.success) {
        // Update verification data with new details
        setVerificationData({
          ...verificationData,
          verificationId: result.data.verificationId,
          expiresAt: result.data.expiresAt,
        })
        
        setCountdown(30)
        setCanResend(false)
        setOtp("") // Clear current OTP
        
        toast({
          title: "OTP Resent Successfully",
          description: "A new OTP has been sent to your phone number.",
        })
      } else {
        toast({
          title: "Resend Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Resend OTP error:', error)
      toast({
        title: "Resend Error",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  // Mask phone number for display
  const maskedPhoneNumber = verificationData?.phoneNumber 
    ? `${verificationData.phoneNumber.slice(0, 2)}******${verificationData.phoneNumber.slice(-2)}`
    : "••••••••••"

  // Get back href based on purpose
  const getBackHref = () => {
    if (verificationData?.purpose === 'signup') {
      return "/signup"
    }
    return "/login"
  }

  // Get page title based on purpose
  const getPageTitle = () => {
    if (verificationData?.purpose === 'signup') {
      return t("otpVerification") || "Verify Your Account"
    }
    return "Login Verification"
  }

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (showSuccessAnimation) {
    return (
      <div className="public-page bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="bg-green-500 p-6 rounded-full w-24 h-24 mx-auto animate-pulse">
            <Shield className="h-12 w-12 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-green-800">Verification Successful!</h1>
            <p className="text-green-600">Redirecting to dashboard...</p>
          </div>
          <div className="animate-spin">
            <Loader2 className="h-8 w-8 text-green-600 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="public-page bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link href={getBackHref()}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-full hover:bg-white/80 transition-all duration-200"
              disabled={isLoading}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <LanguageToggle />
        </div>

        {/* Main Content */}
        <div className="text-center mb-8">
          {/* Icon */}
          <div className="relative mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-full w-20 h-20 mx-auto shadow-lg">
              <Smartphone className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
              <Shield className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Title and Description */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{getPageTitle()}</h1>
          <p className="text-gray-600 mb-4 leading-relaxed">
            {t("otpSent") || "We've sent a verification code to your phone number"}
          </p>
          
          {/* Phone Number Display */}
          <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
            <Smartphone className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">+91 {maskedPhoneNumber}</span>
          </div>
        </div>

        {/* OTP Form Card */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              {/* OTP Input Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold text-gray-700 text-center block">
                  {t("enterOtp") || "Enter the 4-digit code"}
                </Label>
                <div className="flex justify-center">
                  <OTPInput
                    value={otp}
                    onChange={setOtp}
                    length={4}
                    disabled={isLoading}
                    onComplete={() => verifyOtp()}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Enter the code sent to your phone
                </p>
              </div>

              {/* Verify Button */}
              <Button 
                type="submit" 
                disabled={otp.length !== 4 || isLoading} 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </form>

            {/* Resend Section */}
            <div className="text-center mt-8 pt-6 border-t border-gray-100">
              {canResend ? (
                <Button 
                  variant="ghost" 
                  onClick={handleResendOtp} 
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl transition-all duration-200"
                  disabled={isResending || isLoading}
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend OTP
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Resend available in {formatCountdown(countdown)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">
            Didn't receive the code? Check your SMS or try resending
          </p>
        </div>
      </div>
    </div>
  )
}
