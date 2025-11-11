#!/bin/bash

echo "=== Checking Connection Errors ==="
echo ""

echo "1. Recent app logs with connection attempts:"
tail -50 /tmp/stirling-app.log 2>/dev/null | grep -E "SERIAL|Connected|Error|Failed|Open failed|Permission" | tail -15

echo ""
echo "2. Check if device is already in use:"
lsof /dev/ttyACM0 2>/dev/null || echo "  Device is not in use by other processes"

echo ""
echo "3. Test serial port with stty (if available):"
if command -v stty >/dev/null 2>&1; then
    echo "  Current port settings:"
    stty -F /dev/ttyACM0 -a 2>&1 | head -3
else
    echo "  stty not available"
fi

echo ""
echo "4. Check for serial port lock files:"
ls -la /var/lock/LCK..ttyACM* 2>/dev/null || echo "  No lock files found"

echo ""
echo "5. Test with a simple Python serial test (if Python available):"
python3 -c "
import serial
import sys
try:
    port = serial.Serial('/dev/ttyACM0', 115200, timeout=1)
    print('  ✓ Successfully opened /dev/ttyACM0')
    port.close()
    print('  ✓ Successfully closed port')
except Exception as e:
    print('  ✗ Error:', str(e))
    sys.exit(1)
" 2>&1 || echo "  Python serial test failed or Python not available"

echo ""
echo "6. Check app process and its file descriptors:"
if ps aux | grep -i "Matrix Stirling" | grep -v grep > /dev/null; then
    PID=$(ps aux | grep -i "Matrix Stirling" | grep -v grep | awk '{print $2}' | head -1)
    echo "  App PID: $PID"
    echo "  Open file descriptors:"
    ls -la /proc/$PID/fd/ 2>/dev/null | grep -i tty || echo "    No tty devices open"
fi

echo ""
echo "7. Full recent error log:"
tail -30 /tmp/stirling-app.log 2>/dev/null







