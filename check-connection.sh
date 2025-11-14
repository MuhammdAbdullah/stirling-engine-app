#!/bin/bash

echo "=== Checking Hardware Connection Status ==="
echo ""

# Check if device exists
if [ -e /dev/ttyACM0 ]; then
    echo "✓ Hardware device found: /dev/ttyACM0"
    ls -la /dev/ttyACM0
else
    echo "✗ Hardware device not found"
fi

echo ""
echo "USB devices:"
lsusb | grep -i "12bf\|010b" || echo "No matching USB device"

echo ""
echo "App process:"
if ps aux | grep -i "Matrix Stirling" | grep -v grep > /dev/null; then
    echo "✓ App is running"
    ps aux | grep -i "Matrix Stirling" | grep -v grep | head -1
else
    echo "✗ App is not running"
    exit 1
fi

echo ""
echo "Recent connection logs:"
tail -30 /tmp/stirling-app.log 2>/dev/null | grep -E "Connected|connection|Device found|Searching|SERIAL" | tail -10

echo ""
echo "Full recent logs (last 15 lines):"
tail -15 /tmp/stirling-app.log 2>/dev/null









