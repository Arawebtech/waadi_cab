#!/bin/bash

echo "🔍 Checking Wadi Cab Services Status"
echo "====================================="

# Check Backend Server
echo "📡 Backend Server (Port 4001):"
if curl -s -f https://api.waadi.in/health > /dev/null; then
    echo "✅ Backend server is running and healthy"
    echo "   Response time: $(curl -s -w "%{time_total}s" https://api.waadi.in/health -o /dev/null)"
else
    echo "❌ Backend server is not responding"
fi

# Check Admin Dashboard
echo ""
echo "🖥️  Admin Dashboard (Port 3000):"
if curl -s -f https://book.waadi.in > /dev/null; then
    echo "✅ Admin dashboard is running"
    echo "   Response time: $(curl -s -w "%{time_total}s" https://book.waadi.in -o /dev/null)"
else
    echo "❌ Admin dashboard is not responding"
fi

# Check API Endpoint
echo ""
echo "🔗 API Dashboard Endpoint:"
if curl -s -f https://api.waadi.in/api/v1/admin/dashboard > /dev/null; then
    echo "✅ Dashboard API endpoint is working"
    echo "   Response time: $(curl -s -w "%{time_total}s" https://api.waadi.in/api/v1/admin/dashboard -o /dev/null)"
else
    echo "❌ Dashboard API endpoint is not responding"
fi

# Check Environment Configuration
echo ""
echo "⚙️  Environment Configuration:"
if [ -f "/Users/coladco/Desktop/final_waadi/wadi_cab/backend/admin-dashboard/.env" ]; then
    echo "✅ .env file exists"
    echo "   API URL: $(grep REACT_APP_API_URL /Users/coladco/Desktop/final_waadi/wadi_cab/backend/admin-dashboard/.env 2>/dev/null || echo 'Not set')"
else
    echo "❌ .env file not found"
fi

echo ""
echo "🚀 Services Status Summary:"
echo "=========================="
echo "Backend: $(curl -s -f https://api.waadi.in/health > /dev/null && echo "✅ Running" || echo "❌ Not Running")"
echo "Dashboard: $(curl -s -f https://book.waadi.in > /dev/null && echo "✅ Running" || echo "❌ Not Running")"
echo "API: $(curl -s -f https://api.waadi.in/api/v1/admin/dashboard > /dev/null && echo "✅ Working" || echo "❌ Not Working")"
