@echo off
echo Installing Stirling Engine Monitor...
echo.

echo Installing Node.js dependencies...
call npm install

echo.
echo Downloading Chart.js locally...
call node setup.js

echo.
echo Setup complete! 
echo.
echo To run the app:
echo   npm start
echo.
echo To run in development mode:
echo   npm run dev
echo.
echo To build the app:
echo   npm run build-win
echo.
pause

