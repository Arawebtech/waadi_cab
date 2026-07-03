"use client"

import { MobileLayout } from "@/components/mobile-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Eye, Database, Users, Lock, Globe, Phone, Mail, FileText, AlertTriangle } from "lucide-react"

export default function PrivacySettingsPage() {
  return (
    <MobileLayout title="Privacy Settings" showBackButton backHref="/profile">
      <div className="px-4 py-6 space-y-6">
        
        {/* Header */}
        <Card className="mobile-card">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">Your privacy and data security are our top priorities</p>
            <Badge variant="outline" className="mt-2">
              Last updated: January 2025
            </Badge>
          </CardContent>
        </Card>

        {/* Information We Collect */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Database className="h-5 w-5 mr-2" />
              Information We Collect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium">Personal Information</h4>
                  <p className="text-sm text-gray-600">Name, phone number, email address for account creation and verification</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium">Vehicle Information</h4>
                  <p className="text-sm text-gray-600">Vehicle registration numbers, capacity, and type for border tax calculation</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium">Travel Information</h4>
                  <p className="text-sm text-gray-600">Entry/exit points, travel dates, destination states for tax processing</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Lock className="h-4 w-4 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium">Payment Information</h4>
                  <p className="text-sm text-gray-600">Transaction IDs and payment status (no credit card details stored)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How We Use Your Information */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Eye className="h-5 w-5 mr-2" />
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">• <strong>Border Tax Processing:</strong> Calculate and process state border taxes</p>
              <p className="text-sm text-gray-700">• <strong>Account Management:</strong> Create and maintain your user account</p>
              <p className="text-sm text-gray-700">• <strong>Pass Generation:</strong> Create digital border tax passes and receipts</p>
              <p className="text-sm text-gray-700">• <strong>Compliance:</strong> Ensure compliance with state tax regulations</p>
              <p className="text-sm text-gray-700">• <strong>Customer Support:</strong> Provide assistance and resolve issues</p>
              <p className="text-sm text-gray-700">• <strong>Notifications:</strong> Send booking confirmations and expiry alerts</p>
              <p className="text-sm text-gray-700">• <strong>Service Improvement:</strong> Analyze usage patterns to enhance our services</p>
            </div>
          </CardContent>
        </Card>

        {/* Information Sharing */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Users className="h-5 w-5 mr-2" />
              Information Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-800 mb-1">Government Authorities</h4>
                <p className="text-sm text-green-700">Tax and travel information shared with relevant state authorities for compliance and verification purposes</p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-1">Payment Processors</h4>
                <p className="text-sm text-blue-700">Secure payment processing through certified third-party payment gateways</p>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-800 mb-1">Service Providers</h4>
                <p className="text-sm text-yellow-700">SMS and email service providers for notifications (phone/email only)</p>
              </div>
              
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-1 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  We Never Share
                </h4>
                <p className="text-sm text-red-700">Personal data with advertisers, marketers, or unauthorized third parties</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Security */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Lock className="h-5 w-5 mr-2" />
              Data Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">• <strong>Encryption:</strong> All data transmitted using SSL/TLS encryption</p>
              <p className="text-sm text-gray-700">• <strong>Secure Storage:</strong> Data stored in secure, encrypted databases</p>
              <p className="text-sm text-gray-700">• <strong>Access Control:</strong> Strict access controls and authentication</p>
              <p className="text-sm text-gray-700">• <strong>Regular Audits:</strong> Security assessments and vulnerability testing</p>
              <p className="text-sm text-gray-700">• <strong>Data Backup:</strong> Regular backups with encryption</p>
              <p className="text-sm text-gray-700">• <strong>Incident Response:</strong> 24/7 monitoring and rapid response protocols</p>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Shield className="h-5 w-5 mr-2" />
              Your Privacy Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">• <strong>Access:</strong> Request a copy of your personal data</p>
              <p className="text-sm text-gray-700">• <strong>Correction:</strong> Update or correct inaccurate information</p>
              <p className="text-sm text-gray-700">• <strong>Deletion:</strong> Request deletion of your account and data</p>
              <p className="text-sm text-gray-700">• <strong>Portability:</strong> Export your data in a readable format</p>
              <p className="text-sm text-gray-700">• <strong>Opt-out:</strong> Unsubscribe from marketing communications</p>
              <p className="text-sm text-gray-700">• <strong>Complaint:</strong> Lodge complaints with data protection authorities</p>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Some data may be retained for legal compliance and tax record requirements as per state regulations.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="mobile-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Mail className="h-5 w-5 mr-2" />
              Privacy Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">
              For privacy-related questions, concerns, or to exercise your rights, contact us:
            </p>
            <div className="space-y-2">
              <p className="text-sm"><strong>Email:</strong> wadiup9@gmail.com</p>
              <p className="text-sm"><strong>Phone:</strong> +91 9518410151</p>
              {/* <p className="text-sm"><strong>Address:</strong> Wadi Cab Privacy Office, India</p> */}
              {/* <p className="text-sm"><strong>Response Time:</strong> Within 30 days</p> */}
            </div>
          </CardContent>
        </Card>

        {/* Policy Updates */}
        <Card className="mobile-card">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 text-center">
              This privacy policy may be updated periodically. Users will be notified of significant changes via email or app notification.
            </p>
          </CardContent>
        </Card>

      </div>
    </MobileLayout>
  )
} 