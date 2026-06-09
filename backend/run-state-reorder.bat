@echo off
echo 🔄 Starting state reordering process...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if the script exists
if not exist "scripts\add-missing-states.js" (
    echo ❌ Script not found. Please make sure you're in the backend directory.
    pause
    exit /b 1
)

REM Set MongoDB connection string (update this with your actual connection string)
set MONGODB_URI=mongodb://localhost:27017/wadi_cab

echo 📡 Using MongoDB URI: %MONGODB_URI%
echo.

REM Run the script
node scripts/add-missing-states.js

echo.
echo ✅ State reordering completed!
echo 📱 States will now appear in the correct order on the frontend.
pause






