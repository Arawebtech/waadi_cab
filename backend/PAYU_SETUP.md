# PayU Payment Gateway Setup Guide

## 🔧 Environment Configuration

To fix the PayU success URL issue, you need to set up the correct environment variables in your `.env` file:

```env
# PayU Payment Gateway Configuration
PAYU_KEY=7SlgzK
PAYU_SALT=jEPdbPrStSB1iXVlsQoCoPZpkQudYFIg

# IMPORTANT: PayU Callback URLs (Must be accessible from PayU servers)
PAYU_SUCCESS_URL= http://localhost:4001/api/v1/payment/success
PAYU_FAILURE_URL= http://localhost:4001/api/v1/payment/failure

# Frontend URL (optional - for user redirects)
FRONTEND_URL=https://book.waadi.in
```

## 🚨 Critical Requirements for Success URL to Work

### 1. **Tunnel URL Must Be Public**
Your tunnel URL `https://bfmwpsbs-4001.inc1.devtunnels.ms` must be:
- ✅ Publicly accessible from the internet
- ✅ HTTPS enabled (PayU requires HTTPS for callbacks)
- ✅ Not blocked by firewall or authentication

### 2. **PayU Merchant Configuration**
In your PayU merchant dashboard, ensure:
- Success URL: ` http://localhost:4001/api/v1/payment/success`
- Failure URL: ` http://localhost:4001/api/v1/payment/failure`
- Both URLs are whitelisted in your PayU account

### 3. **Test Your Callback URLs**
Before testing payments, verify your URLs work:

```bash
# Test if your success endpoint is accessible
curl -X POST  http://localhost:4001/api/v1/payment/success \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "status=success&txnid=test123"

# Test if your failure endpoint is accessible  
curl -X POST  http://localhost:4001/api/v1/payment/failure \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "status=failure&txnid=test123"
```

## 🔄 What Changed

I've updated your booking controller to:
- ✅ Use the centralized PayU service instead of manual implementation
- ✅ Proper hash generation according to PayU standards
- ✅ Environment variable-based URL configuration
- ✅ Better error handling and logging

## 🧪 Testing Steps

1. **Update your `.env` file** with the URLs above
2. **Restart your server** to load new environment variables
3. **Create a booking** and test the payment flow
4. **Check server logs** for PayU transaction logs

## 🐛 Troubleshooting

### If you still see PayU's test response page:

1. **Check PayU Merchant Settings**: Ensure your merchant account has the correct callback URLs configured
2. **Verify URL Accessibility**: Test if PayU can reach your tunnel URL
3. **Check Server Logs**: Look for incoming callback requests in your server logs
4. **Test Different Tunnel**: Try ngrok if DevTunnels has issues

### Example with ngrok:
```bash
# Start ngrok tunnel
ngrok http 5000

# Use the HTTPS URL in your .env
PAYU_SUCCESS_URL=https://abc123.ngrok.io/api/v1/payment/success
PAYU_FAILURE_URL=https://abc123.ngrok.io/api/v1/payment/failure
```

## 📋 Environment Variables Checklist

- [ ] `PAYU_KEY` - Your PayU merchant key
- [ ] `PAYU_SALT` - Your PayU salt key  
- [ ] `PAYU_SUCCESS_URL` - Your public tunnel URL + `/api/v1/payment/success`
- [ ] `PAYU_FAILURE_URL` - Your public tunnel URL + `/api/v1/payment/failure`
- [ ] Server restarted after changing environment variables
- [ ] URLs tested with curl or browser
- [ ] PayU merchant dashboard configured with same URLs

## ✅ Final Verification Steps

### 1. Test URL Accessibility
```bash
./test-payu-urls.sh
```
**Expected Result:** Both URLs should return HTTP 200 with JSON responses

### 2. Check Server Health
```bash
curl https://bfmwpsbs-4001.inc1.devtunnels.ms/health
```
**Expected Result:**
```json
{
  "success": true,
  "message": "Server is running",
  "payuConfig": {
    "isConfigured": true,
    "hasCallbackUrls": true
  }
}
```

### 3. Test PayU Configuration
```bash
curl http://192.168.1.8:5000/api/v1/payment/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```
**Expected Result:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "configuration": {
      "successUrl": " http://localhost:4001/api/v1/payment/success",
      "failureUrl": " http://localhost:4001/api/v1/payment/failure"
    }
  }
}
```

### 4. Create Test Booking
- Create a booking via API
- Check the response includes payment data
- Use the payment URL and data to complete payment
- Monitor server logs for callback messages

## 🎉 Success Indicators

When everything is working correctly, you should see:
- ✅ Test scripts return HTTP 200
- ✅ Health check shows PayU configured
- ✅ Real payments redirect to your success/failure URLs
- ✅ Server logs show `🎉 PayU SUCCESS CALLBACK RECEIVED!` messages
- ✅ Booking status updates to 'paid' automatically 