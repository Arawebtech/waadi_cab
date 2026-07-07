# Wadi Cab Admin Dashboard

A comprehensive admin dashboard for managing the Wadi Cab border booking platform. Built with React, TypeScript, and Tailwind CSS.

## Features

### 🎯 **Core Features**
- **Dashboard Overview**: Real-time statistics, charts, and key metrics
- **Bookings Management**: View, filter, search, and update all bookings
- **User Management**: Manage all registered users with detailed profiles
- **Location Management**: CRUD operations for states and districts
- **Vehicle Types**: Manage vehicle types and configurations
- **Plans & Pricing**: Configure pricing plans and tax rates
- **Analytics**: Advanced reporting and business intelligence
- **Settings**: System configuration and preferences

### 🔧 **Technical Features**
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Data**: Live updates and statistics
- **Advanced Filtering**: Search, sort, and filter across all modules
- **CRUD Operations**: Complete create, read, update, delete functionality
- **Type Safety**: Full TypeScript implementation
- **Modern UI**: Clean, professional interface with Tailwind CSS

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Backend API running on 31.97.229.97:4001

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the admin-dashboard directory (optional, defaults to  http://localhost:4001/api/v1):
   ```env
   REACT_APP_API_URL= http://localhost:4001/api/v1
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Access Dashboard**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production
```bash
npm run build
```

## API Integration

The dashboard communicates with the backend API at ` http://localhost:4001/api/v1` by default. You can override this by setting the `REACT_APP_API_URL` environment variable. Make sure your backend server is running before starting the dashboard.

### API Endpoints Used
- `GET /admin/dashboard` - Dashboard statistics
- `GET /admin/bookings` - Bookings management
- `GET /admin/users` - User management  
- `GET /admin/states` - States and location data
- `GET /admin/analytics` - Analytics data
- CRUD endpoints for states, districts, vehicle types, and plans

## Dashboard Modules

### 1. Dashboard Overview
- **Real-time Statistics**: Users, bookings, revenue, active states
- **Revenue Charts**: Monthly revenue trends and projections
- **Tax Mode Distribution**: Visual breakdown of booking types
- **Top Performing States**: Revenue and booking statistics by state
- **Quick Actions**: Refresh data, export reports

### 2. Bookings Management
- **Advanced Filtering**: Status, state, date range, tax mode, search
- **Bulk Operations**: Update multiple bookings at once
- **Real-time Updates**: Live booking status changes
- **Detailed Views**: Complete booking information and history
- **Export Functionality**: Download booking reports

### 3. User Management
- **User Profiles**: Complete user information and statistics
- **Activity Tracking**: Booking history and spending patterns
- **Verification Status**: Manage user verification
- **Search & Filter**: Find users by name, phone, email, or activity
- **User Analytics**: Total spending, booking counts, join dates

### 4. Location Management
- **States Management**: Add, edit, delete states
- **Districts Management**: Manage districts within states
- **Usage Statistics**: Bookings and revenue per location
- **Active/Inactive Status**: Control location availability
- **Hierarchical View**: States with their associated districts

### 5. Data Tables
All data tables include:
- **Pagination**: Navigate through large datasets
- **Sorting**: Sort by any column
- **Search**: Global and column-specific search
- **Responsive Design**: Works on all screen sizes
- **Loading States**: Skeleton loading indicators
- **Empty States**: Helpful messages when no data

## Technology Stack

### Frontend
- **React 18**: Latest React with concurrent features
- **TypeScript**: Full type safety and better developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful, customizable icons
- **React Router**: Client-side routing
- **Recharts**: Charts and data visualization

### Development Tools
- **React Scripts**: Development and build tooling
- **ESLint**: Code linting and formatting
- **PostCSS**: CSS processing and optimization

## Project Structure

```
admin-dashboard/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   └── Layout.tsx          # Main layout with sidebar
│   ├── pages/
│   │   ├── Dashboard.tsx       # Overview page
│   │   ├── Bookings.tsx        # Bookings management
│   │   ├── Users.tsx           # User management
│   │   ├── States.tsx          # Location management
│   │   ├── VehicleTypes.tsx    # Vehicle types
│   │   ├── Plans.tsx           # Pricing plans
│   │   ├── Analytics.tsx       # Advanced analytics
│   │   └── Settings.tsx        # System settings
│   ├── services/
│   │   └── api.ts              # API service layer
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   ├── App.tsx                 # Main app component
│   ├── index.tsx               # App entry point
│   └── App.css                 # Global styles
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Usage Guide

### Navigation
- Use the sidebar to navigate between different modules
- The dashboard automatically shows the current page in the header
- Mobile users can access the sidebar via the hamburger menu

### Filters and Search
- Use the search bars to find specific records
- Apply date range filters for time-based analysis
- Combine multiple filters for precise results
- Clear filters by refreshing the page or clearing individual fields

### Data Management
- Click edit icons to modify records
- Use bulk actions for multiple operations
- Confirm deletions to prevent accidental data loss
- All changes are saved automatically

### Responsive Design
- The dashboard works on all screen sizes
- Tables scroll horizontally on mobile devices
- Sidebar collapses on mobile for better space utilization
- Touch-friendly buttons and interactions

## Development

### Adding New Features
1. Create new page components in `src/pages/`
2. Add corresponding types in `src/types/index.ts`
3. Implement API calls in `src/services/api.ts`
4. Update routing in `src/App.tsx`
5. Add navigation links in `src/components/Layout.tsx`

### Styling Guidelines
- Use Tailwind CSS classes for all styling
- Follow the existing color scheme (blue primary, gray neutral)
- Maintain consistent spacing using Tailwind's spacing scale
- Use the established component patterns for consistency

### API Integration
- All API calls go through the `AdminAPI` service class
- Handle loading states and errors consistently
- Use TypeScript interfaces for all API responses
- Implement proper error handling and user feedback

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Ensure backend server is running on 31.97.229.97:4001
   - Check REACT_APP_API_URL environment variable
   - Verify CORS settings on the backend

2. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run build`
   - Verify all imports and file paths

3. **Styling Issues**
   - Ensure Tailwind CSS is properly configured
   - Check for conflicting CSS rules
   - Verify responsive breakpoints

### Getting Help
- Check browser console for JavaScript errors
- Review network tab for API request failures
- Ensure all dependencies are properly installed
- Verify environment variables are set correctly

## License

This project is part of the Wadi Cab platform. All rights reserved.

---

## Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

Built with ❤️ for efficient border tax management.
