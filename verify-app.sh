#!/bin/bash

echo "Checking app status..."
sleep 5

# Check if app is still running
if ps aux | grep -i "Matrix Stirling" | grep -v grep > /dev/null; then
    echo "✓ App is still running"
    ps aux | grep -i "Matrix Stirling" | grep -v grep | head -1
else
    echo "✗ App is not running (may have crashed)"
fi

echo ""
echo "Checking for errors in log..."
if [ -f /tmp/stirling-app.log ]; then
    echo "Recent log entries:"
    tail -30 /tmp/stirling-app.log
    echo ""
    echo "Checking for error messages..."
    if grep -i "error\|exception\|unhandled" /tmp/stirling-app.log 2>/dev/null | tail -5; then
        echo "⚠ Found some errors in log (check above)"
    else
        echo "✓ No error messages found in recent logs"
    fi
else
    echo "No log file found"
fi

echo ""
echo "Checking serial port connection status..."
if ps aux | grep -i "Matrix Stirling" | grep -v grep > /dev/null; then
    echo "✓ App process is active"
    echo ""
    echo "If you see the app window on your desktop without error dialogs,"
    echo "and the hardware connection is working, the fix is successful!"
fi









