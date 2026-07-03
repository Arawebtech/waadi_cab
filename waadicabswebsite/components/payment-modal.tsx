"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  CheckCircle2,
  Loader2,
  Shield
} from "lucide-react"
import type { BookingData } from "./booking-form"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  bookingData: BookingData | null
  onPaymentComplete: (paymentMethod: string, transactionId: string) => void
}

export function PaymentModal({ isOpen, onClose, bookingData, onPaymentComplete }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("upi")
  const [isProcessing, setIsProcessing] = useState(false)
  const [upiId, setUpiId] = useState("")

  if (!bookingData) return null

  const handlePayment = async () => {
    setIsProcessing(true)
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    
    setIsProcessing(false)
    onPaymentComplete(paymentMethod, transactionId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="bg-muted">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium text-right max-w-[180px] truncate">{bookingData.pickup}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-medium text-right max-w-[180px] truncate">{bookingData.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="font-medium">{bookingData.date} at {bookingData.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Car Type</span>
                  <span className="font-medium capitalize">{bookingData.carType}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span className="text-primary">₹{bookingData.totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Select Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
              <div className="relative">
                <RadioGroupItem value="upi" id="upi" className="peer sr-only" />
                <Label
                  htmlFor="upi"
                  className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">UPI Payment</p>
                    <p className="text-sm text-muted-foreground">Pay using any UPI app</p>
                  </div>
                  {paymentMethod === "upi" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </Label>
              </div>

              <div className="relative">
                <RadioGroupItem value="card" id="card" className="peer sr-only" />
                <Label
                  htmlFor="card"
                  className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Credit / Debit Card</p>
                    <p className="text-sm text-muted-foreground">Visa, Mastercard, RuPay</p>
                  </div>
                  {paymentMethod === "card" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </Label>
              </div>

              <div className="relative">
                <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                <Label
                  htmlFor="cash"
                  className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <Banknote className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Pay Cash</p>
                    <p className="text-sm text-muted-foreground">Pay directly to driver</p>
                  </div>
                  {paymentMethod === "cash" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* UPI ID Input */}
          {paymentMethod === "upi" && (
            <div className="space-y-2">
              <Label htmlFor="upiId">Enter UPI ID</Label>
              <Input
                id="upiId"
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
          )}

          {/* Card Details */}
          {paymentMethod === "card" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" type="password" placeholder="123" />
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <Shield className="h-4 w-4 text-accent flex-shrink-0" />
            <span>Your payment information is secure and encrypted</span>
          </div>

          {/* Pay Button */}
          <Button 
            onClick={handlePayment} 
            disabled={isProcessing}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₹${bookingData.totalAmount}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
