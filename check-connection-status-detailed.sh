#!/bin/bash

echo "=== Detailed Connection Status Check ==="
echo ""

echo "1. Check if app shows connection in logs:"
grep -i "Connected to\|Sending connection-status" /tmp/stirling-app.log 2>/dev/null | tail -10

echo ""
echo "2. Check all SERIAL messages:"
grep -i "SERIAL" /tmp/stirling-app.log 2>/dev/null | tail -20

echo ""
echo "3. Check if port is actually open by app:"
if ps aux | grep -i "Matrix Stirling" | grep -v grep > /dev/null; then
    PID=$(ps aux | grep -i "Matrix Stirling" | grep -v grep | awk '{print $2}' | head -1)
    echo "  App PID: $PID"
    echo "  Checking open files..."
    ls -la /proc/$PID/fd/ 2>/dev/null | grep -i "tty\|socket" | head -10
fi

echo ""
echo "4. Test if we can manually open the port:"
timeout 2 cat /dev/ttyACM0 2>&1 | head -5 || echo "  No data received (normal if device is idle)"

echo ""
echo "5. Check for any connection errors in app:"
grep -i "error\|failed\|cannot\|denied" /tmp/stirling-app.log 2>/dev/null | grep -i "serial\|port\|connection" | tail -10

echo ""
echo "6. Latest 20 lines of log:"
tail -20 /tmp/stirling-app.log 2>/dev/null









