"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TermsAndConditionsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsAndConditions({ open, onOpenChange }: TermsAndConditionsProps) {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="text-2xl font-bold">Terms & Conditions – Waadi</DialogTitle>
          <DialogDescription>
            Last Updated: {today}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden px-6">
          <ScrollArea className="h-full">
            <div className="space-y-4 text-sm leading-relaxed pb-4 pr-4">
            <p className="text-gray-700">
              Please read these Terms & Conditions ("Terms") carefully before using the Waadi mobile application, website, and related services ("Platform", "Service", "We/Us/Our"). By accessing or using Waadi, users ("Driver", "User", "You/Your") agree to be bound by these Terms.
            </p>
            
            <p className="font-semibold text-gray-900">
              If you do not agree with any part of these Terms, you must stop using Waadi immediately.
            </p>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">1️⃣ About Waadi</h3>
              <p className="text-gray-700 mb-2">Waadi is a service platform that:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Collects border tax booking requests from drivers.</li>
                <li>Uses the publicly available Parivahan website or relevant government services to generate the required border tax slip.</li>
                <li>Delivers the slip digitally via the Waadi app, WhatsApp, or other communication channels.</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Waadi acts only as an agent/booking facilitator and is not affiliated with any government authority.
              </p>
              <p className="text-gray-700">
                We also collect general leads related to vehicle insurance to assist drivers with insurance services through partnered providers.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">2️⃣ Eligibility</h3>
              <p className="text-gray-700 mb-2">Users must:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Be legal owners or authorized drivers of the submitted vehicle.</li>
                <li>Provide true, accurate, complete details.</li>
              </ul>
              <p className="text-gray-700 mt-2">
                By using Waadi, you confirm that you are at least 18 years old and capable of entering legal agreements.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">3️⃣ User Information & Data Collection</h3>
              <p className="text-gray-700 mb-2">To provide the service, Waadi collects the following details:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Vehicle Number</li>
                <li>Vehicle Type (e.g., 4+1 / 6+1)</li>
                <li>WhatsApp Number</li>
                <li>Travel Date</li>
                <li>State & District of travel</li>
                <li>Optional: Insurance-related details (contact, vehicle info, policy expiry, etc.)</li>
              </ul>
              <p className="text-gray-700 mt-2">
                We store recent contact and vehicle details so drivers do not have to enter them repeatedly.
              </p>
              <p className="text-gray-700">
                The user is responsible for the accuracy of all submitted data.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">4️⃣ Role as Agent & Use of Third-Party Websites</h3>
              <p className="text-gray-700 mb-2">Waadi uses third-party government portals like Parivahan to process your border tax.</p>
              <p className="text-gray-700 mb-2">We do not guarantee:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>The Parivahan system's uptime.</li>
                <li>The correctness of slip data generated.</li>
                <li>Any delay caused by system downtime or government websites.</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Waadi only facilitates booking; Government authorities are fully responsible for tax-related processing and legality.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">5️⃣ Service Fees & Payments</h3>
              <p className="text-gray-700 mb-2">Waadi charges a convenience/service fee for:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Data entry</li>
                <li>Online submission</li>
                <li>Slip retrieval and digital delivery</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Government taxes/fees are separate and added as applicable.
              </p>
              <p className="text-gray-700">
                Payments made through the app are non-refundable once the booking process begins.
              </p>
              <p className="text-gray-700">
                In case Waadi fails to generate the slip due to technical issues only from our end, a refund may be considered after internal validation.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">6️⃣ Delivery of Border Tax Slip</h3>
              <p className="text-gray-700 mb-2">Slips are shared digitally on:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Waadi app</li>
                <li>WhatsApp or via registered mobile</li>
              </ul>
              <p className="text-gray-700 mt-2 mb-2">Drivers are responsible for:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Downloading, safekeeping, and printing the slip if required</li>
              </ul>
              <p className="text-gray-700 mt-2 mb-2">Waadi is not liable if:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>The slip is deleted by the user</li>
                <li>The user fails to show it at a checkpoint</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">7️⃣ Insurance Leads & Offers</h3>
              <p className="text-gray-700 mb-2">Contact and vehicle details may be used to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Provide insurance quotes</li>
                <li>Notify renewal offers or related services</li>
              </ul>
              <p className="text-gray-700 mt-2 mb-2">Waadi does not guarantee:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Pricing</li>
                <li>Claim approvals</li>
                <li>Policy terms given by external insurance partners</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Drivers must carefully review the policy documents before purchase.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">8️⃣ User Conduct</h3>
              <p className="text-gray-700 mb-2">Users agree:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Not to misuse the platform or submit fraudulent vehicle details.</li>
                <li>Not to disrupt or attempt to hack system infrastructure.</li>
                <li>Not to impersonate another driver or provide false ownership documents.</li>
              </ul>
              <p className="text-gray-700 mt-2 mb-2">Violation may lead to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Account suspension</li>
                <li>Legal action if necessary</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">9️⃣ Data Privacy & Storage</h3>
              <p className="text-gray-700">
                Waadi stores certain data for faster future bookings.
              </p>
              <p className="text-gray-700">
                We do not sell personal data to unauthorized third parties.
              </p>
              <p className="text-gray-700 mb-2">Data may be shared with:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Government authorities when required by law</li>
                <li>Insurance partner companies upon user consent</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Data is retained only as long as necessary for service purposes and business compliance.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">🔟 Limitation of Liability</h3>
              <p className="text-gray-700 mb-2">Waadi shall not be liable for:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Delays or failure due to government website issues.</li>
                <li>Incorrect data provided by the user.</li>
                <li>Fines or penalties imposed due to expired or invalid slips.</li>
                <li>Network issues, system failures, or technical errors.</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Maximum liability of Waadi shall not exceed the amount paid for the respective booking.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">1️⃣1️⃣ Intellectual Property</h3>
              <p className="text-gray-700">
                All logos, designs, technology, and content of Waadi are owned by us.
              </p>
              <p className="text-gray-700">
                Unauthorized use, reproduction, or duplication is prohibited.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">1️⃣2️⃣ Modifications</h3>
              <p className="text-gray-700 mb-2">Waadi reserves the right to:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Modify the platform</li>
                <li>Update pricing</li>
                <li>Change these Terms any time</li>
              </ul>
              <p className="text-gray-700 mt-2">
                Users will be notified if required by applicable laws.
              </p>
              <p className="text-gray-700">
                Continued use after changes implies acceptance.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">1️⃣3️⃣ Governing Law & Jurisdiction</h3>
              <p className="text-gray-700">
                These Terms shall be governed by the laws of India.
              </p>
              <p className="text-gray-700">
                Any disputes shall fall under the jurisdiction of courts in Haryana/Delhi NCR.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base text-gray-900 mb-2">1️⃣4️⃣ Contact Information</h3>
              <p className="text-gray-700 mb-2">For support, queries, or grievances:</p>
              <p className="text-gray-700 font-medium">
                📞 Phone/WhatsApp: +91 9991826197
              </p>
            </section>

            <section className="border-t pt-4 mt-6">
              <h3 className="font-semibold text-base text-gray-900 mb-2">User Acceptance</h3>
              <p className="text-gray-700 font-medium">
                By using Waadi, you agree that you have read, understood, and accepted these Terms & Conditions.
              </p>
            </section>
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end pt-4 pb-6 px-6 border-t flex-shrink-0">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
