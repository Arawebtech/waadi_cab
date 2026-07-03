"use client"

import { MobileLayout } from "@/components/mobile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  HelpCircle, 
  Phone, 
  Mail, 
  MessageCircle, 
  Clock, 
  MapPin, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  Car,
  Calendar,
  DollarSign,
  Smartphone
} from "lucide-react"
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

export default function HelpSupportPage() {
  const { toast } = useToast()

  const openWhatsApp = async () => {
    try {
      const phoneNumber = "919518410151" // WhatsApp number without + and spaces
      const message = "Hi" // Pre-filled message
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      
      if (Capacitor.isNativePlatform()) {
        // Open in Capacitor Browser for native apps
        await Browser.open({ url: whatsappUrl })
      } else {
        // Open in new tab for web browsers
        window.open(whatsappUrl, '_blank')
      }
      
      toast({
        title: "Opening WhatsApp",
        description: "WhatsApp is opening with a pre-filled message",
      })
    } catch (error) {
      console.error('Error opening WhatsApp:', error)
      toast({
        title: "Error",
        description: "Could not open WhatsApp. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openPhoneDialer = async () => {
    try {
      const phoneNumber = "9518410151" // Phone number without + and spaces
      const telUrl = `tel:${phoneNumber}`
      
      // Use tel: URL so the OS shows the dial pad with the number pre-filled.
      // This works inside the Capacitor WebView as well as in regular browsers.
      if (typeof window !== "undefined") {
        window.location.href = telUrl
      }
      
      toast({
        title: "Opening Phone Dialer",
        description: "Phone dialer is opening with the support number",
      })
    } catch (error) {
      console.error('Error opening phone dialer:', error)
      toast({
        title: "Error",
        description: "Could not open phone dialer. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEmail = async () => {
    try {
      const email = "wadiup9@gmail.com"
      const subject = "Support Request - Wadi Cab"
      const body = "Hi,\n\nI need help with:\n\n"
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      
      if (Capacitor.isNativePlatform()) {
        // Open in Capacitor Browser for native apps
        await Browser.open({ url: mailtoUrl })
      } else {
        // For web browsers, open mailto link
        window.location.href = mailtoUrl
      }
      
      toast({
        title: "Opening Email",
        description: "Email client is opening with a pre-filled message",
      })
    } catch (error) {
      console.error('Error opening email:', error)
      toast({
        title: "Error",
        description: "Could not open email client. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <MobileLayout title="Help & Support" showBackButton backHref="/profile">
      <div className="px-4 py-6 space-y-6">
        
        {/* Header */}
        <Card className="mobile-card">
          <CardContent className="p-6 text-center">
            <HelpCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Help & Support</h1>
            <p className="text-gray-600">Get help with your border tax bookings</p>
            <Badge variant="outline" className="mt-2">
              24/7 Support Available
            </Badge>
          </CardContent>
        </Card>

        {/* Quick Contact */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-lg">Quick Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="flex items-center justify-start gap-3 h-auto p-4"
                onClick={openPhoneDialer}
              >
                <Phone className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Call Support</p>
                  <p className="text-sm text-gray-600">+91 9518410151</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-start gap-3 h-auto p-4"
                onClick={openWhatsApp}
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">WhatsApp Support</p>
                  <p className="text-sm text-gray-600">Quick responses available</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-start gap-3 h-auto p-4"
                onClick={openEmail}
              >
                <Mail className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-gray-600">wadiup9@gmail.com</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Support Hours */}
        <Card className="mobile-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Support Hours</p>
                <p className="text-sm text-gray-600">24/7 for urgent issues • 9 AM - 9 PM for general queries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Frequently Asked Questions */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <HelpCircle className="h-5 w-5 mr-2" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Booking Questions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Car className="h-4 w-4 text-blue-600" />
                Booking & Passes
              </h4>
              
              <div className="space-y-3 ml-6">
                <div className="border-l-4 border-blue-200 pl-3">
                  <p className="font-medium text-sm">How do I book a border tax pass?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Go to "Book Pass" → Select your destination state → Choose vehicle type → 
                    Select entry border → Pick travel dates → Make payment. Your digital pass will be generated instantly.
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-200 pl-3">
                  <p className="font-medium text-sm">How long is my border tax pass valid?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Pass validity depends on the plan you choose: Daily (24 hours), Weekly (7 days), 
                    or Monthly (30 days) from your selected start date.
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-200 pl-3">
                  <p className="font-medium text-sm">Can I modify my booking after payment?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Once payment is completed, bookings cannot be modified. For urgent changes, 
                    contact support within 2 hours of booking.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Questions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-green-600" />
                Payments & Refunds
              </h4>
              
              <div className="space-y-3 ml-6">
                <div className="border-l-4 border-green-200 pl-3">
                  <p className="font-medium text-sm">What payment methods are accepted?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    We accept all major credit/debit cards, UPI, net banking, and digital wallets. 
                    All payments are processed securely through certified gateways.
                  </p>
                </div>
                
                <div className="border-l-4 border-green-200 pl-3">
                  <p className="font-medium text-sm">Are refunds available?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Refunds are available for unused passes within 24 hours of booking. 
                    Processing fee may apply as per state regulations.
                  </p>
                </div>
                
                <div className="border-l-4 border-green-200 pl-3">
                  <p className="font-medium text-sm">Why was my payment declined?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Check your card balance, verify card details, ensure your bank allows online transactions, 
                    or try a different payment method.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Questions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-purple-600" />
                Technical Issues
              </h4>
              
              <div className="space-y-3 ml-6">
                <div className="border-l-4 border-purple-200 pl-3">
                  <p className="font-medium text-sm">App not loading or crashing?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Force close the app, clear app cache, ensure stable internet connection, 
                    and restart. If issue persists, contact support.
                  </p>
                </div>
                
                <div className="border-l-4 border-purple-200 pl-3">
                  <p className="font-medium text-sm">Can't login to my account?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Verify your phone number, check for SMS delivery issues, ensure you're using 
                    the correct OTP, or request a new OTP.
                  </p>
                </div>
                
                <div className="border-l-4 border-purple-200 pl-3">
                  <p className="font-medium text-sm">Pass not downloading or showing?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Check your internet connection, go to History section to re-download, 
                    or contact support with your booking ID.
                  </p>
                </div>
              </div>
            </div>

            {/* Legal Questions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                Legal & Compliance
              </h4>
              
              <div className="space-y-3 ml-6">
                <div className="border-l-4 border-orange-200 pl-3">
                  <p className="font-medium text-sm">Is this pass legally valid?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Yes, our digital passes are officially recognized by state authorities 
                    and comply with all border tax regulations.
                  </p>
                </div>
                
                <div className="border-l-4 border-orange-200 pl-3">
                  <p className="font-medium text-sm">What if I'm stopped at the border?</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Show your digital pass (screenshot or app display). The pass contains 
                    all necessary details and verification codes for border officials.
                  </p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Troubleshooting Guide */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Common Issues & Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Payment Failed</p>
                    <p className="text-sm text-red-700 mt-1">
                      1. Check internet connection<br/>
                      2. Verify card details and balance<br/>
                      3. Try different payment method<br/>
                      4. Contact your bank if needed
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Pass Not Generated</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      1. Wait 5-10 minutes for processing<br/>
                      2. Check your History section<br/>
                      3. Verify payment completion<br/>
                      4. Contact support with transaction ID
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <MessageCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">OTP Not Received</p>
                    <p className="text-sm text-blue-700 mt-1">
                      1. Check SMS inbox and spam<br/>
                      2. Ensure good network signal<br/>
                      3. Wait 2-3 minutes before retry<br/>
                      4. Request new OTP if needed
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="mobile-card border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h3 className="font-bold text-orange-800 mb-2">Emergency Support</h3>
              <p className="text-sm text-orange-700 mb-3">
                Stuck at border checkpoint? Need immediate assistance?
              </p>
              <Button 
                variant="default" 
                className="bg-orange-600 hover:bg-orange-700"
                onClick={openPhoneDialer}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Emergency: +91 9518410151
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="text-lg">Help Us Improve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Your feedback helps us improve our service. Rate your support experience or suggest improvements.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Rate Support</Button>
              <Button variant="outline" size="sm">Send Feedback</Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </MobileLayout>
  )
} 