#!/bin/bash

echo "🔄 Starting state reordering process..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if the script exists
if [ ! -f "scripts/add-missing-states.js" ]; then
    echo "❌ Script not found. Please make sure you're in the backend directory."
    exit 1
fi

# Set MongoDB connection string (update this with your actual connection string)
export MONGODB_URI="mongodb://localhost:27017/wadi_cab"

echo "📡 Using MongoDB URI: $MONGODB_URI"
echo ""

# Run the script
node scripts/add-missing-states.js

echo ""
echo "✅ State reordering completed!"
echo "📱 States will now appear in the correct order on the frontend."






