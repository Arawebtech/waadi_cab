# Version Tracking Implementation Guide

## Overview
This document describes the implementation of app version tracking feature that stores user app versions from `package.json` and displays them in the admin dashboard.

## Changes Made

### 1. Backend Changes

#### User Model (`backend/src/models/User.js`)
Added version tracking fields:
- `appVersion` (String): Stores the app version (e.g., "0.1.2")
- `platform` (String): Enum ['android', 'ios', 'web'] - User's platform
- `lastVersionUpdate` (Date): Timestamp of last version update

#### Version Tracking Controller (`backend/src/controllers/versionTrackingController.js`)
New controller with three endpoints:
- `POST /api/v1/version-track` - Track user's app version
- `GET /api/v1/version-stats` - Get version statistics (admin)
- `GET /api/v1/users-by-version/:version` - Get users by specific version (admin)

#### Version Tracking Routes (`backend/src/routes/versionTrackingRoutes.js`)
New routes file for version tracking endpoints.

#### Server Configuration (`backend/server.js`)
- Added version tracking routes to the API
- Updated CORS to include port 3002

#### Admin Controller (`backend/src/controllers/adminController.js`)
- Updated `getAllUsers` aggregation pipeline to exclude only sensitive fields (password, refreshTokens, bookings)
- This ensures version tracking fields are included in the response

### 2. Frontend Changes

#### API Service (`frontend/lib/api.ts`)
Added new interfaces and API functions:
- `VersionTrackingRequest` interface
- `VersionTrackingResponse` interface
- `VersionStatsResponse` interface
- `versionTrackingAPI.trackVersion()` method
- `versionTrackingAPI.getVersionStats()` method

#### Version Tracker Component (`frontend/components/version-tracker.tsx`)
New component that:
- Automatically tracks user's app version on mount
- Gets version from `NEXT_PUBLIC_APP_VERSION` env variable (defaults to package.json version)
- Sends version data to backend
- Renders nothing (invisible component)

#### Dashboard Integration (`frontend/app/dashboard/page.tsx`)
- Imported `VersionTracker` component and `tokenManager`
- Added version tracking for logged-in users
- Automatically tracks version when user visits dashboard

### 3. Admin Dashboard Changes

#### Types (`backend/admin-dashboard/src/types/index.ts`)
Updated `User` interface to include:
- `appVersion?: string`
- `platform?: 'android' | 'ios' | 'web'`
- `lastVersionUpdate?: string`

#### Users Page (`backend/admin-dashboard/src/pages/Users.tsx`)
- Added "App Version" and "Platform" columns to users table
- Added version statistics cards showing:
  - Users with version info
  - Android users count
  - Web users count
- Version badges with color coding:
  - Blue for app version
  - Green for Android
  - Gray for iOS
  - Purple for Web
- Added `Smartphone` icon import

## API Endpoints

### Track Version
```
POST /api/v1/version-track
Body: {
  "userId": "string (ObjectId or phone number)",
  "appVersion": "string (e.g., '0.1.2')",
  "platform": "string (android|ios|web)"
}
Response: {
  "success": boolean,
  "message": string,
  "data": {
    "userId": string,
    "appVersion": string,
    "platform": string,
    "lastVersionUpdate": string
  }
}
```

### Get Version Statistics
```
GET /api/v1/version-stats
Response: {
  "success": boolean,
  "data": {
    "versionStats": [
      {
        "_id": "0.1.2",
        "count": 10,
        "platforms": ["web", "android"]
      }
    ],
    "platformStats": [
      {
        "_id": "web",
        "count": 15
      }
    ],
    "totalUsers": 20,
    "totalUsersWithVersion": 15,
    "coverage": "75.00"
  }
}
```

### Get Users by Version
```
GET /api/v1/users-by-version/:version?page=1&limit=20
Response: {
  "success": boolean,
  "data": [User[]],
  "pagination": {
    "total": number,
    "page": number,
    "limit": number,
    "pages": number
  }
}
```

## Usage

### Automatic Tracking
Version tracking happens automatically when:
1. User logs in and visits the dashboard
2. The `VersionTracker` component mounts
3. Component reads version from `NEXT_PUBLIC_APP_VERSION` env variable
4. Sends version data to backend API

### Manual Tracking
You can also track version manually:
```typescript
import { versionTrackingAPI } from '@/lib/api';

await versionTrackingAPI.trackVersion({
  userId: user._id,
  appVersion: '0.1.2',
  platform: 'android'
});
```

## Environment Variables

### Frontend
Add to `.env.local`:
```
NEXT_PUBLIC_APP_VERSION=0.1.2
```

Or it will default to the version in `package.json`.

## Admin Dashboard View

### Users Table
The users table now shows:
- **App Version**: Badge showing the app version (e.g., "0.1.2")
- **Platform**: Badge showing the platform (Android/iOS/Web)
- Color-coded for easy identification

### Statistics Cards
New cards showing:
- **Users with Version Info**: Count of users with tracked versions
- **Android Users**: Count of Android app users
- **Web Users**: Count of web app users

## Database Schema

### User Model Updates
```javascript
{
  // ... existing fields
  appVersion: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    enum: ['android', 'ios', 'web'],
    default: 'web'
  },
  lastVersionUpdate: {
    type: Date,
    default: null
  }
}
```

### Indexes
Added indexes for performance:
- `appVersion` (ascending)
- `platform` (ascending)
- `lastVersionUpdate` (ascending)

## Testing

### Test Version Tracking
1. Start backend server
2. Start frontend dev server
3. Login to the application
4. Visit the dashboard
5. Check browser console for version tracking logs
6. Visit admin dashboard Users page
7. Verify version information appears in the table

### Test Admin API
```bash
# Get version stats
curl  https://api.waadi.in/api/v1/version-stats

# Track version
curl -X POST  https://api.waadi.in/api/v1/version-track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_OR_PHONE",
    "appVersion": "0.1.2",
    "platform": "web"
  }'
```

## Notes

1. **Backward Compatibility**: Existing users without version info will show "Unknown" in the admin dashboard
2. **Privacy**: Version tracking only stores version number and platform, no sensitive data
3. **Performance**: Version tracking happens asynchronously and doesn't block user experience
4. **Automatic Updates**: Version is updated each time user visits dashboard while logged in

## Future Enhancements

Potential improvements:
1. Add version update notifications to admins when users upgrade
2. Create version distribution charts
3. Add ability to send targeted push notifications based on version
4. Track version history (multiple versions per user over time)
5. Add version requirements for certain features
6. Show last active date for each version

## Troubleshooting

### Version not tracking
- Check if `NEXT_PUBLIC_APP_VERSION` is set
- Verify user is logged in
- Check browser console for errors
- Verify backend API is accessible

### Admin dashboard not showing version
- Ensure backend aggregation pipeline doesn't exclude version fields
- Check if users have version data in database
- Verify frontend types include version fields

### API errors
- Check MongoDB connection
- Verify User model has version fields
- Check route registration in server.js

