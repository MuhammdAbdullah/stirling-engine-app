#!/bin/bash

echo "=== Verifying Connection ==="
echo ""

echo "Recent connection attempts:"
tail -50 /tmp/stirling-app.log 2>/dev/null | grep -E "Connected to|Open failed|lock|SERIAL.*Connected|Attempting connection" | tail -10

echo ""
echo "Full recent logs (last 20 lines):"
tail -20 /tmp/stirling-app.log 2>/dev/null

echo ""
echo "Checking if port is open:"
if ps aux | grep -i "Matrix Stirling" | grep -v grep > /dev/null; then
    PID=$(ps aux | grep -i "Matrix Stirling" | grep -v grep | awk '{print $2}' | head -1)
    echo "  App PID: $PID"
    ls -la /proc/$PID/fd/ 2>/dev/null | grep tty || echo "  No tty devices found in open files"
fi









