#!/bin/bash

# Script to build the app specifically for Raspberry Pi
# This script should be run ON a Raspberry Pi or on a Linux machine with ARM cross-compilation support

echo "=========================================="
echo "  Building Matrix Stirling Engine for Raspberry Pi"
echo "=========================================="
echo ""

# Detect Raspberry Pi architecture
ARCH=$(uname -m)
echo "Detected architecture: $ARCH"

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found!"
    echo "Please make sure you're in the project directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js..."
    
    # For Raspberry Pi OS (Debian-based)
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Determine which ARM architecture to build for
if [ "$ARCH" == "aarch64" ] || [ "$ARCH" == "arm64" ]; then
    echo "Building for ARM64 (Raspberry Pi 3, 4, 5)..."
    npm run build-linux-arm64
elif [ "$ARCH" == "armv7l" ] || [ "$ARCH" == "armhf" ]; then
    echo "Building for ARMv7 (Raspberry Pi 1, 2, Zero)..."
    npm run build-linux-armv7l
else
    echo "Warning: Unknown architecture. Building for ARM64 by default..."
    npm run build-linux-arm64
fi

echo ""
echo "=========================================="
if [ $? -eq 0 ]; then
    echo "✓ Build completed successfully!"
    echo ""
    echo "Your Raspberry Pi packages are in the 'dist' folder:"
    ls -lh dist/*.AppImage dist/*.deb dist/*.tar.gz 2>/dev/null || ls -lh dist/
else
    echo "✗ Build failed. Please check the error messages above."
    exit 1
fi
echo "=========================================="

