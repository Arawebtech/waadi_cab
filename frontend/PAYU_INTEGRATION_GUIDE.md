# PayU Payment Gateway Integration Guide

## Overview
This guide explains how to integrate PayU payment gateway with your Capacitor-based mobile app for border tax payments.

## Files Created

### 1. PayU Service (`lib/payu.ts`)
- Core PayU integration service
- Handles payment initiation for both web and mobile
- Includes payment verification
- Supports Capacitor in-app browser

### 2. Payment Component (`components/payment-integration.tsx`)
- Reusable payment component
- Shows payment summary
- Handles payment flow
- Integrated with toast notifications

### 3. Payment Success Page (`app/payment/success/page.tsx`)
- Handles successful payment redirects
- Verifies payment with backend
- Shows booking confirmation
- Provides download/share options

### 4. Payment Failure Page (`app/payment/failure/page.tsx`)
- Handles failed payment redirects
- Shows error details
- Provides retry options
- Contact support functionality

## Setup Instructions

### 1. Environment Variables
Create a `.env.local` file with:
```env
NEXT_PUBLIC_PAYU_MERCHANT_KEY=your_payu_merchant_key
NEXT_PUBLIC_PAYU_MERCHANT_SALT=your_payu_merchant_salt
NEXT_PUBLIC_PAYU_ENVIRONMENT=production
NEXT_PUBLIC_APP_URL=http://localhost
```

### 2. PayU Account Setup
1. Sign up at PayU (https://payu.in/)
2. Get your Merchant Key and Salt
3. Configure webhook URLs:
   - Success URL: `{your_domain}/payment/success`
   - Failure URL: `{your_domain}/payment/failure`

### 3. Integration with Border Tax Form

Add to your border-tax page:

```tsx
import PaymentIntegration from '@/components/payment-integration'

// In your component:
const [showPayment, setShowPayment] = useState(false)

// After form validation:
if (showPayment) {
  return (
    <PaymentIntegration
      amount={totalAmount}
      bookingData={{
        vehicleNumber: formData.vehicleNumber,
        visitingStateName: formData.visitingStateName,
        planType: formData.planType,
        fromDate: formData.fromDate,
        uptoDate: formData.uptoDate,
        whatsappNumber: formData.whatsappNumber
      }}
      userInfo={{
        firstName: "User", // Get from auth or form
        lastName: "Name",
        email: "user@example.com",
        phone: formData.whatsappNumber
      }}
      onPaymentSuccess={(response) => {
        // Handle success
        router.push(\`/payment/success?txnid=\${response.txnId}\`)
      }}
      onPaymentFailure={(error) => {
        // Handle failure
        console.error('Payment failed:', error)
      }}
    />
  )
}
```

### 4. Mobile App Configuration

The integration uses `@capacitor/browser` for in-app browser payments:

```typescript
// Automatically handles:
// - Web: Opens PayU in new tab/window
// - Mobile: Opens PayU in in-app browser
// - Redirects back to app after payment
```

### 5. Backend Integration Required

Your backend needs these endpoints:

#### POST `/api/v1/payment/generate-hash`
```json
{
  "hashString": "key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt"
}
```
Response:
```json
{
  "success": true,
  "hash": "generated_hash_here"
}
```

#### POST `/api/v1/payment/verify`
```json
{
  "txnId": "transaction_id",
  "payuMoneyId": "payu_payment_id",
  "status": "success|failure",
  "bookingData": {
    "vehicleNumber": "...",
    "visitingStateName": "...",
    // ... other booking data
  }
}
```

## Payment Flow

1. **User fills border tax form**
2. **Clicks "Proceed to Payment"**
3. **PaymentIntegration component loads**
4. **User clicks "Pay Securely"**
5. **App generates transaction ID**
6. **Backend generates payment hash**
7. **PayU payment page opens** (in-app browser for mobile)
8. **User completes payment**
9. **PayU redirects to success/failure URL**
10. **App verifies payment with backend**
11. **Shows confirmation or error**

## Security Features

- **Hash generation on backend** (never expose salt on frontend)
- **Payment verification** through backend
- **Transaction tracking** with unique IDs
- **Secure redirects** with validation
- **Error handling** for all failure scenarios

## Testing

### production Mode
Use PayU test credentials:
- **Test Cards**: Available in PayU documentation
- **Test UPI**: Use test UPI IDs
- **Test Net Banking**: Use test bank credentials

### Production Checklist
- [ ] Update environment to production
- [ ] Configure production webhook URLs
- [ ] Test all payment methods
- [ ] Verify SSL certificates
- [ ] Test mobile app flows
- [ ] Test payment verification

## Troubleshooting

### Common Issues
1. **Hash mismatch**: Check salt and parameter order
2. **Redirect issues**: Verify success/failure URLs
3. **Mobile browser issues**: Check Capacitor browser plugin
4. **CORS errors**: Configure backend CORS properly

### Debug Tips
- Check browser console for errors
- Verify all PayU parameters
- Test webhook endpoints
- Monitor payment logs

## Support
- PayU Documentation: https://docs.payu.in/
- Capacitor Browser: https://capacitorjs.com/docs/apis/browser
- Support contact: Include transaction ID in support requests