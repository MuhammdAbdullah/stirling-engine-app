#!/bin/bash

echo "=== Checking App Connection Status ==="
echo ""

echo "Recent log entries:"
tail -25 /tmp/stirling-app.log 2>/dev/null

echo ""
echo "--- Connection Status ---"
if grep -i "Connected to" /tmp/stirling-app.log 2>/dev/null | tail -1; then
    echo "✓ Device connected successfully!"
elif grep -i "Open failed\|Permission denied" /tmp/stirling-app.log 2>/dev/null | tail -1; then
    echo "✗ Connection failed - check permissions"
else
    echo "Checking connection attempts..."
    grep -i "Attempting connection\|Device found\|Open" /tmp/stirling-app.log 2>/dev/null | tail -3
fi

echo ""
echo "App process status:"
ps aux | grep -i "Matrix Stirling" | grep -v grep || echo "App not running"

echo ""
echo "If you see 'Connected to /dev/ttyACM0' in the logs, the hardware is connected."
echo "The UI should show 'SYSTEM ONLINE' in the status banner."







