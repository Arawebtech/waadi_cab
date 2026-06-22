# PayU Integration Troubleshooting Guide

## Common Issues and Solutions

### 1. "Invalid URL" Error

**Problem**: Getting `TypeError: Invalid URL` error during payment verification.

**Causes**:
- `PAYU_VERIFY_URL` environment variable is not set
- `PAYU_VERIFY_URL` contains invalid URL format
- Environment variable is empty or contains only whitespace

**Solutions**:
1. Check your `.env` file:
   ```bash
   PAYU_VERIFY_URL=https://info.payu.in/merchant/postservice.php?form=2
   ```

2. Ensure the URL is valid:
   - Must start with `http://` or `https://`
   - Must have a valid hostname
   - No extra spaces or special characters

3. Test the URL manually:
   ```bash
   curl -X POST "https://info.payu.in/merchant/postservice.php?form=2" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "key=YOUR_KEY&command=verify_payment&var1=TEST&hash=TEST_HASH"
   ```

### 2. Hash Calculation Errors

**Problem**: PayU reports "incorrectly calculated hash parameter".

**Causes**:
- Wrong merchant salt being used
- Incorrect hash string format
- Missing or extra parameters

**Solutions**:
1. Verify environment variables:
   ```bash
   PAYU_MERCHANT_KEY=your_merchant_key
   PAYU_MERCHANT_SALT=your_merchant_salt
   ```

2. Check hash string format:
   ```
   key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|merchantSalt
   ```

3. Use the test endpoint to verify:
   ```bash
   POST /api/v1/payment/test-hash
   ```

### 3. Payment Status Not Updating

**Problem**: Payment shows as pending even after successful PayU response.

**Causes**:
- Payment verification failing
- Database transaction issues
- Missing payment status updates

**Solutions**:
1. Check server logs for verification errors
2. Verify PayU callback URLs are correct
3. Ensure database models are properly linked

### 4. Environment Variable Issues

**Problem**: Configuration not loading properly.

**Solutions**:
1. Restart the server after changing `.env`
2. Check variable names match exactly:
   ```bash
   # Required variables
   PAYU_MERCHANT_KEY=your_key
   PAYU_MERCHANT_SALT=your_salt
   PAYU_ENVIRONMENT=production  # or production
   PAYU_VERIFY_URL=https://info.payu.in/merchant/postservice.php?form=2
   
   # Optional variables
   PAYU_SUCCESS_URL=http://yourdomain.com/api/v1/payment/success
   PAYU_FAILURE_URL=http://yourdomain.com/api/v1/payment/failure
   ```

### 5. Testing the Integration

**Step 1**: Test configuration
```bash
GET /api/v1/payment/test
```

**Step 2**: Test hash generation
```bash
POST /api/v1/payment/test-hash
{
  "txnid": "TEST123",
  "amount": "100.00",
  "productinfo": "Border Tax - Car",
  "firstname": "John Doe",
  "email": "john@example.com"
}
```

**Step 3**: Test payment verification
```bash
POST /api/v1/payment/verify
{
  "txnId": "TEST_TXN_123",
  "payuMoneyId": "PAYU_123",
  "status": "success",
  "amount": "100.00",
  "bookingData": {
    "visitingStateId": "state_id_here",
    "vehicleNumber": "TEST123",
    "vehicleTypeName": "Car",
    "whatsappNumber": "+919876543210",
    "entryBorderName": "Test Border",
    "planType": "Daily",
    "fromDate": "2024-01-01",
    "uptoDate": "2024-01-31"
  }
}
```

### 6. Debug Mode

Enable detailed logging by setting:
```bash
NODE_ENV=development
DEBUG=payu:*
```

### 7. Common PayU Response Statuses

- `success` - Payment completed successfully
- `failure` - Payment failed
- `pending` - Payment is being processed
- `cancelled` - Payment was cancelled by user

### 8. Network Issues

**Problem**: Timeout or connection errors.

**Solutions**:
1. Check firewall settings
2. Verify PayU endpoints are accessible
3. Increase timeout values if needed
4. Check network connectivity

### 9. SSL/HTTPS Issues

**Problem**: SSL certificate errors in production.

**Solutions**:
1. Ensure `PAYU_VERIFY_URL` uses `https://`
2. Check SSL certificate validity
3. Update Node.js to latest LTS version

### 10. Rate Limiting

**Problem**: Too many requests to PayU API.

**Solutions**:
1. Implement request throttling
2. Cache verification results
3. Use webhooks instead of polling

## Getting Help

1. Check server logs for detailed error messages
2. Use the test endpoints to isolate issues
3. Verify environment variables are set correctly
4. Test with PayU production environment first
5. Contact PayU support for API-specific issues

## Useful Commands

```bash
# Check server health
curl https://api.waadi.in/health

# Test PayU config
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.waadi.in/api/v1/payment/test

# View recent logs
tail -f logs/app.log | grep -i payu
``` 