#!/bin/bash

echo "=== Restarting App with Fixed Permissions ==="
echo ""

# Close any running instances
echo "Closing current app instance..."
pkill -f "Matrix Stirling" || pkill -f stirling-engine-monitor || echo "No instances to close"
sleep 3

# Verify device is accessible
echo "Checking device permissions:"
ls -la /dev/ttyACM0

echo ""
echo "Launching app..."
cd ~/stirling-engine-app/dist

if [ -f "Matrix Stirling Engine-1.0.0-arm64.AppImage" ]; then
    chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
    export DISPLAY=:0.0
    export XAUTHORITY=/home/abdullah/.Xauthority
    
    # Launch app and redirect output to log
    ./"Matrix Stirling Engine-1.0.0-arm64.AppImage" > /tmp/stirling-app.log 2>&1 &
    APP_PID=$!
    
    echo "App launched with PID: $APP_PID"
    echo ""
    echo "Waiting 5 seconds for connection..."
    sleep 5
    
    # Check connection status
    echo "Checking connection status in logs:"
    if grep -i "connected\|online" /tmp/stirling-app.log 2>/dev/null | tail -3; then
        echo ""
        echo "✓ Connection detected!"
    else
        echo "Checking recent log entries:"
        tail -15 /tmp/stirling-app.log
    fi
    
    echo ""
    echo "App should now be able to connect to the hardware."
    echo "Check your Ubuntu desktop - you should see 'SYSTEM ONLINE' if connected."
else
    echo "AppImage not found!"
fi







