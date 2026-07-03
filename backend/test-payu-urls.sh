#!/bin/bash
echo "🔧 Testing PayU Callback URLs..."
echo ""

# Test success URL
echo "Testing SUCCESS URL..."
curl -X POST  https://api.waadi.in/api/v1/payment/success \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "status=success&txnid=TEST123&amount=100&udf1=test_booking_id&test=true&mihpayid=12345" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "Testing FAILURE URL..."
curl -X POST  https://api.waadi.in/api/v1/payment/failure \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "status=failure&txnid=TEST123&amount=100&udf1=test_booking_id&test=true&error_Message=Test+failure" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ If both URLs return HTTP 200 with JSON responses, your URLs are working!"
echo "❌ If you get connection errors, PayU cannot reach your server."
echo ""
echo "Next steps:"
echo "1. Add the environment variables to your .env file"
echo "2. Restart your server"
echo "3. Test with real PayU payments"
