"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MobileLayout } from "@/components/mobile-layout"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/components/ui/use-toast"
import { authAPI, type LoginRequest } from "@/lib/api"
import { TermsAndConditions } from "@/components/terms-and-conditions"
import { Phone, Loader2, AlertCircle, UserPlus } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<LoginRequest>({
    phoneNumber: "",
  })
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsDialogOpen, setTermsDialogOpen] = useState(false)
  const [termsError, setTermsError] = useState(false)
  console.log("LoginPage");

  const clearForm = () => {
    setFormData({ phoneNumber: "" })
    setShowSignupPrompt(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset signup prompt
    setShowSignupPrompt(false)
    
    // Validate terms acceptance
    if (!acceptedTerms) {
      setTermsError(true)
      console.log("Terms not accepted - showing error")
      toast({
        title: "Terms Required",
        description: "You need to accept Terms & Conditions to proceed",
        variant: "destructive",
      })
      // Scroll to terms checkbox
      setTimeout(() => {
        const termsElement = document.getElementById("terms")
        if (termsElement) {
          termsElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }, 100)
      return
    }
    
    setTermsError(false)
    
    // Validate phone number
    if (!formData.phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive",
      })
      return
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[6-9]\d{9}$/
    if (!phoneRegex.test(formData.phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit Indian mobile number",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await authAPI.login(formData)
      
      if (result.success) {
        toast({
          title: "OTP Sent",
          description: result.message,
        })
        
        // Navigate to OTP verification
        router.push("/otp-verification")
      } else {
        // Handle specific error cases
        if (result.message === "User not found or account is inactive") {
          setShowSignupPrompt(true)
          toast({
            title: t("accountNotFound"),
            description: t("userNotFoundMessage"),
            variant: "destructive",
          })
        } else if (result.message.includes("inactive") || result.message.includes("deactivated")) {
          toast({
            title: t("accountInactive"),
            description: t("accountInactiveMessage"),
            variant: "destructive",
          })
        } else if (result.message.includes("blocked") || result.message.includes("suspended")) {
          toast({
            title: t("accountBlocked"),
            description: t("accountBlockedMessage"),
            variant: "destructive",
          })
        } else {
          toast({
            title: "Login Failed",
            description: result.message,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      
      // Handle different types of errors
      let errorMessage = t("unexpectedErrorMessage")
      
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = t("networkErrorMessage")
        } else if (error.message.includes('timeout')) {
          errorMessage = t("timeoutErrorMessage")
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: t("unexpectedError"),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="public-page bg-white w-full overflow-x-hidden flex flex-col">
      <div className="px-6 py-6 flex-1 flex flex-col">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>

        {/* Logo Section - Top 20% */}
        <div className="text-center mb-6 flex-shrink-0">
          <div className="flex flex-col items-center">
            {/* Logo with wavy checkmark/N shape */}
        
            <h1 className="text-4xl font-bold text-black mb-1">Waadi</h1>
            <p className="text-2xl font-semibold text-yellow-500">Cab</p>
          </div>
          <p className="text-base text-black mt-3 font-medium">India's Biggest B2B Taxi Marketplace</p>
        </div>

        {/* Driver Illustration - Middle 40% */}
        <div className="relative mb-8 flex justify-center flex-1 flex items-center">
          <div className="relative w-80 h-40 flex items-center justify-center">
            {/* Yellow sun/background circle */}
            
            {/* Driver Image */}
            <div className="relative z-10">
              <img 
                src="/driver1.png" 
                alt="Driver illustration" 
                className="w-48 h-48 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Service Description - Bottom 40% */}
        <div className="text-center mb-8 flex-shrink-0">
          <h2 className="text-2xl font-bold text-black mb-4">Professional Taxi Services</h2>
          <p className="text-base text-black leading-relaxed max-w-sm mx-auto mb-8">
            Connect with verified drivers and book your ride instantly. Safe, reliable, and professional.
          </p>
        </div>

        {/* Login Form */}
        <div className="mb-6 flex-shrink-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phoneNumber" className="text-base font-medium text-gray-700 block mb-2">
                {t("phoneNumber")}
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder={t("enterPhoneNumber")}
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="pl-10 h-14 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                  disabled={isLoading}
                  maxLength={10}
                  required
                  aria-describedby="phoneNumberHelp"
                  aria-invalid={showSignupPrompt}
                />
              </div>
              {showSignupPrompt && (
                <p id="phoneNumberHelp" className="mt-1 text-sm text-red-600">
                  {t("phoneNumberHelp")}
                </p>
              )}
            </div>

            {/* Terms and Conditions Acceptance */}
            <div className="py-2">
              <div className={`flex items-start space-x-3 ${termsError ? 'mb-2' : ''}`}>
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => {
                    setAcceptedTerms(checked === true)
                    if (checked && termsError) {
                      setTermsError(false)
                    }
                  }}
                  className={`mt-1 ${termsError ? 'border-red-500' : ''}`}
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setTermsDialogOpen(true)}
                    className="text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    Terms & Conditions
                  </button>
                  <span className="text-red-500">*</span>
                </Label>
              </div>
              {termsError && (
                <p className="mt-1 text-sm text-red-600 ml-7">
                  You need to accept Terms & Conditions to proceed
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-lg rounded-lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {t("loading")}
                </>
              ) : (
                t("signIn")
              )}
            </Button>
          </form>
        </div>

        {/* Signup Prompt for Unregistered Users */}
        {showSignupPrompt && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  {t("newToWaadi")}
                </h4>
                <p className="text-xs text-blue-700 mb-3">
                  {t("createAccountPrompt")}
                </p>
                <div className="flex space-x-2">
                  <Link href="/signup" className="flex-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-white border-blue-300 text-blue-700 hover:bg-blue-50 h-10 text-sm"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("createAccount")}
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-10"
                    onClick={clearForm}
                  >
                    {t("tryDifferentNumber")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Bottom */}
        <div className="flex space-x-4 mb-6 flex-shrink-0">
          <Link href="/signup" className="flex-1">
            <Button 
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold text-lg rounded-lg"
            >
              Sign Up
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <div className="text-center flex-shrink-0">
          <p className="text-sm text-gray-500">
            We'll send you a 4-digit OTP to verify your phone number
          </p>
        </div>
      </div>

      {/* Terms and Conditions Dialog */}
      <TermsAndConditions open={termsDialogOpen} onOpenChange={setTermsDialogOpen} />
    </div>
  )
}
