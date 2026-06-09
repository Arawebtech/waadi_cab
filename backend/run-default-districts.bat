@echo off
echo Running Default Entry Districts Script...
echo.

cd /d "%~dp0"
node scripts/add-default-entry-districts.js

echo.
echo Script completed. Press any key to exit.
pause >nul





