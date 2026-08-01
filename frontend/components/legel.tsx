"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, CreditCard, ShieldCheck, RotateCcw, X } from "lucide-react"

type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "p-bold"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }

type PolicyKey = "terms" | "payment" | "privacy" | "refund"

interface PolicyData {
  key: PolicyKey
  label: string
  icon: React.ElementType
  title: string
  effectiveDate: string
  lastUpdated: string
  version?: string
  blocks: Block[]
}

function renderBlock(block: Block, idx: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2
          key={idx}
          className="text-lg font-bold text-gray-900 mt-8 mb-3 pb-2 border-b first:mt-0"
        >
          {block.text}
        </h2>
      )
    case "h3":
      return (
        <h3 key={idx} className="font-semibold text-base text-gray-900 mb-2 mt-5">
          {block.text}
        </h3>
      )
    case "p":
      return (
        <p key={idx} className="text-gray-700 mb-2 leading-relaxed">
          {block.text}
        </p>
      )
    case "p-bold":
      return (
        <p key={idx} className="font-semibold text-gray-900 mb-2 leading-relaxed">
          {block.text}
        </p>
      )
    case "ul":
      return (
        <ul key={idx} className="list-disc list-inside space-y-1 text-gray-700 ml-2 mb-3">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case "ol":
      return (
        <ol key={idx} className="list-decimal list-inside space-y-1 text-gray-700 ml-2 mb-3">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      )
    case "table":
      return (
        <div key={idx} className="overflow-x-auto mb-4 rounded-md border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-900"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="even:bg-gray-50/50">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border-b border-gray-100 px-3 py-2 text-gray-700 align-top"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

const termsBlocks: Block[] = [
  {
    type: "p",
    text:
      'These Terms and Conditions ("Agreement", "Terms") constitute a legally binding contract under Section 10 of the Indian Contract Act, 1872 between Waadi Tax & Insurance Solutions (GSTIN: 06CBFPJ8826H1ZH, Udyam: UDYAM-HR-21-0030370), a proprietorship firm managed by JAFRIDA, with its Registered Office at Kherla Nuh, Delhi Road, Haryana, 122107 ("Firm", "we", "us", "our"); and any natural person who downloads, accesses, registers upon, or uses the Waadi mobile application ("App", "Platform") ("User", "you", "your").',
  },
  {
    type: "p-bold",
    text:
      'By clicking "I Agree", registering an account, or using the App, you acknowledge that you have read, understood, and agree to be bound by these Terms, along with our Privacy Policy and Refund Policy, which are incorporated herein by reference. If you do not agree, you must immediately cease use of the App.',
  },
  { type: "h2", text: "Part I: Legal and Regulatory Framework" },
  { type: "h3", text: "1. Governing Laws" },
  { type: "p", text: "This Agreement is governed by and shall be construed in accordance with the following applicable Indian laws." },
  {
    type: "ul",
    items: [
      "Indian Contract Act, 1872 — Governs the formation, validity, and enforceability of this Agreement",
      "Information Technology Act, 2000 — Governs electronic contracts (Section 10A), intermediary liability, and digital transactions",
      "Consumer Protection Act, 2019 — Protects consumer rights and provides grievance mechanisms for users of e-commerce services",
      "Consumer Protection (E-Commerce) Rules, 2020 — Mandates specific disclosures and fair practices for e-commerce platforms",
      "Motor Vehicles Act, 1988 — Governs the underlying transport compliance services facilitated by the App",
      "RBI Master Directions on Payment Aggregators and Payment Gateways (March 17, 2020, as amended)",
      "GST Act, 2017 and Rules thereunder",
      "Copyright Act, 1957 and Trade Marks Act, 1999 (for IP protection)",
      "Arbitration and Conciliation Act, 1996 (for dispute resolution)",
    ],
  },
  {
    type: "p",
    text:
      "Electronic Contracts: This Agreement constitutes a valid electronic contract under Section 10A of the IT Act, 2000, which provides that contracts formed through electronic means shall not be deemed unenforceable solely on the grounds that they are in electronic form.",
  },
  { type: "h2", text: "Part II: Important Government Disclaimer" },
  { type: "h3", text: "2. Independent Service Provider Declaration" },
  {
    type: "p",
    text:
      "Waadi Tax & Insurance Solutions is an independent transport assistance portal operated by JAFRIDA as a proprietorship firm. We are NOT a government service, government portal, or government-affiliated platform.",
  },
  { type: "p", text: "We are NOT affiliated with, authorized by, endorsed by, or in any way officially connected with:" },
  {
    type: "ul",
    items: [
      "The Government of India or any Ministry thereof",
      "Any State Government or Union Territory Administration",
      "The Ministry of Road Transport and Highways (MoRTH)",
      "Parivahan Sewa or the VAHAN portal (parivahan.gov.in)",
      "National Highways Authority of India (NHAI)",
      "National Payments Corporation of India (NPCI), except as a user of their UPI/FASTag infrastructure via PayU",
      "Any State Transport Authority, Regional Transport Office (RTO), or Motor Vehicle Department",
    ],
  },
  {
    type: "p",
    text:
      "We facilitate manual transport compliance services through our 24/7 operator desk that accesses publicly available government portals to process your requests. This is a facilitation service, not a government-to-citizen (G2C) service.",
  },
  {
    type: "p",
    text:
      "Legal Note: Misrepresentation of government affiliation is a criminal offence under Section 416 (Cheating by Personation) and Section 419 of the Indian Penal Code, 1860 (now replaced by the Bharatiya Nyaya Sanhita, 2023). We categorically disclaim any such affiliation.",
  },
  { type: "h2", text: "Part III: Definitions" },
  { type: "h3", text: "3. Defined Terms" },
  { type: "p", text: "In these Terms, unless the context otherwise requires:" },
  {
    type: "ul",
    items: [
      '"App" — The Waadi mobile application available on Google Play Store and Apple App Store',
      '"Services" — Border entry tax facilitation, challan payment assistance, temporary and national permit processing, document vault management, and related transport utility services',
      '"Government Tax Amount" — The official tax, fee, or levy prescribed by and payable to the relevant government authority under the Motor Vehicles Act, 1988, or applicable state legislation',
      '"Service Fee" — The facilitation and operator desk fee charged by Waadi Tax & Insurance Solutions, separate from and in addition to the Government Tax Amount',
      '"GST" — Goods and Services Tax at the applicable rate (currently 18%) on the Service Fee under the GST Act, 2017',
      '"Total Amount" — Government Tax Amount + Service Fee + GST on Service Fee',
      '"Order" — A service request submitted by you through the App for processing by our operator desk',
      '"Operator Desk" — Our team of trained operators who process your Orders on official government portals on a 24/7 basis',
      '"VAHAN Receipt" or "Government Receipt" — The official payment confirmation generated by the government portal (bearing a Government Receipt Number/GRN), uploaded to your account upon successful processing',
      '"Account" — Your registered user profile on the Waadi platform',
    ],
  },
  { type: "h2", text: "Part IV: Eligibility and Registration" },
  { type: "h3", text: "4. Eligibility" },
  {
    type: "p",
    text:
      "4.1 You must be a natural person who is at least 18 years of age and legally competent to enter into contracts under Section 11 of the Indian Contract Act, 1872 (i.e., not a minor, not of unsound mind, and not disqualified by law).",
  },
  {
    type: "p",
    text:
      "4.2 By using the App, you represent and warrant that: (a) you are the registered owner or an authorized representative of the vehicle for which services are requested; (b) all information provided by you is true, accurate, complete, and current; (c) you have the authority to upload and submit all documents provided.",
  },
  {
    type: "p",
    text:
      "4.3 Minors are strictly prohibited from using this App. If we discover that a minor has created an account, we will immediately terminate the account and delete all associated data per Section 9 of the DPDPA 2023.",
  },
  { type: "h2", text: "Part V: Nature and Scope of Services" },
  { type: "h3", text: "5.1 Border Entry Tax Facilitation" },
  {
    type: "p",
    text:
      "We facilitate the payment of border entry/transit taxes for commercial and private vehicles crossing state borders. Our Operator Desk accesses the Parivahan Sewa portal (parivahan.gov.in) operated by MoRTH and processes the tax payment on your behalf.",
  },
  {
    type: "p",
    text:
      "Official VAHAN receipts bearing a Government Receipt Number (GRN) are issued by the government portal and uploaded to your App account, typically within 10–15 minutes of payment completion.",
  },
  {
    type: "p",
    text:
      "Verification: All GRNs on uploaded receipts can be independently cross-verified at parivahan.gov.in. This ensures complete transparency and authenticity.",
  },
  { type: "h3", text: "5.2 Challan Payment and Verification" },
  {
    type: "p",
    text:
      "We assist in verifying and clearing pending traffic challans issued under the Motor Vehicles Act, 1988 through the e-Challan portal (echallan.parivahan.gov.in). Challan payments are subject to the e-Challan system's availability and government portal processing times.",
  },
  { type: "h3", text: "5.3 Permit Processing" },
  {
    type: "p",
    text:
      "We assist in filing applications for temporary permits under Section 87 and national permits under Section 88 of the Motor Vehicles Act, 1988. Permit grants are subject to the discretion of the competent transport authority and are not guaranteed by us.",
  },
  { type: "h3", text: "5.4 Document Vault" },
  {
    type: "p",
    text: "A secure digital storage facility for vehicle compliance documents with automated expiry alerts via in-App notification, SMS, or email.",
  },
  { type: "h3", text: "5.5 No Guarantee of Government Approval" },
  {
    type: "p",
    text:
      "We are a facilitator. We do not guarantee the outcome of any application or submission made to a government authority. Rejection by a government portal, refusal of a permit application, or changes in government policy are beyond our control. Our liability in such cases is limited to processing a full refund as per our Refund Policy.",
  },
  { type: "h2", text: "Part VI: Service Fee and Charges" },
  { type: "h3", text: "6. Pricing, Service Fee, and GST" },
  {
    type: "p",
    text:
      "6.1 The Government Tax Amount is the exact fee prescribed by the relevant government authority and is collected by us as a pass-through on behalf of that authority. We do not mark up or earn any margin on this amount.",
  },
  {
    type: "p",
    text:
      "6.2 The Service Fee is our consideration for providing operator desk services, technical infrastructure, 24/7 support, and the facilitation platform. This fee is non-refundable once processing commences (see Refund Policy).",
  },
  {
    type: "p",
    text:
      "6.3 GST at 18% is applicable on the Service Fee as per the GST Act, 2017 and Notification No. 11/2017-Central Tax (Rate). A GST-compliant invoice will be issued for every transaction, as required under Section 31 of the GST Act, 2017.",
  },
  {
    type: "p",
    text:
      "6.4 All pricing is displayed transparently at the checkout screen before you confirm payment. The Consumer Protection (E-Commerce) Rules, 2020 (Rule 5(1)(g)) mandates that e-commerce entities display total prices in a clear and unambiguous manner, which we comply with strictly.",
  },
  { type: "h2", text: "Part VII: User Obligations" },
  { type: "h3", text: "7. User Responsibilities and Warranties" },
  { type: "p", text: "You agree to:" },
  {
    type: "ul",
    items: [
      "Provide accurate, complete, and non-fraudulent information. Submitting false vehicle registration numbers, owner details, or forged documents is a criminal offence under Section 468 and Section 471 of the Indian Penal Code, 1860 (now Sections 336 and 338 of the Bharatiya Nyaya Sanhita, 2023).",
      "Not use the App for any purpose contrary to law, including tax evasion, misrepresentation of vehicle details, or circumvention of the Motor Vehicles Act, 1988.",
      "Maintain the confidentiality of your account credentials. You are solely responsible for all activity conducted through your account. Notify us immediately at javeskhan27@gmail.com if you suspect unauthorized access.",
      "Not attempt to decompile, reverse engineer, disassemble, or create derivative works from the App's source code, per the Copyright Act, 1957 (Section 63) and the IT Act, 2000.",
      "Not engage in any conduct that disrupts or impairs the functioning of the App or our servers — a criminal offence under Section 66 of the IT Act, 2000, punishable with imprisonment of up to 3 years and/or a fine of up to Rs. 5,00,000.",
    ],
  },
  { type: "h2", text: "Part VIII: Intellectual Property" },
  { type: "h3", text: "8. Ownership of IP" },
  {
    type: "p",
    text:
      "8.1 All intellectual property in the App, including but not limited to source code, algorithms, database architecture, UI/UX design, logos, trademarks, service marks, trade names, and written content, is the exclusive property of Waadi Tax & Insurance Solutions, protected under the Copyright Act, 1957, the Trade Marks Act, 1999, and the IT Act, 2000.",
  },
  {
    type: "p",
    text:
      "8.2 No portion of the App may be reproduced, distributed, publicly displayed, transmitted, or otherwise exploited without our express written consent.",
  },
  { type: "h2", text: "Part IX: Limitation of Liability" },
  { type: "h3", text: "9. Disclaimer of Warranties and Limitation of Liability" },
  {
    type: "p",
    text:
      '9.1 Services are provided "as is" and "as available." To the fullest extent permitted by applicable law, we disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.',
  },
  {
    type: "p",
    text:
      "9.2 Maximum Liability: Our total aggregate liability to you for any claim arising under or in connection with these Terms shall not exceed the Service Fee paid by you for the specific Order that is the subject of the claim. This limitation applies to all causes of action in the aggregate, including breach of contract, tort, negligence, strict liability, and any other legal or equitable theory.",
  },
  { type: "p", text: "9.3 Excluded Liabilities: We shall not be liable for:" },
  {
    type: "ul",
    items: [
      "Any indirect, incidental, special, consequential, exemplary, or punitive damages",
      "Loss of profits, revenue, business opportunities, or goodwill",
      "Any penalty, fine, or legal consequence imposed on you by any authority due to inaccurate information you provided",
      "Delays or failures caused by government portal downtime, VAHAN system outages, or changes in government policy",
      "Loss arising from unauthorized access to your account due to your failure to maintain credential confidentiality",
    ],
  },
  {
    type: "p",
    text:
      "Reference: The principle of proportionate liability limitation in service contracts is recognized in Indian commercial practice — see M/s. Bharti Knitting Company v. DHL Worldwide Express Courier Division of Airfreight Ltd., (1996) 4 SCC 704, which upheld limitation of liability clauses in service contracts as enforceable if not unconscionable.",
  },
  { type: "h2", text: "Part X: Indemnification" },
  { type: "h3", text: "10. User Indemnity Obligation" },
  {
    type: "p",
    text:
      "You agree to indemnify, defend, and hold harmless Waadi Tax & Insurance Solutions, its proprietor (JAFRIDA), employees, agents, successors, and assigns from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with your breach of these Terms, violation of applicable law, inaccurate or fraudulent information, unauthorized use of the App, or any action taken by government authorities against you in relation to your vehicle compliance status.",
  },
  { type: "h2", text: "Part XI: Termination" },
  { type: "h3", text: "11. Account Suspension and Termination" },
  {
    type: "p",
    text:
      "11.1 User-Initiated Termination: You may request account deletion at any time through the App settings or by writing to javeskhan27@gmail.com. Upon deletion, your personal data will be handled per our Privacy Policy and applicable data retention laws.",
  },
  { type: "p", text: "11.2 Company-Initiated Suspension/Termination: We may suspend or permanently terminate your account, without notice, if:" },
  {
    type: "ul",
    items: [
      "You are found to have violated these Terms",
      "Your account is associated with fraudulent activity",
      "Required by a court order, government directive, or law enforcement request",
      "Your account poses a security risk to other users or our systems",
    ],
  },
  {
    type: "p",
    text:
      "Termination does not affect any rights or obligations that accrued prior to termination, including payment obligations and indemnity.",
  },
  { type: "h2", text: "Part XII: Dispute Resolution" },
  { type: "h3", text: "12.1 Governing Law" },
  { type: "p", text: "These Terms are governed exclusively by the laws of the Republic of India." },
  { type: "h3", text: "12.2 Mandatory Grievance Escalation" },
  {
    type: "p",
    text:
      "Before initiating any legal proceeding, you agree to first raise your dispute with our Grievance Officer, Jafrida, at javeskhan27@gmail.com and allow us 30 (thirty) days to resolve it.",
  },
  { type: "h3", text: "12.3 Arbitration" },
  {
    type: "p",
    text:
      "Any dispute that cannot be resolved through mutual negotiation within 30 days shall be referred to and finally resolved by binding arbitration under the Arbitration and Conciliation Act, 1996 (as amended).",
  },
  {
    type: "ul",
    items: [
      "Arbitrator: A sole arbitrator mutually appointed by both parties, or appointed as per Section 11 of the Arbitration and Conciliation Act, 1996 if no agreement is reached within 15 days",
      "Seat and Venue of Arbitration: Nuh, Haryana, India",
      "Language: English or Hindi",
      "Award: The arbitral award shall be final and binding on both parties",
    ],
  },
  { type: "h3", text: "12.4 Consumer Rights Exception" },
  {
    type: "p",
    text:
      "Nothing in this arbitration clause shall prevent a User from approaching any Consumer Dispute Redressal Commission under the Consumer Protection Act, 2019, as this statutory right cannot be contractually waived.",
  },
  { type: "h3", text: "12.5 Jurisdiction" },
  { type: "p", text: "Subject to the arbitration clause, the courts at Nuh, Haryana, India shall have exclusive jurisdiction." },
  { type: "h2", text: "Part XIII: Miscellaneous" },
  { type: "h3", text: "13. Consumer Protection Compliance" },
  {
    type: "ul",
    items: [
      "All material information including seller details, pricing breakup, service terms, and grievance mechanism are displayed within the App",
      "No fake reviews or manipulative commercial practices are employed",
      "Users have the right to cancel eligible Orders per our Refund Policy",
      "A functional grievance mechanism is available at all times",
    ],
  },
  { type: "h3", text: "14. Force Majeure" },
  {
    type: "p",
    text:
      'Waadi Tax & Insurance Solutions shall not be in breach of these Terms nor liable for any failure or delay in performance due to causes beyond our reasonable control ("Force Majeure Event"), including acts of God, war, government actions, national lockdowns, pandemic-related restrictions, internet infrastructure failures, VAHAN portal outages, natural disasters, or power failures. During a Force Majeure Event, our obligations are suspended; if it continues for more than 30 days, either party may terminate the affected Orders, and refunds shall be processed accordingly.',
  },
  { type: "h3", text: "15. Severability" },
  {
    type: "p",
    text:
      'If any provision of these Terms is found invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it enforceable, reflecting the original intent of the parties, per the "reading down" principle in Indian contract law.',
  },
  { type: "h3", text: "16. Entire Agreement" },
  {
    type: "p",
    text:
      "These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement between the parties with respect to the subject matter hereof and supersede all prior negotiations, representations, and agreements.",
  },
  { type: "h3", text: "17. Contact" },
  {
    type: "p",
    text:
      "Email: javeskhan27@gmail.com · Entity: Waadi Tax & Insurance Solutions · GSTIN: 06CBFPJ8826H1ZH · Udyam: UDYAM-HR-21-0030370 · Registered Office: Kherla Nuh, Delhi Road, Haryana, 122107",
  },
]

const paymentBlocks: Block[] = [
  {
    type: "p",
    text:
      'This Payment Policy ("Policy") governs all financial transactions initiated through the Waadi mobile application and website (https://waadi.in/), operated by Waadi Tax & Insurance Solutions, a JAFRIDA Proprietorship. We are a MSME-registered Private Consultancy providing facilitation and professional services.',
  },
  { type: "p", text: "This Policy is published in compliance with:" },
  {
    type: "ul",
    items: [
      "Digital Personal Data Protection (DPDP) Act, 2023 — ensuring world-class privacy standards for your financial data",
      "RBI Master Direction on Payment Aggregators and Payment Gateways, 2020 (PA-PG Guidelines) — governs entities that facilitate online payments",
      "RBI Master Direction on Digital Payment Security Controls, 2021 — prescribes minimum security standards for digital payment systems",
      "RBI Circular on Limiting Liability of Customers in Unauthorized Electronic Payment Transactions (RBI/2017-18/15)",
      "PCI-DSS (Payment Card Industry Data Security Standard) — industry standard applied by our Payment Aggregator, PayU",
      "Information Technology Act, 2000 — Section 43A and IT Rules on secure electronic transactions",
      "GST Act, 2017 — Sections 15, 31, 34 on valuation, invoicing, and credit notes",
      "Consumer Protection Act, 2019 and E-Commerce Rules, 2020 — transparency in pricing and payment terms",
      "FEMA (Foreign Exchange Management Act), 1999 — restricting transactions to INR only",
    ],
  },
  { type: "h2", text: "Part I: Payment Aggregator" },
  { type: "h3", text: "1.1 Authorization and Certification" },
  {
    type: "p",
    text:
      "All payment transactions on Waadi are exclusively processed through PayU Payments Private Limited. By using our services, you acknowledge that Waadi Tax & Insurance Solutions acts as a Private Consultancy and not a government body.",
  },
  {
    type: "ul",
    items: [
      "RBI-Authorized Payment Gateway — all payments are secured via PayU, ensuring compliance with the PSS Act and Google Play Billing policies where applicable",
      "PCI-DSS Level 1 Certified — the highest level of PCI-DSS certification, covering all PayU-hosted payment pages and data",
    ],
  },
  {
    type: "p",
    text:
      "By choosing to make a payment on Waadi, you also agree to be bound by PayU's Terms of Service and Privacy Policy with respect to the payment transaction itself.",
  },
  { type: "h3", text: "1.2 Why This Matters for You" },
  { type: "p", text: "As an RBI-authorized Payment Aggregator, PayU is required to:" },
  {
    type: "ul",
    items: [
      "Maintain a nodal/escrow account for User funds as per RBI directives",
      "Settle merchant funds within timelines prescribed by RBI (currently T+1 or T+2 business days)",
      "Comply with all RBI directives on payment security, fraud prevention, and grievance redressal",
      "Provide a Nodal Officer for escalation of payment-related complaints",
    ],
  },
  { type: "p", text: "This ensures that your money is protected at every stage of the transaction." },
  { type: "h2", text: "Part II: Payment Security Standards" },
  { type: "h3", text: "2.1 Encryption Standards" },
  {
    type: "p",
    text:
      "All payment transactions are protected by 256-bit SSL/TLS encryption across the entire payment journey — from your device to the PayU payment gateway to the acquiring bank, meeting the standards specified in the RBI Master Direction on Digital Payment Security Controls, 2021.",
  },
  { type: "h3", text: "2.2 Two-Factor Authentication (2FA)" },
  {
    type: "p",
    text:
      "All card-based transactions go through Additional Factor of Authentication (AFA) — commonly implemented as OTP-based 3D Secure (3DS) authentication — as per RBI Circular DPSS.CO.PD.No.1462/02.14.003/2019-20 on online transactions.",
  },
  { type: "h3", text: "2.3 Tokenization" },
  { type: "p", text: "As per RBI Circular RBI/2021-22/90 on Card-on-File Tokenization (CoFT):" },
  {
    type: "ul",
    items: [
      "Card numbers are tokenized — replaced by a unique token — by PayU's systems",
      "Waadi Tax & Insurance Solutions does NOT store sensitive card credentials (CVV/PIN) on its servers",
      "Even our own engineers cannot access your card details",
    ],
  },
  { type: "h3", text: "2.4 UPI Security" },
  {
    type: "p",
    text:
      "UPI payments are processed through the National Payments Corporation of India (NPCI) infrastructure, which employs end-to-end encryption and is overseen by RBI. Your UPI PIN never leaves your registered UPI app.",
  },
  { type: "h3", text: "2.5 Data Localization" },
  {
    type: "p",
    text:
      "In compliance with RBI Circular DPSS.CO.OD.No.2785/06.08.005/2017-18 (Payment Data Storage Directive, 2018), all payment system data is stored exclusively within India.",
  },
  { type: "h2", text: "Part III: Accepted Payment Methods" },
  {
    type: "table",
    headers: ["Payment Mode", "Examples", "Authentication"],
    rows: [
      ["UPI", "Google Pay, PhonePe, Paytm, BHIM, any UPI app", "UPI PIN (on your device)"],
      ["Credit Cards", "Visa, Mastercard, RuPay, American Express", "OTP (3D Secure/AFA)"],
      ["Debit Cards", "Visa, Mastercard, RuPay", "OTP (3D Secure/AFA)"],
      ["Net Banking", "All major Indian banks", "Bank's own 2FA"],
      ["Digital Wallets", "Supported wallets via PayU", "Wallet PIN/OTP"],
    ],
  },
  {
    type: "p",
    text:
      "Currency: All transactions are denominated and settled in Indian Rupees (INR) only. International currency transactions are not supported, in compliance with FEMA, 1999.",
  },
  {
    type: "p",
    text:
      "No Surcharges: We do not charge any additional fee for using a specific payment mode. The amount displayed at checkout is the final amount debited, in compliance with the RBI Circular on Merchant Discount Rate (MDR) and the Consumer Protection (E-Commerce) Rules, 2020.",
  },
  { type: "h2", text: "Part IV: Pricing and Transparency" },
  {
    type: "p",
    text:
      'In strict compliance with Rule 5(1)(g) of the Consumer Protection (E-Commerce) Rules, 2020, which requires e-commerce entities to display all prices in a "clear and unambiguous manner," we display the following at every checkout screen:',
  },
  {
    type: "table",
    headers: ["Component", "Description", "Legal Basis"],
    rows: [
      ["Consultancy Fee", "Charges for facilitation and professional advice", "MSME/Service Contract"],
      ["Govt Taxes/Out-of-Pocket", "Official fees paid to authorities on your behalf", "Reimbursement basis"],
      ["GST (18%)", "Statutory tax on our Consultancy Fee", "GST Act, 2017"],
      ["Total Payable", "Comprehensive amount", "Inclusive of all disclosures"],
    ],
  },
  {
    type: "p",
    text:
      "Price Lock: The Total Amount displayed at checkout at the time of Order creation is locked for that transaction. We do not change the amount after you have initiated payment.",
  },
  { type: "h2", text: "Part V: Payment Confirmation and Invoicing" },
  { type: "h3", text: "5.1 Payment Confirmation" },
  { type: "p", text: "Upon successful payment authorization by PayU:" },
  {
    type: "ul",
    items: [
      "An in-App Order confirmation is generated with a unique Order ID",
      'The Order transitions to "Processing" status',
      "Our Operator Desk is notified and begins processing on the government portal",
    ],
  },
  { type: "h3", text: "5.2 Official VAHAN Receipt" },
  { type: "p", text: "Upon successful completion by our Operator Desk:" },
  {
    type: "ul",
    items: [
      "The official government receipt (bearing GRN) is uploaded to your App account",
      "Average delivery time: 10–15 minutes from payment confirmation",
      "The GRN can be independently verified at parivahan.gov.in",
    ],
  },
  { type: "h3", text: "5.3 GST Invoice" },
  {
    type: "p",
    text:
      "A GST-compliant tax invoice is generated for every completed transaction, as mandated under Section 31 of the GST Act, 2017, containing:",
  },
  {
    type: "ul",
    items: [
      "Waadi Tax & Insurance Solutions' registered GSTIN and MSME Number",
      "Unique invoice number and date",
      'Description: "Transport Compliance Facilitation Services"',
      "Itemized breakup: Government Tax Amount (pass-through), Service Fee, GST",
      "Total amount",
      "Place of supply",
    ],
  },
  { type: "h2", text: "Part VI: Failed and Disputed Transactions" },
  { type: "h3", text: "6.1 Clean Payment Failure (No Debit)" },
  {
    type: "p",
    text: "If your payment fails and no amount is debited, the Order will not be created. You are free to retry with the same or a different payment method.",
  },
  { type: "h3", text: "6.2 Amount Debited but Payment Status Unclear" },
  {
    type: "p",
    text: "This can occur due to network disruption between your bank and the payment gateway. In such cases:",
  },
  {
    type: "ul",
    items: [
      "PayU's automatic reconciliation system typically detects and reverses the amount within 5–7 business days",
      "If the payment is confirmed by PayU, your Order will be processed normally",
      "If you do not see an Order created within 24 hours, contact us via WhatsApp/Call at 9518410151 or email support@waadi.in",
    ],
  },
  {
    type: "p",
    text:
      "RBI Protection: Under RBI Circular RBI/2017-18/15 on limiting customer liability in unauthorized transactions, your bank is also obligated to investigate and resolve disputed transactions within the timelines prescribed by RBI.",
  },
  { type: "h3", text: "6.3 Chargebacks" },
  {
    type: "p",
    text:
      "If you initiate a chargeback with your card-issuing bank for a valid transaction (one that was successfully processed and for which a VAHAN receipt was delivered), we reserve the right to contest the chargeback with evidence of service delivery. Filing false chargebacks may constitute fraud under applicable law.",
  },
  { type: "h2", text: "Part VII: Regulatory Compliance" },
  { type: "h3", text: "7.1 RBI Payment Aggregator Compliance" },
  { type: "p", text: "We operate through PayU as our sole PA. PayU maintains:" },
  {
    type: "ul",
    items: [
      "A nodal/escrow account as mandated under the PA-PG Guidelines, 2020",
      "Separate accounting for merchant settlements",
      "Full compliance with the DPDP Act, 2023 regarding financial data fiduciaries",
    ],
  },
  { type: "h3", text: "7.2 GST Compliance" },
  {
    type: "ul",
    items: [
      "Full GST compliance as a registered taxpayer (JAFRIDA Proprietorship)",
      "Remittance of collected GST to the Government of India",
      "Issuance of GST invoices and credit notes as required",
      "Maintenance of GST records for the period specified under Section 36 of the GST Act (6 years)",
    ],
  },
  { type: "h3", text: "7.3 Income Tax Compliance" },
  {
    type: "p",
    text:
      "All revenue earned by us from Service Fees is subject to Income Tax under the Income Tax Act, 1961. TDS obligations, if applicable to specific transaction types, will be handled in accordance with the Act.",
  },
  { type: "h3", text: "7.4 Anti-Money Laundering (AML)" },
  {
    type: "p",
    text:
      "As a merchant using PayU's PA services, we are covered under PayU's AML/KYC framework compliant with the Prevention of Money Laundering Act, 2002 (PMLA) and the Financial Intelligence Unit-India (FIU-IND) reporting requirements.",
  },
  { type: "h2", text: "Part VIII: Payment Grievance Redressal" },
  {
    type: "p",
    text:
      "Grievance Officer: For payment issues, reach out to our team at 9518410151 or support@waadi.in. Address: Waadi Tax & Insurance Solutions, JAFRIDA Proprietorship. Website: https://waadi.in/",
  },
  {
    type: "p",
    text:
      "Escalation — PayU Nodal Officer: If you are not satisfied with our resolution, you may contact PayU's customer support or Nodal Officer directly at their official support channels.",
  },
  {
    type: "p",
    text:
      "Further Escalation — RBI Ombudsman: For unresolved payment disputes, you may file a complaint with the RBI Integrated Ombudsman Scheme (IOS), 2021 at https://cms.rbi.org.in or call 14448.",
  },
]

const privacyBlocks: Block[] = [
  {
    type: "p",
    text:
      'This Privacy Policy ("Policy") is an electronic document published in accordance with Rule 3(1) of the Information Technology (Intermediaries Guidelines and Digital Media Ethics Code) Rules, 2021, and Section 43A of the Information Technology Act, 2000, and constitutes a legally binding agreement between Waadi Tax & Insurance Solutions (Proprietorship managed by JAFRIDA; GSTIN: 06CBFPJ8826H1ZH; Udyam Number: UDYAM-HR-21-0030370) ("Firm", "we", "us", "our") and any person who accesses, registers upon, or uses our information services and platform.',
  },
  {
    type: "p",
    text:
      "Waadi Tax & Insurance Solutions is a proprietorship firm with its Registered Office at Kherla Nuh, Delhi Road, Nuh, Haryana - 122107, India.",
  },
  {
    type: "p-bold",
    text:
      "This Policy must be read in conjunction with our Terms and Conditions. By accessing or using the App, you expressly consent to the collection, use, storage, and disclosure of your personal data as described herein.",
  },
  { type: "h2", text: "Part I: Legal Framework" },
  { type: "h3", text: "Primary Legislation" },
  {
    type: "ul",
    items: [
      "Digital Personal Data Protection Act, 2023 (DPDPA) — the principal data protection legislation in India, recognizing the right to privacy and prescribing obligations on Data Fiduciaries",
      "Information Technology Act, 2000 (IT Act) — Sections 43A, 66, 66C, 72, and 72A govern data protection, computer offences, breach of confidentiality, and unauthorized disclosure",
      "IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (SPDI Rules) — prescribes obligations on body corporates handling sensitive personal data",
    ],
  },
  { type: "h3", text: "Supporting Regulations" },
  {
    type: "ul",
    items: [
      "IT (Intermediaries Guidelines and Digital Media Ethics Code) Rules, 2021 — Rule 3(1)(b) mandates intermediaries to publish their privacy policy",
      "RBI Master Direction on Digital Payment Security Controls, 2021 — governs security standards for payment data",
      "RBI Circular on Storage of Payment System Data (2018) — mandates storage of all payment data within India",
      "Payment and Settlement Systems Act, 2007 — governs payment systems and security obligations",
      "Google Play Developer Program Policies (2024) — applicable to Apps distributed through Google Play Store",
      "Apple App Store Review Guidelines (Section 5.1 - Privacy) — applicable to Apps distributed through Apple App Store",
    ],
  },
  {
    type: "p",
    text:
      "Constitutional Basis: The right to privacy in India is constitutionally guaranteed as a fundamental right under Article 21 of the Constitution of India, as affirmed by the Supreme Court in Justice K.S. Puttaswamy (Retd.) & Anr. v. Union of India & Ors., (2017) 10 SCC 1. This Policy acknowledges and respects this constitutional right.",
  },
  { type: "h2", text: "Part II: Data Fiduciary Information" },
  {
    type: "p",
    text:
      'Under the DPDPA 2023, Waadi Tax & Insurance Solutions (Proprietorship managed by JAFRIDA) is the "Data Fiduciary" — the entity that determines the purpose and means of processing your personal data.',
  },
  {
    type: "table",
    headers: ["Detail", "Information"],
    rows: [
      ["Entity Name", "Waadi Tax & Insurance Solutions"],
      ["Proprietor", "JAFRIDA"],
      ["GSTIN", "06CBFPJ8826H1ZH"],
      ["Udyam Number", "UDYAM-HR-21-0030370"],
      ["Registered Office", "Kherla Nuh, Delhi Road, Nuh, Haryana - 122107"],
      ["Principal Business", "Information Services, Tax & Insurance Solutions"],
      ["Email", "javeskhan27@gmail.com"],
      ["Grievance Officer Email", "javeskhan27@gmail.com"],
    ],
  },
  { type: "h2", text: "Part III: Personal Data Collection" },
  { type: "h3", text: "3.1 Personal Data You Provide Voluntarily" },
  { type: "p", text: "Identity and Contact Information (Mandatory):" },
  {
    type: "ul",
    items: ["Full legal name and date of birth", "Mobile phone number (used for OTP-based authentication per RBI 2FA mandate)", "Email address"],
  },
  { type: "p", text: "Vehicle and Compliance Information (Mandatory for Service Delivery):" },
  {
    type: "ul",
    items: [
      "Vehicle Registration Number (VRN)",
      "Vehicle category (LMV, HMV, commercial, tourist, etc.)",
      "Vehicle specifications (seating capacity, fuel type, engine capacity)",
      "Chassis number and engine number (for permit applications)",
    ],
  },
  { type: "p", text: "Document Uploads (User-Controlled):" },
  {
    type: "ul",
    items: [
      "Registration Certificate (RC) — issued under Section 41 of the Motor Vehicles Act, 1988",
      "Insurance Policy Certificate — mandatory under Section 146 of the Motor Vehicles Act, 1988",
      "Pollution Under Control (PUC) Certificate — required under Rule 115 of the Central Motor Vehicles Rules, 1989",
      "Fitness Certificate — issued under Section 56 of the Motor Vehicles Act, 1988",
      "National Permit — granted under Section 88 of the Motor Vehicles Act, 1988",
      "Any other compliance document uploaded at your discretion",
    ],
  },
  { type: "p", text: "Payment Reference Information (Transaction Records Only):" },
  { type: "ul", items: ["PayU Transaction ID and Payment ID", "Transaction amount and status", "Order reference numbers"] },
  {
    type: "p-bold",
    text:
      "Important: We do NOT collect, store, or process credit card numbers, debit card numbers, CVV, PINs, net banking credentials, or UPI PINs. All such sensitive financial data is handled exclusively by PayU Payments Private Limited, our PCI-DSS certified Payment Aggregator, under their separate privacy framework.",
  },
  { type: "p", text: "Communication Records: Support queries, messages, and feedback submitted through the App or email." },
  { type: "h3", text: "3.2 Data Collected Automatically" },
  {
    type: "ul",
    items: [
      "Device Identifiers: device model, OS version, app version number",
      "Usage Analytics: feature usage frequency, session duration, navigation patterns (anonymized)",
      "Log Data: server-side access logs including IP address, timestamps, API response codes",
    ],
  },
  {
    type: "p",
    text: "We do NOT collect real-time GPS location data. Any geographic reference is limited to the state/region selected by you for service processing.",
  },
  { type: "h3", text: "3.3 Sensitive Personal Data or Information (SPDI)" },
  {
    type: "p",
    text:
      'Under Rule 3 of the SPDI Rules, 2011, certain categories constitute "sensitive personal data." The following categories, if collected, are treated with heightened protection:',
  },
  { type: "ul", items: ["Biometric data (if collected for future identity verification features)", "Financial information to the extent of transaction records"] },
  { type: "h2", text: "Part IV: Lawful Basis and Purpose of Processing" },
  { type: "p", text: "We process your personal data on the following lawful bases under Section 4 of the DPDPA 2023:" },
  {
    type: "table",
    headers: ["Lawful Basis", "Examples"],
    rows: [
      ["Consent (Section 6)", "Registration, document upload, marketing communications"],
      ["Legitimate Uses (Section 7)", "Service delivery, payment processing, legal compliance"],
      ["Legal Obligation", "Tax records, court orders, government directives"],
      ["Vital Interests", "Emergency situations requiring processing to protect life"],
    ],
  },
  { type: "p", text: "Specific purposes of processing include:" },
  {
    type: "table",
    headers: ["Purpose", "Legal Basis", "Data Categories Used"],
    rows: [
      ["User account creation and authentication", "Consent", "Identity, Contact"],
      ["Processing border tax payments on Parivahan portal", "Legitimate Use", "Vehicle, Identity"],
      ["Processing challan payments on e-Challan portal", "Legitimate Use", "Vehicle, Identity"],
      ["Uploading official VAHAN receipts to your account", "Legitimate Use", "Vehicle, Transaction"],
      ["Document expiry monitoring and alerts", "Consent", "Document Data"],
      ["Payment processing via PayU", "Legitimate Use", "Transaction Reference"],
      ["GST invoice generation (per GST Act, 2017)", "Legal Obligation", "Identity, Transaction"],
      ["Customer support and grievance resolution", "Legitimate Use", "Communication"],
      ["Fraud detection and prevention", "Legitimate Use", "All categories"],
      ["Compliance with court orders or government directions", "Legal Obligation", "As directed"],
      ["Tax record maintenance (8 years, per Income Tax Act, 1961)", "Legal Obligation", "Transaction Records"],
    ],
  },
  { type: "h2", text: "Part V: Data Sharing and Disclosure" },
  { type: "h3", text: "6.1 Government Portals (Essential for Service)" },
  {
    type: "ul",
    items: [
      "Parivahan Sewa (parivahan.gov.in) — vehicle registration data and tax payment submissions are processed on this Ministry of Road Transport portal; this sharing is inherent to and inseparable from our core service",
      "State Transport Department Portals — state-specific tax and permit applications",
    ],
  },
  { type: "h3", text: "6.2 Payment Processor" },
  {
    type: "p",
    text:
      "PayU Payments Private Limited — our sole Payment Aggregator, authorized by RBI, operating under the RBI Master Directions on Payment Aggregators and Payment Gateways (2020). Their data handling is governed by their own Privacy Policy and PCI-DSS certification.",
  },
  { type: "h3", text: "6.3 Cloud Infrastructure" },
  {
    type: "p",
    text:
      "Our servers are hosted on secure VPS infrastructure within India, in compliance with the RBI Circular on Storage of Payment System Data (April 6, 2018), which mandates storage of payment data within Indian territory.",
  },
  { type: "h3", text: "6.4 Legal Authorities" },
  { type: "p", text: "We may disclose personal data to law enforcement or judicial authorities when:" },
  {
    type: "ul",
    items: [
      "Required by a valid court order under Section 91 of the Code of Criminal Procedure, 1973 (CrPC)",
      "Required under Section 69 of the IT Act, 2000 (government direction for interception/monitoring)",
      "Required under Section 67C of the IT Act, 2000 (preservation and retention of data)",
      "Required to comply with any other applicable law",
    ],
  },
  {
    type: "p-bold",
    text:
      "We do NOT sell, rent, licence, or transfer your personal data to any third party for commercial, marketing, or advertising purposes. Any unauthorized disclosure of personal data constitutes a criminal offence under Section 72A of the IT Act, 2000, punishable with imprisonment up to three years and/or a fine up to Rs. 5,00,000.",
  },
  { type: "h2", text: "Part VI: Data Security" },
  {
    type: "p",
    text:
      'As mandated by Section 43A of the IT Act, 2000 read with Rule 8 of the SPDI Rules, 2011, we implement and maintain "reasonable security practices and procedures" comprising an internationally accepted information security programme, including:',
  },
  {
    type: "ul",
    items: [
      "Encryption in Transit: all data exchanged between your device and our servers is encrypted using TLS 1.2/1.3 protocols",
      "Encryption at Rest: database encryption for all stored personal data",
      "Access Controls: role-based access control (RBAC) with principle of least privilege; administrative access protected by multi-factor authentication (MFA)",
      "Authentication: JWT-based token authentication with OTP verification for all user login events",
      "Secure Storage: document files stored in sandboxed Nginx server environments with strict access controls",
      "Data Minimization: we collect only what is strictly necessary for service delivery",
      "Retention Controls: automated deletion of receipts after service expiry + 2-day buffer period",
      "Audit Logs: server-side access logs maintained for security audit purposes",
    ],
  },
  {
    type: "p",
    text:
      "Legal Note: In the event of a data breach, we are obligated under the DPDPA 2023 to notify the Data Protection Board of India and affected Data Principals in the prescribed manner.",
  },
  { type: "h2", text: "Part VII: Data Retention" },
  {
    type: "table",
    headers: ["Data Category", "Retention Period", "Legal Basis"],
    rows: [
      ["Account and identity data", "Duration of account + 90 days post deletion request", "DPDPA 2023"],
      ["Payment transaction records", "Minimum 8 years", "Income Tax Act, 1961; GST Act, 2017"],
      ["Vehicle compliance documents", "Until document expiry + 2 days", "Service requirement"],
      ["Communication/support records", "3 years", "Limitation Act, 1963"],
      ["Server access logs", "90 days", "IT (Intermediary) Rules, 2021"],
      ["GST invoices and credit notes", "6 years", "GST Act, 2017 (Section 36)"],
    ],
  },
  {
    type: "p",
    text:
      "Upon expiry of the applicable retention period, personal data will be permanently deleted or anonymized so that it can no longer identify you.",
  },
  { type: "h2", text: "Part VIII: Your Rights as Data Principal" },
  { type: "h3", text: "9.1 Right to Access Information (Section 11)" },
  { type: "p", text: "You have the right to obtain from us confirmation of whether your personal data is being processed, a summary of processing activities, and the identities of all Data Fiduciaries and Data Processors with whom your data has been shared." },
  { type: "h3", text: "9.2 Right to Correction and Erasure (Section 12)" },
  {
    type: "ul",
    items: [
      "You may request correction of inaccurate or misleading personal data",
      "You may request completion of incomplete personal data",
      "You may request erasure of personal data that is no longer necessary for the purpose for which it was collected (subject to legal retention requirements)",
    ],
  },
  { type: "h3", text: "9.3 Right to Grievance Redressal (Section 13)" },
  { type: "p", text: "You have the right to have your grievances addressed expeditiously and effectively by our Grievance Officer." },
  { type: "h3", text: "9.4 Right to Nominate (Section 14)" },
  { type: "p", text: "You may nominate any individual to exercise your rights in the event of your death or incapacity." },
  { type: "h3", text: "9.5 Right to Withdraw Consent" },
  {
    type: "p",
    text:
      "You may withdraw consent for processing at any time. However, withdrawal shall not affect the lawfulness of processing based on consent before its withdrawal, and may result in inability to access certain Services.",
  },
  {
    type: "p",
    text: "To exercise any of the above rights, email us at javeskhan27@gmail.com with your registered mobile number and a description of your request.",
  },
  { type: "h2", text: "Part IX: Cookies, Children, and Changes" },
  { type: "h3", text: "10. Cookies" },
  {
    type: "p",
    text:
      "The Waadi Tax & Insurance Solutions platform may use cookies to improve user experience, verify MSME/GST status, and provide informational updates. We implement robust technical measures to protect all such data.",
  },
  { type: "h3", text: "11. Children's Privacy (Section 9, DPDPA 2023)" },
  {
    type: "p",
    text:
      "Waadi App is not directed at children under 18 years of age. Section 9 of the DPDPA 2023 imposes additional obligations on Data Fiduciaries processing children's personal data, including obtaining parental consent. We do not knowingly collect personal data from anyone under 18. If we discover that we have collected data from a child without verifiable parental consent, we will delete it promptly.",
  },
  { type: "h3", text: "12. Changes to This Policy" },
  {
    type: "p",
    text:
      "We reserve the right to modify this Policy. Material changes will be communicated through an in-App notification at least 15 days before taking effect. Continued use of the App after the effective date of the revised Policy constitutes your acceptance thereof, as recognized under the Indian Contract Act, 1872 (Section 7).",
  },
  { type: "h2", text: "Part X: Grievance Redressal" },
  {
    type: "p",
    text:
      "In accordance with Rule 5(9) of the SPDI Rules, 2011, Section 13 of the DPDPA 2023, and Rule 3(2) of the IT (Intermediary) Rules, 2021, we have designated a Grievance Officer: Jafrida, javeskhan27@gmail.com. Acknowledgement within 24 hours of receipt; resolution within 30 (thirty) days of receipt.",
  },
  { type: "p", text: "If dissatisfied with our resolution, you may approach:" },
  {
    type: "ol",
    items: [
      "The Data Protection Board of India — established under Section 18 of the DPDPA 2023",
      "The Adjudicating Officer under Section 46 of the IT Act, 2000",
      "The appropriate Consumer Forum under the Consumer Protection Act, 2019",
    ],
  },
  { type: "h3", text: "14. Governing Law and Jurisdiction" },
  {
    type: "p",
    text:
      "This Policy is governed by the laws of the Republic of India. Subject to the arbitration clause in our Terms of Service, any dispute arising under this Policy shall be subject to the exclusive jurisdiction of courts at Nuh, Haryana, India.",
  },
]

const refundBlocks: Block[] = [
  {
    type: "p",
    text:
      'This Refund and Cancellation Policy ("Policy") governs the services provided by Waadi Tax & Insurance Solutions, a proprietorship managed by JAFRIDA (GSTIN: 06CBFPJ8826H1ZH), having its registered office at Kherla Nuh, Delhi Road, Haryana, 122107, India. This Policy is designed to be transparent and compliant with the Consumer Protection (E-Commerce) Rules, 2020.',
  },
  { type: "h2", text: "2. Cancellation Terms" },
  {
    type: "p",
    text:
      "Users may request a cancellation of a service booking within 24 hours of the transaction, provided that no document processing or professional consultation has commenced. Once the service has been initiated, cancellation is no longer permissible.",
  },
  { type: "h2", text: "3. Refund Eligibility" },
  { type: "h3", text: "3.1 Non-Refundable Services" },
  { type: "p", text: "The following services are strictly non-refundable once initiated or delivered:" },
  {
    type: "ul",
    items: [
      "Professional Tax Consultations",
      "Completed GST Filing",
      "Government Tax Paid",
      "Insurance Solution facilitation where processing has begun",
    ],
  },
  { type: "h2", text: "4. Refund Process and Timelines" },
  {
    type: "p",
    text:
      "Approved refunds will be credited to the original payment source within 7-10 business days. Users must provide their transaction reference to initiate the request.",
  },
  { type: "h2", text: "5. Contact and Grievance Redressal" },
  { type: "p", text: "For any refund queries or grievances, please contact our Grievance Officer:" },
  {
    type: "ul",
    items: [
      "Grievance Officer: Jafrida",
      "Email: javeskhan27@gmail.com",
      "Address: Kherla Nuh, Delhi Road, Haryana, 122107",
    ],
  },
]

const policies: PolicyData[] = [
  {
    key: "terms",
    label: "Terms & Conditions",
    icon: FileText,
    title: "Terms and Conditions of Service",
    effectiveDate: "May 16, 2026",
    lastUpdated: "July 13, 2026",
    version: "4.0",
    blocks: termsBlocks,
  },
  {
    key: "payment",
    label: "Payment Policy",
    icon: CreditCard,
    title: "Payment Policy",
    effectiveDate: "July 30, 2026",
    lastUpdated: "July 30, 2026",
    version: "1.0",
    blocks: paymentBlocks,
  },
  {
    key: "privacy",
    label: "Privacy Policy",
    icon: ShieldCheck,
    title: "Privacy Policy",
    effectiveDate: "May 16, 2026",
    lastUpdated: "July 29, 2026",
    version: "2.1",
    blocks: privacyBlocks,
  },
  {
    key: "refund",
    label: "Refund & Cancellation",
    icon: RotateCcw,
    title: "Refund and Cancellation Policy",
    effectiveDate: "July 30, 2026",
    lastUpdated: "July 30, 2026",
    blocks: refundBlocks,
  },
]

interface LegalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function LegalPage({ open, onOpenChange }: LegalProps) {
  const [activeKey, setActiveKey] = useState<PolicyKey>("terms");
  const active = policies.find((p) => p.key === activeKey) ?? policies[0];

  React.useEffect(() => {
    if (open) {
      setActiveKey("terms");
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Don't render anything until opened
  if (!open) return null;


  return (
    <div className="min-h-screen bg-white flex flex-col">
    

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
        >
          {/* Semi-transparent backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />

          {/* Modal panel, centered */}
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Sticky modal header: title, close icon, tab buttons */}
            <div className="flex-shrink-0 border-b bg-white px-6 pt-6 pb-4 relative">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-sm p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                <X className="h-5 w-5" />
              </button>

              <h1 id="legal-modal-title" className="text-2xl font-bold text-gray-900 pr-8">
                Legal Center
              </h1>
              <p className="text-sm text-gray-500 mt-1">Waadi Tax & Insurance Solutions</p>

              {/* Tab buttons — single responsive row */}
              <div
                role="tablist"
                aria-label="Legal document selection"
                // className="flex flex-wrap gap-2 mt-4"
            className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4"
              >
                {policies.map((policy) => {
                  const Icon = policy.icon
                  const isActive = policy.key === activeKey
                  return (
                    <Button
                      key={policy.key}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${policy.key}`}
                      id={`tab-${policy.key}`}
                      variant={isActive ? "default" : "outline"}
                      onClick={() => setActiveKey(policy.key)}
                      className={`gap-2 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                        isActive
                          ? "shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {/* <Icon className="h-4 w-4" /> */}
                      {policy.label}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Only this section scrolls */}
            <div className="flex-1 overflow-y-auto">
              <Card className="border-0 shadow-none rounded-none">
                <CardContent className="p-0">
                  <div
                    key={active.key}
                    role="tabpanel"
                    id={`panel-${active.key}`}
                    aria-labelledby={`tab-${active.key}`}
                    className="animate-in fade-in duration-300"
                  >
                    <div className="px-6 pt-6 pb-4 border-b">
                      <h2 className="text-2xl font-bold text-gray-900">{active.title}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Effective Date: {active.effectiveDate} &nbsp;·&nbsp; Last Updated: {active.lastUpdated}
                        {active.version ? <>&nbsp;·&nbsp; Version: {active.version}</> : null}
                      </p>
                    </div>
                    <div className="px-6 py-6 text-sm leading-relaxed">
                      {active.blocks.map((block, idx) => renderBlock(block, idx))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}