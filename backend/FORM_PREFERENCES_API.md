# Form Preferences API Documentation

## Overview
The Form Preferences API allows users to save, retrieve, and manage their form preferences for different application forms. This enables a better user experience by auto-filling forms with previously saved data.

## Base URL
```
 http://localhost:4001/api/v1/users/form-preferences
```

## Authentication
All endpoints require authentication using Bearer token:
```
Authorization: Bearer {token}
```

## Endpoints

### 1. Save Form Preferences
**POST** `/api/v1/users/form-preferences`

Save or update form preferences for a specific form type.

#### Request Body
```json
{
  "formType": "border_tax_booking",
  "preferences": {
    "visitingStateId": "68705641218c12edd045fcff",
    "visitingStateName": "Bihar",
    "vehicleNumber": "DL01AB1234",
    "vehicleTypeId": "6870685393ba70aa97c60698",
    "vehicleTypeName": "4+1",
    "whatsappNumber": "9876543210",
    "entryBorderId": "6870685293ba70aa97c6064c",
    "entryBorderName": "Araria",
    "planId": "6870685393ba70aa97c6069a",
    "planType": "Weekly"
  }
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Form preferences saved successfully",
  "data": {
    "id": "form_pref_id",
    "userId": "user_id",
    "formType": "border_tax_booking",
    "preferences": {
      "visitingStateId": "68705641218c12edd045fcff",
      "visitingStateName": "Bihar",
      "vehicleNumber": "DL01AB1234",
      "vehicleTypeId": "6870685393ba70aa97c60698",
      "vehicleTypeName": "4+1",
      "whatsappNumber": "9876543210",
      "entryBorderId": "6870685293ba70aa97c6064c",
      "entryBorderName": "Araria",
      "planId": "6870685393ba70aa97c6069a",
      "planType": "Weekly"
    },
    "createdAt": "2025-01-11T10:30:00.000Z",
    "updatedAt": "2025-01-11T10:30:00.000Z"
  }
}
```

#### Response (Error - 400)
```json
{
  "success": false,
  "message": "Missing required field: visitingStateId"
}
```

### 2. Get Form Preferences
**GET** `/api/v1/users/form-preferences?formType=border_tax_booking`

Retrieve form preferences for a specific form type.

#### Query Parameters
- `formType` (required): The type of form preferences to retrieve

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Form preferences retrieved successfully",
  "data": {
    "id": "form_pref_id",
    "userId": "user_id",
    "formType": "border_tax_booking",
    "preferences": {
      "visitingStateId": "68705641218c12edd045fcff",
      "visitingStateName": "Bihar",
      "vehicleNumber": "DL01AB1234",
      "vehicleTypeId": "6870685393ba70aa97c60698",
      "vehicleTypeName": "4+1",
      "whatsappNumber": "9876543210",
      "entryBorderId": "6870685293ba70aa97c6064c",
      "entryBorderName": "Araria",
      "planId": "6870685393ba70aa97c6069a",
      "planType": "Weekly"
    },
    "createdAt": "2025-01-11T10:30:00.000Z",
    "updatedAt": "2025-01-11T10:30:00.000Z"
  }
}
```

#### Response (Error - 404)
```json
{
  "success": false,
  "message": "No form preferences found for this form type"
}
```

### 3. Delete Form Preferences
**DELETE** `/api/v1/users/form-preferences?formType=border_tax_booking`

Delete form preferences for a specific form type.

#### Query Parameters
- `formType` (required): The type of form preferences to delete

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Form preferences deleted successfully"
}
```

#### Response (Error - 404)
```json
{
  "success": false,
  "message": "No form preferences found for this form type"
}
```

### 4. Get All Form Preferences
**GET** `/api/v1/users/form-preferences/all`

Retrieve all form preferences for the authenticated user.

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "All form preferences retrieved successfully",
  "data": [
    {
      "id": "form_pref_id_1",
      "userId": "user_id",
      "formType": "border_tax_booking",
      "preferences": { ... },
      "createdAt": "2025-01-11T10:30:00.000Z",
      "updatedAt": "2025-01-11T10:30:00.000Z"
    },
    {
      "id": "form_pref_id_2",
      "userId": "user_id",
      "formType": "other_forms",
      "preferences": { ... },
      "createdAt": "2025-01-11T10:30:00.000Z",
      "updatedAt": "2025-01-11T10:30:00.000Z"
    }
  ],
  "total": 2
}
```

### 5. Delete All Form Preferences
**DELETE** `/api/v1/users/form-preferences/all`

Delete all form preferences for the authenticated user.

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "All form preferences deleted successfully",
  "data": {
    "deletedCount": 2
  }
}
```

## Data Model

### FormPreferences Schema
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  formType: String (enum: ['border_tax_booking', 'other_forms']),
  preferences: {
    visitingStateId: String,
    visitingStateName: String,
    vehicleNumber: String,
    vehicleTypeId: String,
    vehicleTypeName: String,
    whatsappNumber: String,
    entryBorderId: String,
    entryBorderName: String,
    planId: String,
    planType: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Business Logic

### 1. One Preference Per Form Type
- Each user can have only one saved preference per form type
- If preferences exist, they are updated; if not, new ones are created

### 2. Validation
- All referenced IDs (state, vehicle type, plan) are validated to exist and be active
- Required fields are validated before saving

### 3. Security
- Users can only access their own preferences
- Authentication is required for all endpoints

### 4. Cleanup
- When a user is deleted, all their form preferences are automatically removed
- Post-remove middleware handles cleanup

## Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found (preferences not found)
- `409` - Conflict (duplicate preferences)
- `500` - Internal Server Error

### Common Error Messages
- `"Form type and preferences are required"`
- `"Invalid form type. Must be one of: border_tax_booking, other_forms"`
- `"Missing required field: {fieldName}"`
- `"Invalid or inactive visiting state"`
- `"Invalid or inactive vehicle type"`
- `"Invalid or inactive plan"`
- `"No form preferences found for this form type"`

## Form Types

### Supported Form Types
- `border_tax_booking` - Border tax booking form
- `other_forms` - Other application forms (extensible)

## Performance Considerations

### Indexes
- Compound index on `{ userId: 1, formType: 1 }` for fast queries
- Unique constraint ensures one preference per form type per user

### Validation
- Pre-save middleware validates referenced IDs
- Ensures data integrity and consistency

## Integration Points

### 1. User Registration
- Form preferences are cleared when user registers (if needed)

### 2. Profile Updates
- Preferences can be updated when user changes phone number

### 3. Booking Success
- Option to clear preferences after successful booking

### 4. Form Reset
- API endpoints to clear specific form preferences

## Testing Scenarios

### 1. Save Preferences
- Save preferences for new user
- Update existing preferences
- Handle invalid form data

### 2. Retrieve Preferences
- Get preferences for returning user
- Handle non-existent preferences

### 3. Delete Preferences
- Delete specific form preferences
- Delete all user preferences

### 4. Validation
- Test with invalid referenced IDs
- Test with missing required fields
- Test with invalid form types

### 5. Security
- Test unauthorized access
- Test user isolation (user A cannot access user B's preferences)

## Example Usage

### Frontend Integration
```javascript
// Save form preferences
const savePreferences = async (formType, preferences) => {
  const response = await fetch('/api/v1/users/form-preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ formType, preferences })
  });
  return response.json();
};

// Get form preferences
const getPreferences = async (formType) => {
  const response = await fetch(`/api/v1/users/form-preferences?formType=${formType}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```

### Auto-fill Form
```javascript
// Auto-fill form with saved preferences
const autoFillForm = async (formType) => {
  try {
    const result = await getPreferences(formType);
    if (result.success) {
      const { preferences } = result.data;
      // Fill form fields with preferences
      document.getElementById('visitingState').value = preferences.visitingStateName;
      document.getElementById('vehicleNumber').value = preferences.vehicleNumber;
      // ... fill other fields
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
};
```

## Future Enhancements

### 1. Versioning
- Add version field for schema changes
- Backward compatibility support

### 2. Analytics
- Track most commonly used preferences
- Usage analytics and insights

### 3. Expiry
- Auto-delete old preferences (e.g., after 6 months)
- Configurable retention policies

### 4. Caching
- Cache frequently accessed preferences
- Redis integration for performance

### 5. Soft Delete
- Implement soft delete for audit trails
- Recovery options for deleted preferences 