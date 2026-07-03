import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, MapPin } from "lucide-react"

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">Refund Policy</h1>
            <p className="text-muted-foreground text-center mb-8">
              Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">1. Cancellation and Refund Overview</h2>
                  <p className="text-muted-foreground mb-4">
                    At Waadi Cabs, we understand that plans can change. Our refund policy is designed to be fair and transparent for all our customers. Please read the following terms carefully to understand our cancellation and refund procedures.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">2. Cancellation Charges</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <div className="border-l-4 border-primary pl-4">
                      <h3 className="font-medium text-foreground">More than 24 hours before pickup</h3>
                      <p>Full refund (100%) - No cancellation charges</p>
                    </div>
                    <div className="border-l-4 border-primary pl-4">
                      <h3 className="font-medium text-foreground">12-24 hours before pickup</h3>
                      <p>75% refund - 25% cancellation charge</p>
                    </div>
                    <div className="border-l-4 border-primary pl-4">
                      <h3 className="font-medium text-foreground">6-12 hours before pickup</h3>
                      <p>50% refund - 50% cancellation charge</p>
                    </div>
                    <div className="border-l-4 border-primary pl-4">
                      <h3 className="font-medium text-foreground">Less than 6 hours before pickup</h3>
                      <p>No refund - 100% cancellation charge</p>
                    </div>
                    <div className="border-l-4 border-destructive pl-4">
                      <h3 className="font-medium text-foreground">No Show</h3>
                      <p>No refund will be provided if you fail to show up at the pickup location without prior cancellation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">3. How to Request a Refund</h2>
                  <p className="text-muted-foreground mb-4">
                    To request a cancellation and refund, please contact us through any of the following methods:
                  </p>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>Call us at: <a href="tel:9518410151" className="text-primary hover:underline">9518410151</a></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-primary" />
                      <span>Email: <a href="mailto:Javedkhan26195@gmail.com" className="text-primary hover:underline">Javedkhan26195@gmail.com</a></span>
                    </li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Please provide your booking ID and registered phone number when requesting a cancellation.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">4. Refund Processing Time</h2>
                  <div className="space-y-3 text-muted-foreground">
                    <p><strong className="text-foreground">UPI Payments:</strong> Refunds will be processed within 3-5 business days</p>
                    <p><strong className="text-foreground">Credit/Debit Card:</strong> Refunds will be processed within 5-7 business days</p>
                    <p><strong className="text-foreground">Cash Payments:</strong> For advance cash payments, refunds will be provided in cash or via UPI transfer within 2-3 business days</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">5. Special Circumstances</h2>
                  <p className="text-muted-foreground mb-4">
                    Full refunds (100%) will be provided in the following situations regardless of timing:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>If Waadi Cabs cancels the booking due to unavailability of vehicles</li>
                    <li>If the driver fails to arrive at the pickup location</li>
                    <li>If there is a significant delay (more than 30 minutes) from the scheduled pickup time due to our fault</li>
                    <li>In case of natural disasters or government-imposed restrictions</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">6. Partial Trip Refunds</h2>
                  <p className="text-muted-foreground">
                    If you need to end your trip early or change your destination mid-journey, refunds will be calculated based on the actual distance traveled. The final fare will be adjusted accordingly, and any excess amount paid will be refunded within 5-7 business days.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">7. Non-Refundable Situations</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Completed trips without any service issues</li>
                    <li>Cancellations made after the driver has reached the pickup location</li>
                    <li>Trips cancelled due to customer-side delays exceeding 30 minutes</li>
                    <li>Disputes raised more than 7 days after the trip date</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-muted border-none">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">Contact Us for Refund Queries</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <a href="tel:9518410151" className="hover:text-primary transition-colors">9518410151</a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <a href="mailto:Javedkhan26195@gmail.com" className="hover:text-primary transition-colors">Javedkhan26195@gmail.com</a>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <span>Delhi Alwar Road, Nuh, Opposite Malik Hospital, Near Indian Oil Petrol Pump, Haryana</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
