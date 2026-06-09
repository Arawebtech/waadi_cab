# PayU Environment Variables Setup

## Required Environment Variables

Add the following variables to your `.env` file:

```env
# PayU Payment Gateway Configuration
PAYU_MERCHANT_KEY=your_merchant_key
PAYU_MERCHANT_SALT=your_merchant_salt
PAYU_ENVIRONMENT=production
PAYU_VERIFY_URL=https://info.payu.in/merchant/postservice.php?form=2
PAYU_SUCCESS_URL=http://your-domain.com:4001/api/v1/payment/success
PAYU_FAILURE_URL=http://your-domain.com:4001/api/v1/payment/failure
```

## Variable Descriptions

- **PAYU_MERCHANT_KEY**: Your PayU merchant key (provided by PayU)
- **PAYU_MERCHANT_SALT**: Your PayU merchant salt (provided by PayU) - Keep this secret!
- **PAYU_ENVIRONMENT**: Set to `production` for testing, `production` for live
- **PAYU_VERIFY_URL**: PayU API URL for payment verification
- **PAYU_SUCCESS_URL**: Callback URL for successful payments
- **PAYU_FAILURE_URL**: Callback URL for failed payments

## Security Notes

1. **Never expose PAYU_MERCHANT_SALT** in frontend code
2. Use different keys for production and production
3. Ensure callback URLs are publicly accessible
4. Use HTTPS for production callback URLs

## Testing

1. Start with production environment
2. Use PayU test cards for testing
3. Monitor server logs for payment transactions
4. Test with the `/api/v1/payment/test` endpoint

## Production Checklist

- [ ] Update PAYU_ENVIRONMENT to `production`
- [ ] Use production merchant key and salt
- [ ] Update callback URLs to use HTTPS
- [ ] Test with real payment methods
- [ ] Monitor payment logs and analytics