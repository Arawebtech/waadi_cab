@echo off
echo ===============================================
echo   Fetching Yesterday's PayU Payments
echo ===============================================
echo.

cd /d "%~dp0"
npm run fetch:payu:yesterday

echo.
echo ===============================================
echo   Script Execution Complete
echo ===============================================
echo.
pause










