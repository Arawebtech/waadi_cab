"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MobileLayout } from "@/components/mobile-layout"
import { useLanguage } from "@/hooks/use-language"
import { CheckCircle } from "lucide-react"

export default function PaymentPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentComplete, setPaymentComplete] = useState(false)

  // Mock booking data
  const bookingData = {
    destinationState: "Gujarat",
    carType: "6+1 Seater",
    passType: "Weekly Pass",
    startDate: "2024-12-20",
    endDate: "2024-12-26",
    price: 1050,
  }

  const handlePayment = async () => {
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setIsProcessing(false)
    setPaymentComplete(true)

    // Redirect to dashboard after success
    setTimeout(() => {
      router.push("/dashboard")
    }, 2000)
  }

  if (paymentComplete) {
    return (
      <MobileLayout>
        <div className="px-4 py-8 text-center">
          <div className="bg-green-100 p-6 rounded-full w-24 h-24 mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("paymentSuccessfulTitle")}</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{t("paymentSuccessDesc")}</p>
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-green-800 font-medium">Pass ID: DP-2024-{Date.now().toString().slice(-6)}</p>
          </div>
          <Button onClick={() => router.push("/dashboard")} className="w-full mobile-button">
            {t("returnToDashboard")}
          </Button>
        </div>
      </MobileLayout>
    )
  }

  if (isProcessing) {
    return (
      <MobileLayout>
        <div className="px-4 py-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("processingPayment")}</h2>
          <p className="text-gray-600">Please wait while we process your payment securely.</p>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title={t("payment")} showBackButton backHref="/border-tax">
      <div className="px-4 py-6">
        {/* Booking Summary */}
        <Card className="mobile-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t("bookingSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("destination")}:</span>
              <span className="font-medium">→ {bookingData.destinationState}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("vehicle")}:</span>
              <span className="font-medium">{bookingData.carType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t("passType")}:</span>
              <span className="font-medium">{bookingData.passType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-medium">{new Date(bookingData.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">End Date:</span>
              <span className="font-medium">{new Date(bookingData.endDate).toLocaleDateString()}</span>
            </div>
            <hr className="my-3" />
            <div className="flex justify-between">
              <span className="font-semibold">{t("totalAmount")}:</span>
              <span className="text-xl font-bold text-blue-600">₹{bookingData.price}</span>
            </div>
          </CardContent>
        </Card>

        {/* Direct Pay Button */}
        <Card className="mobile-card">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Secure Payment</strong>
                </p>
                <p className="text-xs text-blue-600">
                  Your payment will be processed securely through our payment gateway
                </p>
              </div>

              <Button onClick={handlePayment} className="w-full mobile-button text-lg py-4">
                Pay ₹{bookingData.price}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            🔒 Your payment is secured with 256-bit SSL encryption. By proceeding, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </MobileLayout>
  )
}
