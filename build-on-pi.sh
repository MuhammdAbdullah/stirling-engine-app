#!/bin/bash
# Build script to run on Raspberry Pi
# Copy this file to the Pi and run it: bash build-on-pi.sh

# Don't exit on errors immediately - show what happened
set +e

REMOTE_PATH=~/stirling-engine-build

echo "=== Checking source files ==="
cd $REMOTE_PATH 2>/dev/null || mkdir -p $REMOTE_PATH && cd $REMOTE_PATH

# Only extract if files don't exist
if [ ! -f package.json ]; then
    if [ -f ~/stirling-source.zip ]; then
        echo "Extracting source files..."
        unzip -q ~/stirling-source.zip 2>&1 | grep -v "backslashes" || true
        rm ~/stirling-source.zip
    else
        echo "ERROR: Source files not found and no archive available!"
        exit 1
    fi
else
    echo "Source files already extracted, continuing..."
fi

if [ ! -f package.json ]; then
    echo "ERROR: Failed to extract files!"
    exit 1
fi

echo ""
echo "=== Checking Node.js and npm ==="
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js version: $(node --version)"
fi

# Check for npm separately
if ! command -v npm &> /dev/null; then
    echo "npm not found, installing npm..."
    sudo apt-get install -y npm
    # Refresh PATH
    export PATH=$PATH:/usr/bin
fi

# Verify npm is available
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm still not found after installation!"
    echo "Trying to locate npm..."
    which npm || find /usr -name npm 2>/dev/null | head -1
    exit 1
fi

echo "npm version: $(npm --version)"

echo ""
echo "=== Installing npm dependencies ==="
echo "This will take 5-10 minutes..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: npm install failed!"
    exit 1
fi

echo ""
echo "=== Building ARM64 version ==="
echo "This will take 5-10 minutes..."
npm run build-linux-arm64
if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

echo ""
echo "=== Installing DEB package ==="
DEB_FILE=$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z "$DEB_FILE" ]; then
    echo "ERROR: DEB file not found!"
    ls -la dist/
    exit 1
fi
echo "Installing: $DEB_FILE"
sudo dpkg -i "$DEB_FILE"
sudo apt-get install -f -y

echo ""
echo "=== Build and installation complete! ==="
echo ""
echo "To run the app, type: matrix-stirling-engine"

