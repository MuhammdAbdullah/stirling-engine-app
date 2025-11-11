#!/bin/bash

echo "=== Debugging UI Connection Status ==="
echo ""

# Check if app is running
if ! ps aux | grep -i "Matrix Stirling" | grep -v grep > /dev/null; then
    echo "App is not running!"
    exit 1
fi

echo "App is running"
echo ""

# Check recent logs for connection status messages being sent
echo "Checking if connection status is being sent:"
grep -i "connection-status\|sendConnectionStatus\|Connected to" /tmp/stirling-app.log 2>/dev/null | tail -10

echo ""
echo "Checking for any JavaScript errors in renderer:"
# The app might have error logs, but we can't easily access the browser console
# Let's check if we can see any IPC communication errors

echo ""
echo "Let's check the renderer process..."
echo "If the connection status is being sent but UI isn't updating,"
echo "it might be a renderer-side issue."

echo ""
echo "Try opening DevTools in the app to see JavaScript console errors."
echo "Or let me check the renderer code to ensure it's listening correctly."







