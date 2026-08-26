#!/bin/bash

# Wadi Cab Backend Deployment Script
# Usage: ./deploy.sh [production|staging]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment is provided
if [ -z "$1" ]; then
    print_error "Please specify environment: production or staging"
    echo "Usage: ./deploy.sh [production|staging]"
    exit 1
fi

ENVIRONMENT=$1

print_status "Starting deployment for environment: $ENVIRONMENT"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Check if logs directory exists
if [ ! -d "logs" ]; then
    print_status "Creating logs directory..."
    mkdir -p logs
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please create one with your environment variables."
    exit 1
fi

# Stop existing PM2 processes
print_status "Stopping existing PM2 processes..."
pm2 stop wadi-cab-backend 2>/dev/null || true
pm2 delete wadi-cab-backend 2>/dev/null || true

# Install dependencies
print_status "Installing dependencies..."
npm install

# Run database migrations/seeds if needed
if [ -f "scripts/seed.js" ]; then
    print_status "Running database seed..."
    node scripts/seed.js
fi

# Start the application with PM2
print_status "Starting application with PM2..."
if [ "$ENVIRONMENT" = "production" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env development
fi

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup

print_success "Deployment completed successfully!"
print_status "If App Version ZIP uploads return HTTP 413, run on the API server:"
print_status "  sudo bash scripts/apply-nginx-upload-limit.sh"
print_status "Application is now running with PM2"
print_status "Use 'pm2 status' to check application status"
print_status "Use 'pm2 logs wadi-cab-backend' to view logs"
print_status "Use 'pm2 monit' to monitor the application"

# Display application status
echo ""
print_status "Current PM2 status:"
pm2 status 