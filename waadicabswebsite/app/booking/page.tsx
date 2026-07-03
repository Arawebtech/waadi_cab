"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BookingForm, type BookingData } from "@/components/booking-form"
import { PaymentModal } from "@/components/payment-modal"
import { ConfirmationModal } from "@/components/confirmation-modal"

export default function BookingPage() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")

  const handleBookingSubmit = (data: BookingData) => {
    setBookingData(data)
    setIsPaymentOpen(true)
  }

  const handlePaymentComplete = (method: string, txnId: string) => {
    setPaymentMethod(method)
    setTransactionId(txnId)
    setIsPaymentOpen(false)
    setIsConfirmationOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 md:py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Book Your Ride</h1>
              <p className="text-muted-foreground">
                Fill in the details below to book your cab with Waadi Cabs
              </p>
            </div>
            
            <BookingForm onSubmit={handleBookingSubmit} />
          </div>
        </div>
      </main>

      <Footer />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        bookingData={bookingData}
        onPaymentComplete={handlePaymentComplete}
      />

      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        bookingData={bookingData}
        transactionId={transactionId}
        paymentMethod={paymentMethod}
      />
    </div>
  )
}
