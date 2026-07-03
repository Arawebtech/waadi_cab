import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, MapPin } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">Terms and Conditions</h1>
            <p className="text-muted-foreground text-center mb-8">
              Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
                  <p className="text-muted-foreground">
                    Welcome to Waadi Cabs. By using our cab booking services, you agree to be bound by these Terms and Conditions. These terms govern your use of our services, including online bookings, phone bookings, and any other services provided by Waadi Cabs. Please read them carefully before booking a ride with us.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">2. Service Description</h2>
                  <p className="text-muted-foreground mb-4">
                    Waadi Cabs provides cab and taxi services for:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Local travel within Nuh and surrounding areas</li>
                    <li>Outstation trips to Delhi, Alwar, and other cities</li>
                    <li>Airport transfers and railway station pickups/drops</li>
                    <li>Corporate travel and business trips</li>
                    <li>Wedding and event transportation</li>
                    <li>Tour packages and sightseeing trips</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">3. Booking and Confirmation</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p><strong className="text-foreground">3.1</strong> Bookings can be made through our website, phone call, or in person at our office.</p>
                    <p><strong className="text-foreground">3.2</strong> A booking is confirmed only after you receive a booking confirmation with a unique booking ID.</p>
                    <p><strong className="text-foreground">3.3</strong> We reserve the right to refuse or cancel bookings at our discretion, including cases of fraudulent information or repeated cancellations.</p>
                    <p><strong className="text-foreground">3.4</strong> For advance bookings, we recommend booking at least 6 hours before the scheduled pickup time.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">4. Fares and Payment</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p><strong className="text-foreground">4.1</strong> Fares are calculated based on distance traveled, vehicle type, and time of travel.</p>
                    <p><strong className="text-foreground">4.2</strong> The fare displayed at the time of booking is an estimate. Final fare may vary based on actual distance and waiting time.</p>
                    <p><strong className="text-foreground">4.3</strong> We accept payments via Cash, UPI, Credit Cards, and Debit Cards.</p>
                    <p><strong className="text-foreground">4.4</strong> For outstation trips, toll charges, parking fees, and state permits are additional and will be charged to the customer.</p>
                    <p><strong className="text-foreground">4.5</strong> Night charges (10 PM to 6 AM) of 10% extra may apply on certain routes.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">5. Customer Responsibilities</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p><strong className="text-foreground">5.1</strong> Customers must provide accurate pickup location, contact details, and destination.</p>
                    <p><strong className="text-foreground">5.2</strong> Customers should be ready at the pickup location at the scheduled time. A waiting time of up to 10 minutes is provided free of charge.</p>
                    <p><strong className="text-foreground">5.3</strong> Customers are responsible for their belongings. Waadi Cabs is not liable for any items left behind in the vehicle.</p>
                    <p><strong className="text-foreground">5.4</strong> Smoking, consumption of alcohol, and carrying illegal substances in our vehicles is strictly prohibited.</p>
                    <p><strong className="text-foreground">5.5</strong> Any damage caused to the vehicle by the customer will be charged accordingly.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">6. Driver Conduct</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p><strong className="text-foreground">6.1</strong> All our drivers are verified, licensed, and trained professionals.</p>
                    <p><strong className="text-foreground">6.2</strong> Drivers are instructed to follow traffic rules and ensure passenger safety.</p>
                    <p><strong className="text-foreground">6.3</strong> If you face any issues with driver behavior, please report immediately to 9518410151 or email Javedkhan26195@gmail.com.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">7. Cancellation Policy</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p><strong className="text-foreground">7.1</strong> Cancellations made more than 24 hours before pickup: Full refund</p>
                    <p><strong className="text-foreground">7.2</strong> Cancellations made 12-24 hours before pickup: 75% refund</p>
                    <p><strong className="text-foreground">7.3</strong> Cancellations made 6-12 hours before pickup: 50% refund</p>
                    <p><strong className="text-foreground">7.4</strong> Cancellations made less than 6 hours before pickup: No refund</p>
                    <p>For detailed refund policy, please visit our Refund Policy page.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">8. Liability and Limitations</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p><strong className="text-foreground">8.1</strong> Waadi Cabs shall not be liable for delays caused by traffic, road conditions, weather, or other circumstances beyond our control.</p>
                    <p><strong className="text-foreground">8.2</strong> Our liability for any claim arising from our services is limited to the fare paid for that particular trip.</p>
                    <p><strong className="text-foreground">8.3</strong> We are not responsible for any consequential losses, including missed flights, meetings, or appointments.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">9. Luggage Policy</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p><strong className="text-foreground">9.1</strong> Standard vehicles can accommodate reasonable personal luggage.</p>
                    <p><strong className="text-foreground">9.2</strong> Excess luggage may require a larger vehicle at additional cost.</p>
                    <p><strong className="text-foreground">9.3</strong> Hazardous materials, weapons, and illegal items are strictly prohibited.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">10. Modifications to Terms</h2>
                  <p className="text-muted-foreground">
                    Waadi Cabs reserves the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on our website. Continued use of our services after any modifications constitutes acceptance of the updated terms.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">11. Governing Law</h2>
                  <p className="text-muted-foreground">
                    These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Nuh, Haryana.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-muted border-none">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
                  <p className="text-muted-foreground mb-4">
                    If you have any questions about these Terms and Conditions, please contact us:
                  </p>
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
