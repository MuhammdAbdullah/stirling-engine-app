#!/bin/bash
# Build script for Raspberry Pi ARM64 that fixes the fpm x86 issue

echo "=== Building Matrix Stirling Engine for Raspberry Pi ARM64 ==="
echo ""

# Clear the x86 fpm cache that electron-builder incorrectly downloads
echo "Step 1: Clearing x86 fpm cache..."
rm -rf ~/.cache/electron-builder/fpm/fpm-*-linux-x86 2>/dev/null || true
echo "✓ Cache cleared"
echo ""

# Check if fpm is installed natively (optional - helps with DEB building)
if command -v fpm &> /dev/null; then
    echo "✓ Native fpm found - DEB package building should work"
else
    echo "ℹ Native fpm not found - AppImage will still build successfully"
    echo "  (DEB package might fail, but AppImage is recommended anyway)"
fi
echo ""

# Build the app
echo "Step 2: Building ARM64 version..."
echo "This will take 5-10 minutes..."
echo ""

npm run build-linux-arm64

BUILD_STATUS=$?

echo ""
if [ $BUILD_STATUS -eq 0 ]; then
    echo "=== Build Complete! ==="
    echo ""
    echo "Built files are in the 'dist' folder:"
    cd dist
    ls -lh *.AppImage *.deb *.tar.gz 2>/dev/null || ls -lh
    echo ""
    echo "To run the app:"
    echo "  cd dist"
    echo "  chmod +x \"Matrix Stirling Engine-\"*.AppImage"
    echo "  ./\"Matrix Stirling Engine-\"*.AppImage"
else
    echo "=== Build had errors ==="
    echo ""
    echo "The AppImage should still be built successfully even if DEB failed."
    echo "Check the dist folder for the AppImage file."
    echo ""
    echo "If you need the DEB package, install fpm first:"
    echo "  sudo apt-get install -y ruby ruby-dev build-essential"
    echo "  sudo gem install fpm"
    echo "  Then run this script again."
fi

