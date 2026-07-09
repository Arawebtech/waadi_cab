#!/bin/bash

echo "🚀 Starting Wadi Cab Services"
echo "============================="

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Start Backend Server
echo "📡 Starting Backend Server..."
cd /Users/coladco/Desktop/final_waadi/wadi_cab/backend

if check_port 4001; then
    echo "✅ Backend server already running on port 4001"
else
    echo "🔄 Starting backend server..."
    nohup npm start > backend.log 2>&1 &
    echo "✅ Backend server started (PID: $!)"
    echo "   Logs: /Users/coladco/Desktop/final_waadi/wadi_cab/backend/backend.log"
fi

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s -f https://api.waadi.in/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 2
done

# Start Admin Dashboard
echo ""
echo "🖥️  Starting Admin Dashboard..."
cd /Users/coladco/Desktop/final_waadi/wadi_cab/backend/admin-dashboard

if check_port 3000; then
    echo "✅ Admin dashboard already running on port 3000"
else
    echo "🔄 Starting admin dashboard..."
    nohup npm start > dashboard.log 2>&1 &
    echo "✅ Admin dashboard started (PID: $!)"
    echo "   Logs: /Users/coladco/Desktop/final_waadi/wadi_cab/backend/admin-dashboard/dashboard.log"
fi

# Wait for dashboard to be ready
echo "⏳ Waiting for dashboard to be ready..."
for i in {1..30}; do
    if curl -s -f https://book.waadi.in > /dev/null 2>&1; then
        echo "✅ Dashboard is ready!"
        break
    fi
    echo "   Attempt $i/30..."
    sleep 2
done

echo ""
echo "🎉 All services started successfully!"
echo "====================================="
echo "Backend API: https://api.waadi.in"
echo "Admin Dashboard: https://book.waadi.in"
echo ""
echo "To check service status, run: ./check-services.sh"
echo "To view logs:"
echo "  Backend: tail -f /Users/coladco/Desktop/final_waadi/wadi_cab/backend/backend.log"
echo "  Dashboard: tail -f /Users/coladco/Desktop/final_waadi/wadi_cab/backend/admin-dashboard/dashboard.log"
