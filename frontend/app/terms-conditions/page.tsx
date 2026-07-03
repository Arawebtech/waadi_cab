"use client"

import { MobileLayout } from "@/components/mobile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Scale, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Shield, 
  Globe, 
  Clock,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react"

export default function TermsConditionsPage() {
  return (
    <MobileLayout title="Terms & Conditions" showBackButton backHref="/profile">
      <div className="px-4 py-6 space-y-6">
        
        {/* Header */}
        <Card className="mobile-card">
          <CardContent className="p-6 text-center">
            <Scale className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
            <p className="text-gray-600">Legal terms governing the use of Wadi Cab services</p>
            <Badge variant="outline" className="mt-2">
              Effective Date: January 1, 2025
            </Badge>
          </CardContent>
        </Card>

        {/* Acceptance of Terms */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CheckCircle className="h-5 w-5 mr-2" />
              Acceptance of Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              By accessing and using the Wadi Cab mobile application and services, you acknowledge 
              that you have read, understood, and agree to be bound by these Terms and Conditions. 
              If you do not agree to these terms, please do not use our services.
            </p>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> These terms constitute a legally binding agreement between 
                you and Wadi Cab regarding your use of our border tax booking services.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service Description */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Globe className="h-5 w-5 mr-2" />
              Service Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              Wadi Cab provides a digital platform for booking and managing inter-state border tax passes. 
              Our services include:
            </p>
            <div className="space-y-2 ml-4">
              <p className="text-sm text-gray-700">• Digital border tax pass generation</p>
              <p className="text-sm text-gray-700">• Real-time tax calculation based on state regulations</p>
              <p className="text-sm text-gray-700">• Secure payment processing</p>
              <p className="text-sm text-gray-700">• Pass validity tracking and notifications</p>
              <p className="text-sm text-gray-700">• Customer support and assistance</p>
            </div>
          </CardContent>
        </Card>

        {/* User Responsibilities */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Users className="h-5 w-5 mr-2" />
              User Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Account Security</h4>
              <div className="space-y-2 ml-4">
                <p className="text-sm text-gray-700">• Maintain confidentiality of your account credentials</p>
                <p className="text-sm text-gray-700">• Notify us immediately of any unauthorized access</p>
                <p className="text-sm text-gray-700">• Use accurate and up-to-date personal information</p>
                <p className="text-sm text-gray-700">• Verify phone number for account security</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Accurate Information</h4>
              <div className="space-y-2 ml-4">
                <p className="text-sm text-gray-700">• Provide correct vehicle registration details</p>
                <p className="text-sm text-gray-700">• Ensure accurate travel dates and destinations</p>
                <p className="text-sm text-gray-700">• Update information when circumstances change</p>
                <p className="text-sm text-gray-700">• Report any errors immediately</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Compliance</h4>
              <div className="space-y-2 ml-4">
                <p className="text-sm text-gray-700">• Follow all applicable state and central laws</p>
                <p className="text-sm text-gray-700">• Carry valid digital pass during travel</p>
                <p className="text-sm text-gray-700">• Cooperate with border enforcement officials</p>
                <p className="text-sm text-gray-700">• Use the service only for legitimate purposes</p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Payment Terms */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Payment Processing</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  • All payments must be completed before pass generation
                </p>
                <p className="text-sm text-gray-700">
                  • Payments are processed through secure, certified payment gateways
                </p>
                <p className="text-sm text-gray-700">
                  • We do not store credit card or banking information
                </p>
                <p className="text-sm text-gray-700">
                  • Payment confirmation is required for pass validity
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Refunds & Cancellations</h4>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="space-y-2">
                  <p className="text-sm text-yellow-800">
                    <strong>Refund Policy:</strong>
                  </p>
                  <p className="text-sm text-yellow-700">
                    • Refunds available within 24 hours of booking for unused passes
                  </p>
                  <p className="text-sm text-yellow-700">
                    • Processing fees may apply as per state regulations
                  </p>
                  <p className="text-sm text-yellow-700">
                    • No refunds for partially used or expired passes
                  </p>
                  <p className="text-sm text-yellow-700">
                    • Refund processing time: 5-7 business days
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Pricing</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  • Prices are determined by state government regulations
                </p>
                <p className="text-sm text-gray-700">
                  • Service fees may apply for convenience and processing
                </p>
                <p className="text-sm text-gray-700">
                  • Prices may change without prior notice due to regulatory updates
                </p>
                <p className="text-sm text-gray-700">
                  • All taxes and fees are included in the displayed amount
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Service Limitations */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Service Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Service Availability</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  • Services may be temporarily unavailable due to maintenance
                </p>
                <p className="text-sm text-gray-700">
                  • Some states may have temporary service restrictions
                </p>
                <p className="text-sm text-gray-700">
                  • Emergency situations may affect service delivery
                </p>
                <p className="text-sm text-gray-700">
                  • We strive for 99.9% uptime but cannot guarantee continuous availability
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Technical Limitations</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  • Requires stable internet connection for pass generation
                </p>
                <p className="text-sm text-gray-700">
                  • Mobile device compatibility requirements may apply
                </p>
                <p className="text-sm text-gray-700">
                  • Pass verification depends on government database availability
                </p>
                <p className="text-sm text-gray-700">
                  • Backup verification methods may be required in remote areas
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Liability and Disclaimers */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Shield className="h-5 w-5 mr-2" />
              Liability & Disclaimers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">Limitation of Liability</h4>
              <div className="space-y-2">
                <p className="text-sm text-red-700">
                  • Wadi Cab is not responsible for changes in state tax regulations
                </p>
                <p className="text-sm text-red-700">
                  • We are not liable for delays caused by government systems
                </p>
                <p className="text-sm text-red-700">
                  • Users are responsible for compliance with all applicable laws
                </p>
                <p className="text-sm text-red-700">
                  • Our liability is limited to the amount paid for the specific service
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Service Disclaimers</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  • Digital passes are subject to verification by authorities
                </p>
                <p className="text-sm text-gray-700">
                  • We provide information based on current regulations
                </p>
                <p className="text-sm text-gray-700">
                  • Users must verify requirements with relevant authorities
                </p>
                <p className="text-sm text-gray-700">
                  • Service is provided "as is" without warranties of any kind
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Prohibited Uses */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <XCircle className="h-5 w-5 mr-2" />
              Prohibited Uses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700 mb-3">
              You agree not to use our services for any of the following prohibited activities:
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">• Providing false or misleading information</p>
              <p className="text-sm text-gray-700">• Attempting to circumvent payment systems</p>
              <p className="text-sm text-gray-700">• Using the service for illegal activities</p>
              <p className="text-sm text-gray-700">• Sharing account credentials with unauthorized persons</p>
              <p className="text-sm text-gray-700">• Attempting to hack or disrupt our systems</p>
              <p className="text-sm text-gray-700">• Creating multiple accounts for fraudulent purposes</p>
              <p className="text-sm text-gray-700">• Using automated tools to access our services</p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy and Data */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Info className="h-5 w-5 mr-2" />
              Privacy & Data Protection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              Your privacy is important to us. Our collection, use, and protection of your personal 
              information is governed by our Privacy Policy, which is incorporated by reference into 
              these Terms and Conditions.
            </p>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Data Sharing:</strong> Your travel and vehicle information may be shared 
                with relevant government authorities for tax compliance and verification purposes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Modifications and Updates */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Clock className="h-5 w-5 mr-2" />
              Terms Modifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              Wadi Cab reserves the right to modify these Terms and Conditions at any time. 
              We will notify users of significant changes through:
            </p>
            <div className="space-y-2 ml-4">
              <p className="text-sm text-gray-700">• In-app notifications</p>
              <p className="text-sm text-gray-700">• Email notifications</p>
              <p className="text-sm text-gray-700">• Website announcements</p>
              <p className="text-sm text-gray-700">• SMS alerts for critical changes</p>
            </div>
            <p className="text-sm text-gray-700 mt-3">
              Continued use of our services after modifications constitutes acceptance of the updated terms.
            </p>
          </CardContent>
        </Card>

        {/* Governing Law */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Scale className="h-5 w-5 mr-2" />
              Governing Law & Jurisdiction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              These Terms and Conditions are governed by the laws of India. Any disputes arising 
              from the use of our services shall be subject to the exclusive jurisdiction of the 
              courts in [Your City], India.
            </p>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>Dispute Resolution:</strong> We encourage users to contact our support team 
                first to resolve any issues before pursuing legal action.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <FileText className="h-5 w-5 mr-2" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              For questions about these Terms and Conditions, please contact us:
            </p>
            <div className="space-y-2">
              <p className="text-sm"><strong>Email:</strong> legal@wadicab.com</p>
              <p className="text-sm"><strong>Phone:</strong> +91 9518410151</p>
              <p className="text-sm"><strong>Address:</strong> Wadi Cab Legal Department, India</p>
              <p className="text-sm"><strong>Business Hours:</strong> Monday to Friday, 9 AM - 6 PM IST</p>
            </div>
          </CardContent>
        </Card>

        {/* Effective Date */}
        <Card className="mobile-card">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-600">
              These Terms and Conditions are effective as of January 1, 2025, and were last updated on January 1, 2025.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Version 1.0 • Wadi Cab Terms & Conditions
            </p>
          </CardContent>
        </Card>

      </div>
    </MobileLayout>
  )
} 