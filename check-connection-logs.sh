#!/bin/bash

echo "=== Checking Connection Status Messages ==="
echo ""

if [ -f /tmp/stirling-app.log ]; then
    echo "Recent connection-related messages:"
    grep -i "connected\|connection-status\|sendConnectionStatus" /tmp/stirling-app.log | tail -10
    echo ""
    echo "Full recent log (last 20 lines):"
    tail -20 /tmp/stirling-app.log
else
    echo "Log file not found"
fi

echo ""
echo "Current process status:"
ps aux | grep -i "Matrix Stirling" | grep -v grep || echo "App not running"









