# Wadi Cab Services Troubleshooting Guide

## Quick Status Check
Run the service status checker:
```bash
./check-services.sh
```

## Service URLs
- **Backend API**: https://api.waadi.in
- **Admin Dashboard**: https://book.waadi.in
- **Health Check**: https://api.waadi.in/health

## Common Issues & Solutions

### 1. API Timeout Errors
**Symptoms**: `timeout of 10000ms exceeded` or similar timeout errors in the dashboard

**Solutions**:
1. Check if backend is running: `curl https://api.waadi.in/health`
2. Verify environment configuration: Check `.env` file in admin-dashboard directory
3. Restart services: `./start-services.sh`

**Fixed Issues**:
- ✅ Created `.env` file with correct API URL
- ✅ Increased timeout from 10s to 30s in `api.ts`
- ✅ Added proper environment configuration

### 2. Services Not Starting
**Symptoms**: Dashboard or backend not accessible

**Solutions**:
1. Check if ports are free: `lsof -i :3000` and `lsof -i :4001`
2. Kill existing processes: `pkill -f "react-scripts"` or `pkill -f "node server.js"`
3. Start services: `./start-services.sh`

### 3. Environment Configuration
**File**: `/Users/coladco/Desktop/final_waadi/wadi_cab/backend/admin-dashboard/.env`
```env
REACT_APP_API_URL=https://api.waadi.in/api/v1
```

### 4. Service Management Scripts

#### Start All Services
```bash
./start-services.sh
```

#### Check Service Status
```bash
./check-services.sh
```

#### View Logs
```bash
# Backend logs
tail -f /Users/coladco/Desktop/final_waadi/wadi_cab/backend/backend.log

# Dashboard logs  
tail -f /Users/coladco/Desktop/final_waadi/wadi_cab/backend/admin-dashboard/dashboard.log
```

## Current Configuration

### Backend Server
- **Port**: 4001
- **Process**: `node server.js`
- **Health Endpoint**: `/health`
- **API Base**: `/api/v1`

### Admin Dashboard
- **Port**: 3000
- **Process**: `react-scripts start`
- **Environment**: Development mode
- **API Timeout**: 30 seconds

### Database
- **Type**: MongoDB
- **Connection**: Configured via environment variables

## Performance Metrics
- **API Response Time**: ~0.47 seconds
- **Dashboard Load Time**: ~0.016 seconds
- **Health Check**: ~0.001 seconds

## Last Updated
September 28, 2025 - Fixed API timeout issues and improved service reliability
