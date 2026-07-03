"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { MobileLayout } from "@/components/mobile-layout"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/hooks/use-language"
import { useToast } from "@/components/ui/use-toast"
import { authAPI, type SignupRequest } from "@/lib/api"
import { TermsAndConditions } from "@/components/terms-and-conditions"
import { Car, User, Phone, Users, Loader2 } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<SignupRequest>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    userType: "driver",
  })
  const [errors, setErrors] = useState<{
    firstName?: string
    lastName?: string
    phoneNumber?: string
    general?: string
  }>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsDialogOpen, setTermsDialogOpen] = useState(false)
  const [termsError, setTermsError] = useState(false)

  // Validation functions
  const validateFirstName = (firstName: string): string | undefined => {
    if (!firstName.trim()) {
      return "First name is required"
    }
    if (firstName.trim().length < 2) {
      return "First name must be at least 2 characters"
    }
    if (firstName.trim().length > 50) {
      return "First name must be less than 50 characters"
    }
    if (!/^[a-zA-Z\s]+$/.test(firstName.trim())) {
      return "First name can only contain letters and spaces"
    }
    return undefined
  }

  const validateLastName = (lastName: string): string | undefined => {
    if (lastName.trim() && lastName.trim().length > 50) {
      return "Last name must be less than 50 characters"
    }
    if (lastName.trim() && !/^[a-zA-Z\s]+$/.test(lastName.trim())) {
      return "Last name can only contain letters and spaces"
    }
    return undefined
  }

  const validatePhoneNumber = (phoneNumber: string): string | undefined => {
    if (!phoneNumber.trim()) {
      return "Phone number is required"
    }
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return "Please enter a valid 10-digit Indian mobile number"
    }
    return undefined
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}
    
    const firstNameError = validateFirstName(formData.firstName)
    if (firstNameError) newErrors.firstName = firstNameError
    
    const lastNameError = validateLastName(formData.lastName)
    if (lastNameError) newErrors.lastName = lastNameError
    
    const phoneNumberError = validatePhoneNumber(formData.phoneNumber)
    if (phoneNumberError) newErrors.phoneNumber = phoneNumberError
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})
    
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
    
    // Validate form
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Automatically set lastName to "sir" if empty before submitting
      const submitData = { 
        ...formData, 
        lastName: formData.lastName.trim() || "sir" 
      }
      const result = await authAPI.signup(submitData)
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
        
        // Navigate to OTP verification
        router.push("/otp-verification")
      } else {
        // Handle backend error messages
        console.log('Backend error response:', result)
        
        // Set general error for display
        setErrors({ general: result.message })
        
        // Show specific toast based on error type
        if (result.message === "User already exists with this phone number") {
          toast({
            title: "Account Already Exists",
            description: "An account with this phone number already exists. Please sign in instead.",
            variant: "destructive",
            action: (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push("/login")}
              >
                Sign In
              </Button>
            ),
          })
        } else {
          toast({
            title: "Signup Failed",
            description: result.message,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error('Signup error:', error)
      const errorMessage = "An unexpected error occurred. Please try again."
      setErrors({ general: errorMessage })
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="public-page bg-gray-50 w-full overflow-x-hidden">
      <div className="px-4 py-8">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <LanguageToggle />
        </div>

        <div className="text-center mb-8">
          <div className="bg-blue-600 p-4 rounded-full w-16 h-16 mx-auto mb-4">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("createAccount")}</h1>
          <p className="text-gray-600">{t("joinDrivers")}</p>
        </div>

        <Card className="mobile-card">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="mobile-form-group">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  {t("firstName")} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder={t("enterFirstName")}
                    value={formData.firstName}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ ...formData, firstName: value })
                      // Clear error when user starts typing
                      if (errors.firstName) {
                        setErrors({ ...errors, firstName: undefined })
                      }
                    }}
                    onBlur={() => {
                      const error = validateFirstName(formData.firstName)
                      if (error) {
                        setErrors({ ...errors, firstName: error })
                      }
                    }}
                    className={`mobile-input pl-10 ${errors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                    required
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div className="mobile-form-group">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  {t("lastName")} <span className="text-gray-400">(Optional)</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder={t("enterLastName") || "Enter last name (defaults to 'sir')"}
                    value={formData.lastName}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ ...formData, lastName: value })
                      // Clear error when user starts typing
                      if (errors.lastName) {
                        setErrors({ ...errors, lastName: undefined })
                      }
                    }}
                    onBlur={() => {
                      const error = validateLastName(formData.lastName)
                      if (error) {
                        setErrors({ ...errors, lastName: error })
                      }
                    }}
                    className={`mobile-input pl-10 ${errors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              <div className="mobile-form-group">
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
                  {t("phoneNumber")} <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder={t("enterPhoneNumber")}
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                      setFormData({ ...formData, phoneNumber: value })
                      // Clear error when user starts typing
                      if (errors.phoneNumber) {
                        setErrors({ ...errors, phoneNumber: undefined })
                      }
                    }}
                    onBlur={() => {
                      const error = validatePhoneNumber(formData.phoneNumber)
                      if (error) {
                        setErrors({ ...errors, phoneNumber: error })
                      }
                    }}
                    className={`mobile-input pl-10 ${errors.phoneNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    disabled={isLoading}
                    maxLength={10}
                    required
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                )}
              </div>

              <div className="mobile-form-group">
                <Label className="text-sm font-medium text-gray-700">{t("userType")}</Label>
                <Select
                  value={formData.userType}
                  onValueChange={(value) => setFormData({ ...formData, userType: value })}
                  disabled
                >
                  <SelectTrigger className="mobile-input">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-400 mr-2" />
                      <SelectValue placeholder={t("selectUserType")} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">{t("agent")}</SelectItem>
                    <SelectItem value="owner">{t("owner")}</SelectItem>
                    <SelectItem value="driver">{t("driver")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* General Error Display */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

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

              <Button type="submit" className="w-full mobile-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("loading")}
                  </>
                ) : (
                  t("createAccount")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="text-blue-600 font-medium">
              {t("signIn")}
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">{t("termsPrivacy")}</p>
        </div>
      </div>

      {/* Terms and Conditions Dialog */}
      <TermsAndConditions open={termsDialogOpen} onOpenChange={setTermsDialogOpen} />
    </div>
  )
}
