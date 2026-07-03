"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  Mail,
  Receipt,
  Download,
  Home
} from "lucide-react"
import type { BookingData } from "./booking-form"

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  bookingData: BookingData | null
  transactionId: string
  paymentMethod: string
}

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  bookingData, 
  transactionId,
  paymentMethod 
}: ConfirmationModalProps) {
  if (!bookingData) return null

  const bookingId = `WC${Date.now().toString().slice(-8)}`

  const handleDownload = () => {
    const receiptContent = `
WAADI CABS - BOOKING CONFIRMATION
================================

Booking ID: ${bookingId}
Transaction ID: ${transactionId}
Date: ${new Date().toLocaleDateString()}

CUSTOMER DETAILS
----------------
Name: ${bookingData.name}
Phone: ${bookingData.phone}
Email: ${bookingData.email}

TRIP DETAILS
------------
Pickup: ${bookingData.pickup}
Destination: ${bookingData.destination}
Date: ${bookingData.date}
Time: ${bookingData.time}
Car Type: ${bookingData.carType}
Passengers: ${bookingData.passengers}

PAYMENT
-------
Method: ${paymentMethod.toUpperCase()}
Amount: ₹${bookingData.totalAmount}

CONTACT US
----------
Phone: 9518410151
Email: Javedkhan26195@gmail.com
Address: Delhi Alwar Road, Nuh, Opposite Malik Hospital,
Near Indian Oil Petrol Pump, Haryana

Thank you for choosing Waadi Cabs!
    `.trim()

    const blob = new Blob([receiptContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `WaadiCabs_Booking_${bookingId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Booking Confirmed</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Icon */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Thank You!</h2>
            <p className="text-muted-foreground">Your booking has been confirmed successfully</p>
          </div>

          {/* Booking Details Card */}
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Booking ID</p>
                  <p className="font-mono font-bold text-lg">{bookingId}</p>
                </div>
                <Receipt className="h-8 w-8 text-primary" />
              </div>

              <div className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{bookingData.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{bookingData.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{bookingData.email}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  {/* Trip Info */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-accent mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pickup</p>
                        <p className="font-medium">{bookingData.pickup}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-destructive mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Destination</p>
                        <p className="font-medium">{bookingData.destination}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{bookingData.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{bookingData.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{bookingData.carType} - {bookingData.passengers} Passengers</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  {/* Payment Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize">{paymentMethod}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-2xl font-bold text-primary">₹{bookingData.totalAmount}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Transaction ID: {transactionId}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Info */}
          <Card className="bg-muted border-none">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Important Information</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Your driver will contact you 30 minutes before pickup</li>
                <li>Please be ready at the pickup location on time</li>
                <li>For any queries, contact us at 9518410151</li>
                <li>Email: Javedkhan26195@gmail.com</li>
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleDownload}
              variant="outline" 
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>
            <Link href="/" className="flex-1">
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
