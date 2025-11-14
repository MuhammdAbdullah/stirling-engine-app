#!/bin/bash

echo "=== Checking Hardware Connection ==="
echo ""

# Check for USB devices
echo "USB devices:"
lsusb | grep -i "12BF\|010B\|stirling" || echo "No matching USB devices found"

echo ""
echo "Serial ports:"
ls -la /dev/ttyACM* /dev/ttyUSB* 2>/dev/null || echo "No serial ports found"

echo ""
echo "Current user:"
whoami

echo ""
echo "User groups:"
groups

echo ""
echo "Serial port permissions:"
ls -la /dev/ttyACM* 2>/dev/null || echo "No /dev/ttyACM* devices"

echo ""
echo "Checking if device exists:"
if [ -e /dev/ttyACM0 ]; then
    echo "✓ /dev/ttyACM0 exists"
    ls -la /dev/ttyACM0
else
    echo "✗ /dev/ttyACM0 does not exist"
fi

echo ""
echo "=== Current App Status ==="
if ps aux | grep -i "Matrix Stirling" | grep -v grep > /dev/null; then
    echo "App is running"
    ps aux | grep -i "Matrix Stirling" | grep -v grep | head -1
else
    echo "App is not running"
fi









