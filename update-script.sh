#!/bin/bash
cd ~/stirling-engine-build || exit 1

echo "Extracting updated files..."
if [ -f ~/app-update.zip ]; then
    unzip -q -o ~/app-update.zip
    rm ~/app-update.zip
elif [ -f app-update.zip ]; then
    unzip -q -o app-update.zip
    rm app-update.zip
else
    echo "ERROR: app-update.zip not found in ~/ or current directory!"
    ls -la ~/app-update.zip app-update.zip 2>/dev/null || true
    exit 1
fi

echo ""
echo "Clearing fpm cache (fixing ARM64 issue)..."
rm -rf ~/.cache/electron-builder/fpm/fpm-*-linux-x86 2>/dev/null || true

echo ""
echo "Rebuilding ARM64 version..."
npm run build-linux-arm64

BUILD_STATUS=$?
if [ $BUILD_STATUS -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

echo ""
echo "Removing old package..."
sudo dpkg -r stirling-engine-monitor 2>/dev/null || true

echo ""
echo "Installing new package..."
# Try DEB first, fallback to AppImage if DEB build failed
DEB_FILE=$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -n "$DEB_FILE" ]; then
    echo "Installing DEB package: $DEB_FILE"
    sudo dpkg -i "$DEB_FILE"
    sudo apt-get install -f -y
    
    echo ""
    echo "Fixing sandbox permissions..."
    if [ -f /opt/stirling-engine/chrome-sandbox ]; then
        sudo chown root:root /opt/stirling-engine/chrome-sandbox
        sudo chmod 4755 /opt/stirling-engine/chrome-sandbox
    fi
else
    echo "DEB file not found, checking for AppImage..."
    APPIMAGE=$(ls dist/*arm64*.AppImage 2>/dev/null | head -1)
    if [ -n "$APPIMAGE" ]; then
        echo "AppImage found: $APPIMAGE"
        echo "Note: AppImage needs to be run manually or installed separately"
    else
        echo "ERROR: No DEB or AppImage found!"
        exit 1
    fi
fi

echo ""
echo "=== Update Complete! ==="
