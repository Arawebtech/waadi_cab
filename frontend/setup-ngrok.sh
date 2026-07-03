#!/bin/bash

echo "🚀 Setting up ngrok for local PayU development..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   Visit: https://ngrok.com/download"
    echo "   Or use: brew install ngrok (on macOS)"
    echo ""
    exit 1
fi

echo "✅ ngrok is installed"
echo ""

# Check if port 3000 is running
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Frontend is not running on port 3000"
    echo "   Please start your frontend first: npm run dev"
    echo ""
    exit 1
fi

echo "✅ Frontend is running on port 3000"
echo ""

# Start ngrok
echo "🌐 Starting ngrok tunnel..."
echo "   This will create a public URL for your localhost:3000"
echo ""

ngrok http 3000

echo ""
echo "📝 Instructions:"
echo "1. Copy the ngrok URL (e.g., https://abc123.ngrok.io)"
echo "2. Update your PayU merchant panel with these callback URLs:"
echo "   Success URL: https://abc123.ngrok.io/payment/success"
echo "   Failure URL: https://abc123.ngrok.io/payment/failure"
echo "3. Or update the code to use the ngrok URL dynamically"
echo ""
echo "⚠️  Note: ngrok URLs change each time you restart the tunnel"
echo "   For production, use your actual domain" 