#!/bin/bash

echo "=== Fixing Serial Port Permissions ==="
echo ""

# Add user to dialout group
echo "Adding user to dialout group..."
sudo usermod -a -G dialout $USER

echo ""
echo "Current groups:"
groups

echo ""
echo "Checking dialout group membership:"
if groups | grep -q dialout; then
    echo "✓ User is now in dialout group"
    echo ""
    echo "⚠ NOTE: You need to logout and login again for the group change to take effect."
    echo "   OR restart the app after logging out/in"
else
    echo "✗ User is not in dialout group yet (may need to logout/login)"
fi

echo ""
echo "Alternative: Fixing permissions temporarily with udev rules..."
echo "Creating udev rule for 12bf:010b device..."

# Create udev rule
sudo bash -c 'cat > /etc/udev/rules.d/99-stirling-engine.rules << EOF
# Stirling Engine USB Serial Device
SUBSYSTEM=="tty", ATTRS{idVendor}=="12bf", ATTRS{idProduct}=="010b", MODE="0666", GROUP="dialout"
EOF'

echo "Reloading udev rules..."
sudo udevadm control --reload-rules
sudo udevadm trigger

echo ""
echo "Checking /dev/ttyACM0 permissions after udev rule:"
sleep 2
ls -la /dev/ttyACM0









