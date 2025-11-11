#!/bin/bash

echo "Checking if app is running..."
ps aux | grep -i stirling | grep -v grep | head -3

echo ""
echo "App status:"
if pgrep -f stirling-engine > /dev/null; then
    echo "✓ App is running"
else
    echo "✗ App is not running"
fi

echo ""
echo "Recent logs (last 10 lines):"
tail -10 /tmp/stirling-app.log 2>/dev/null







