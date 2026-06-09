# State Reordering Guide

This guide explains how to reorder the states in your MongoDB database to match a specific sequence.

## Current State Order

The states will be reordered to match this sequence:

1. **UTTAR PRADESH**
2. **HARYANA**
3. **RAJASTHAN**
4. **UTTRAKHAND**
5. **PUNJAB**
6. **HIMACHAL PRADESH**
7. **MADHYA PRADESH** *(will be added if missing)*
8. **GUJRAT**
9. **JHARKHAND**
10. **MAHARASHTRA**
11. **BIHAR**
12. **ODISHA**

## What the Scripts Do

### 1. **add-missing-states.js** (Main Script)
- ✅ Adds missing states (like MADHYA PRADESH)
- ✅ Updates all existing states with `displayOrder` field
- ✅ Ensures proper ordering in the database

### 2. **reorder-states.js** (Alternative Script)
- ✅ Only updates existing states with `displayOrder`
- ✅ Use this if you don't need to add missing states

## How to Run

### Option 1: Using the Scripts Directly

```bash
# Navigate to backend directory
cd backend

# Run the main script
node scripts/add-missing-states.js
```

### Option 2: Using Shell Scripts

**On Linux/Mac:**
```bash
cd backend
chmod +x run-state-reorder.sh
./run-state-reorder.sh
```

**On Windows:**
```cmd
cd backend
run-state-reorder.bat
```

## Prerequisites

1. **Node.js** installed on your system
2. **MongoDB** running and accessible
3. **Correct MongoDB connection string** in the script

## Configuration

### Update MongoDB Connection String

Before running, update the MongoDB connection string in the script:

```javascript
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wadi_cab';
```

**Common connection strings:**
- Local: `mongodb://localhost:27017/wadi_cab`
- Atlas: `mongodb+srv://username:password@cluster.mongodb.net/wadi_cab`
- Docker: `mongodb://mongo:27017/wadi_cab`

### Using Environment Variables

You can also set the connection string as an environment variable:

```bash
# Linux/Mac
export MONGODB_URI="your_connection_string_here"

# Windows
set MONGODB_URI=your_connection_string_here
```

## What Happens After Running

1. **Database Updated**: All states get a `displayOrder` field
2. **Frontend Automatically Sorted**: States will appear in the correct order
3. **No Code Changes Needed**: The API now returns states sorted by `displayOrder`

## Verification

After running the script, you should see output like:

```
✅ Connected to MongoDB
📋 Existing states: ["UTTAR PRADESH", "HARYANA", "PUNJAB", ...]
📝 Found 1 missing states: ["MADHYA PRADESH"]
✅ Added new state: MADHYA PRADESH with displayOrder: 7
🔄 Updating existing states with displayOrder...
✅ Updated UTTAR PRADESH with displayOrder: 1
✅ Updated HARYANA with displayOrder: 2
...

📋 Final state order:
1. UTTAR PRADESH
2. HARYANA
3. RAJASTHAN
...
🎉 State management completed successfully!
```

## Troubleshooting

### Common Issues

1. **Connection Error**: Check your MongoDB connection string
2. **Permission Error**: Ensure you have write access to the database
3. **Script Not Found**: Make sure you're in the `backend` directory

### Manual Verification

You can manually check the database:

```javascript
// In MongoDB shell or Compass
db.states.find({}).sort({displayOrder: 1})
```

## Frontend Impact

Once the script runs successfully:
- ✅ States will automatically appear in the correct order
- ✅ No frontend code changes needed
- ✅ The API now sorts by `displayOrder` instead of alphabetically
- ✅ All existing functionality preserved

## Rollback (If Needed)

If you need to revert the changes:

```javascript
// Remove displayOrder field from all states
db.states.updateMany({}, {$unset: {displayOrder: 1}})

// Reset indexes
db.states.dropIndex("displayOrder_1")
```

## Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify your MongoDB connection
3. Ensure all prerequisites are met
4. Check the database permissions






