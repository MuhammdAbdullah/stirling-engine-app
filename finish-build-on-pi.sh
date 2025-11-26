#!/bin/bash
# Quick script to finish the build and create the installable DEB package
# Run this on the Pi: bash finish-build-on-pi.sh

cd ~/stirling-engine-build

echo "=== Installing npm ==="
sudo apt-get install -y npm

echo ""
echo "=== Installing dependencies ==="
echo "This will take 5-10 minutes..."
npm install

if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed!"
    exit 1
fi

echo ""
echo "=== Building ARM64 DEB package ==="
echo "This will take 5-10 minutes..."
npm run build-linux-arm64

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

echo ""
echo "=== Build complete! ==="
DEB_FILE=$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -n "$DEB_FILE" ]; then
    echo "DEB package created: $DEB_FILE"
    ls -lh "$DEB_FILE"
    echo ""
    echo "To install it, run:"
    echo "  sudo dpkg -i $DEB_FILE"
    echo "  sudo apt-get install -f -y"
    echo ""
    echo "To copy it back to Windows, from Windows PowerShell run:"
    echo "  scp abdullah@192.168.1.96:$DEB_FILE ."
else
    echo "ERROR: DEB file not found!"
    ls -la dist/
fi

