// Example of how to integrate PaymentIntegration component into border-tax page

import { useState } from 'react'
import PaymentIntegration from '@/components/payment-integration'

// Add this to your border-tax page component:

const [showPayment, setShowPayment] = useState(false)
const [userInfo, setUserInfo] = useState({
  firstName: '',
  lastName: '',
  email: '',
  phone: ''
})

// Modify your handleSubmit function:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // Validate form...
  if (!isFormValid()) {
    return
  }

  // Instead of creating booking directly, show payment component
  setShowPayment(true)
}

// Add this before your form JSX:
if (showPayment) {
  return (
    <MobileLayout title="Secure Payment" showBackButton onBackClick={() => setShowPayment(false)}>
      <div className="px-4 py-6">
        <PaymentIntegration
          amount={totalAmount}
          bookingData={{
            vehicleNumber: formData.vehicleNumber,
            visitingStateName: formData.visitingStateName,
            planType: formData.planType,
            fromDate: formData.fromDate,
            uptoDate: formData.uptoDate,
            whatsappNumber: formData.whatsappNumber
          }}
          userInfo={{
            firstName: userInfo.firstName || 'User',
            lastName: userInfo.lastName || 'Name',
            email: userInfo.email || `${formData.whatsappNumber}@example.com`,
            phone: formData.whatsappNumber
          }}
          onPaymentSuccess={(paymentResponse) => {
            // Handle successful payment
            console.log('Payment successful:', paymentResponse)
            
            // Clear form data
            localStorage.removeItem('borderTaxFormData')
            
            // Redirect to success page
            router.push(`/payment/success?txnid=${paymentResponse.txnId}`)
          }}
          onPaymentFailure={(error) => {
            // Handle payment failure
            console.error('Payment failed:', error)
            
            toast({
              title: "Payment Failed",
              description: error,
              variant: "destructive",
            })
            
            // Go back to form
            setShowPayment(false)
          }}
        />
      </div>
    </MobileLayout>
  )
}

// Replace your existing submit button with:
<Button
  type="submit"
  disabled={!isFormValid() || isSubmitting}
  className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
>
  {isSubmitting ? (
    <>
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      Processing...
    </>
  ) : (
    "Proceed to Payment"
  )}
</Button>