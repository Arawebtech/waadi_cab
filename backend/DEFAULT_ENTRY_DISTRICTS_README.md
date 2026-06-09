# Default Entry Districts Setup

This document explains how to set up and manage default entry districts for each state in the border tax system.

## Overview

Each state now has a `defaultEntryDistrict` field that automatically selects a specific district when users choose that state for border tax bookings. This improves user experience by pre-selecting the most common entry point for each state.

## Default Entry Districts Mapping

| State | Default Entry District |
|-------|----------------------|
| Uttar Pradesh | Ghazipur |
| Haryana | Gurgaon |
| Punjab | Mohali |
| Rajasthan | Alwar |
| Himachal Pradesh | Parwanoo |
| Uttarakhand | Dehradun |
| Gujarat | Shamlaji |
| Jharkhand | Dhanbad |
| Maharashtra | Aurangabad |
| Odisha | Puri |
| Madhya Pradesh | Gwalior |

## Database Changes

### State Model Updates
- Added `defaultEntryDistrict` field (ObjectId reference to District)
- Added index for `defaultEntryDistrict` field

### API Endpoints
- `GET /api/v1/states/admin` - Get states with default entry districts (for admin panel)
- `POST /api/v1/states` - Create state with optional default entry district
- `PATCH /api/v1/states/:id` - Update state including default entry district

## Setup Instructions

### 1. Run the Database Script

Execute the script to populate default entry districts:

**Windows:**
```bash
cd backend
run-default-districts.bat
```

**Linux/Mac:**
```bash
cd backend
node scripts/add-default-entry-districts.js
```

### 2. Verify the Setup

The script will:
- Connect to your MongoDB database
- Find each state by name (case-insensitive)
- Find the corresponding district within that state
- Update the state with the `defaultEntryDistrict` reference
- Display a summary of all assignments

### 3. Check Admin Panel

After running the script:
1. Open the admin dashboard
2. Navigate to States page
3. You should see a new "Default Entry District" column
4. Each state should show its assigned default district

## Admin Panel Features

### State Management
- **Add New State**: Include optional default entry district
- **Edit State**: Modify default entry district
- **Display Order**: Set custom ordering for states
- **Default District**: Select from available districts in that state

### District Selection
- Only districts belonging to the selected state are shown
- "No default district" option available
- Real-time filtering based on state selection

## Frontend Integration

### Border Tax Page
- When a user selects a state, the default entry district is automatically selected
- Users can still change the district if needed
- Improves form completion rates

### API Integration
- Frontend fetches states with populated default entry districts
- District dropdowns are filtered by selected state
- Form validation includes district selection

## Troubleshooting

### Common Issues

1. **District Not Found**
   - Ensure the district exists in the database
   - Check district name spelling (case-insensitive matching)
   - Verify district belongs to the correct state

2. **State Not Found**
   - Check state name spelling in the script
   - Ensure state exists in the database
   - Verify state is active

3. **Script Errors**
   - Check MongoDB connection string
   - Ensure models are properly imported
   - Check database permissions

### Debug Information

The script provides detailed logging:
- ✅ Success indicators for each operation
- ❌ Error messages for failed operations
- 📊 Summary of all assignments
- 🔍 Processing details for each state-district pair

## Maintenance

### Adding New States
1. Add the state through admin panel or API
2. Add districts for the new state
3. Update the script with new default district mapping
4. Re-run the script

### Updating Default Districts
1. Use the admin panel to change default districts
2. Or update directly in the database
3. Changes take effect immediately

### Removing Default Districts
1. Set `defaultEntryDistrict` to `null` in admin panel
2. Or remove the field from the database document

## Database Schema

### State Collection
```javascript
{
  _id: ObjectId,
  name: String,
  displayOrder: Number,
  defaultEntryDistrict: ObjectId, // Reference to District
  is_active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### District Collection
```javascript
{
  _id: ObjectId,
  name: String,
  state_id: ObjectId, // Reference to State
  is_active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Security Considerations

- Admin panel access should be restricted to authorized users
- API endpoints should implement proper authentication
- Database operations are logged for audit purposes
- Input validation prevents invalid district assignments

## Performance Notes

- Indexes on `defaultEntryDistrict` improve query performance
- Populated references reduce database calls
- Frontend caching improves user experience
- Efficient filtering by state and district

## Support

For issues or questions:
1. Check the script logs for error details
2. Verify database connectivity and permissions
3. Ensure all required models are properly imported
4. Check MongoDB version compatibility





