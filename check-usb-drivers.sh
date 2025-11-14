#!/bin/bash

echo "=== USB Serial Driver Check ==="
echo ""

echo "1. USB Device Status:"
lsusb | grep -i "12bf\|010b" || echo "  Device not found in USB list"

echo ""
echo "2. Serial Port Device:"
if [ -e /dev/ttyACM0 ]; then
    echo "  ✓ /dev/ttyACM0 exists"
    ls -la /dev/ttyACM0
else
    echo "  ✗ /dev/ttyACM0 does not exist"
fi

echo ""
echo "3. USB Serial Drivers (cdc_acm module):"
lsmod | grep -i "cdc_acm\|usbserial" || echo "  No USB serial modules loaded"

echo ""
echo "4. Load USB Serial Driver:"
if ! lsmod | grep -q cdc_acm; then
    echo "  Loading cdc_acm module..."
    sudo modprobe cdc_acm
    if [ $? -eq 0 ]; then
        echo "  ✓ cdc_acm module loaded"
    else
        echo "  ✗ Failed to load cdc_acm module"
    fi
else
    echo "  ✓ cdc_acm module already loaded"
fi

echo ""
echo "5. Check dmesg for USB/Serial errors:"
dmesg | tail -30 | grep -i "tty\|usb\|serial\|cdc\|acm" | tail -10

echo ""
echo "6. Test device access:"
if [ -e /dev/ttyACM0 ]; then
    echo "  Testing read access..."
    timeout 1 cat /dev/ttyACM0 2>&1 | head -1 || echo "  Cannot read from device (may need root or be in dialout group)"
    
    echo ""
    echo "  Testing write access..."
    echo "test" > /dev/ttyACM0 2>&1 && echo "  ✓ Can write to device" || echo "  ✗ Cannot write to device"
fi

echo ""
echo "7. Current user groups:"
groups

echo ""
echo "8. Check if user is in dialout group:"
if groups | grep -q dialout; then
    echo "  ✓ User is in dialout group"
else
    echo "  ✗ User is NOT in dialout group"
    echo "  Run: sudo usermod -a -G dialout $USER"
    echo "  Then logout and login again"
fi

echo ""
echo "9. udev rules:"
ls -la /etc/udev/rules.d/*stirling* 2>/dev/null || echo "  No Stirling-specific udev rules found"

echo ""
echo "10. Current device permissions:"
if [ -e /dev/ttyACM0 ]; then
    stat -c "%a %n %U:%G" /dev/ttyACM0
fi









