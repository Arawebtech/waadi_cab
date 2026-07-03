import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, MapPin } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">Privacy Policy</h1>
            <p className="text-muted-foreground text-center mb-8">
              Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <div className="prose prose-lg max-w-none space-y-8">
              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
                  <p className="text-muted-foreground">
                    Waadi Cabs is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our cab booking services. By using our services, you consent to the data practices described in this policy.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
                  <p className="text-muted-foreground mb-4">
                    We collect the following types of information:
                  </p>
                  <div className="space-y-4 text-muted-foreground">
                    <div>
                      <h3 className="font-medium text-foreground">2.1 Personal Information</h3>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Full name</li>
                        <li>Phone number</li>
                        <li>Email address</li>
                        <li>Pickup and drop-off addresses</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">2.2 Booking Information</h3>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Booking dates and times</li>
                        <li>Trip details and routes</li>
                        <li>Vehicle preferences</li>
                        <li>Special requirements or notes</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">2.3 Payment Information</h3>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Payment method chosen</li>
                        <li>Transaction history</li>
                        <li>UPI IDs (when provided)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
                  <p className="text-muted-foreground mb-4">
                    We use the collected information for the following purposes:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>To process and confirm your cab bookings</li>
                    <li>To communicate with you about your trip (pickup details, driver information)</li>
                    <li>To process payments and refunds</li>
                    <li>To provide customer support and respond to inquiries</li>
                    <li>To send booking confirmations and receipts via email or SMS</li>
                    <li>To improve our services and customer experience</li>
                    <li>To comply with legal obligations</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">4. Information Sharing</h2>
                  <p className="text-muted-foreground mb-4">
                    We may share your information with:
                  </p>
                  <div className="space-y-4 text-muted-foreground">
                    <p><strong className="text-foreground">4.1 Drivers:</strong> Your name, phone number, and pickup/drop location are shared with assigned drivers to complete your trip.</p>
                    <p><strong className="text-foreground">4.2 Payment Processors:</strong> Payment information is shared with secure payment gateways to process transactions.</p>
                    <p><strong className="text-foreground">4.3 Legal Requirements:</strong> We may disclose information when required by law, court order, or government regulations.</p>
                    <p><strong className="text-foreground">4.4 Business Transfers:</strong> In case of merger or acquisition, customer information may be transferred to the new entity.</p>
                  </div>
                  <p className="text-muted-foreground mt-4 font-medium">
                    We do NOT sell, rent, or trade your personal information to third parties for marketing purposes.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
                  <p className="text-muted-foreground mb-4">
                    We implement appropriate security measures to protect your personal information:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Secure data encryption for online transactions</li>
                    <li>Limited access to personal information by authorized personnel only</li>
                    <li>Regular security assessments and updates</li>
                    <li>Secure storage of customer records</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    While we strive to protect your information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
                  <p className="text-muted-foreground">
                    We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Booking records are typically retained for 3 years for accounting and legal purposes. You may request deletion of your data by contacting us, subject to legal retention requirements.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
                  <p className="text-muted-foreground mb-4">
                    You have the following rights regarding your personal information:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data we hold</li>
                    <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate information</li>
                    <li><strong className="text-foreground">Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                    <li><strong className="text-foreground">Opt-out:</strong> Unsubscribe from promotional communications</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    To exercise these rights, contact us at 9518410151 or Javedkhan26195@gmail.com.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">8. Cookies and Tracking</h2>
                  <p className="text-muted-foreground">
                    Our website may use cookies and similar technologies to enhance your browsing experience. Cookies help us remember your preferences and improve our services. You can control cookie settings through your browser, but disabling cookies may affect website functionality.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">9. Third-Party Links</h2>
                  <p className="text-muted-foreground">
                    Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review the privacy policies of any third-party sites you visit.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">10. Children&apos;s Privacy</h2>
                  <p className="text-muted-foreground">
                    Our services are not directed to individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">11. Changes to This Policy</h2>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically. Continued use of our services after changes constitutes acceptance of the updated policy.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-muted border-none">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
                  <p className="text-muted-foreground mb-4">
                    If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
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
