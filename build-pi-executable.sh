#!/bin/bash

# Simple script to build Raspberry Pi ARM64 executable
# Run this script ON your Raspberry Pi

echo "=========================================="
echo "  Building Matrix Stirling Engine for Raspberry Pi ARM64"
echo "=========================================="
echo ""

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found!"
    echo "Please make sure you're in the project directory."
    exit 1
fi

# Check architecture
ARCH=$(uname -m)
echo "Detected architecture: $ARCH"

if [ "$ARCH" != "aarch64" ] && [ "$ARCH" != "arm64" ]; then
    echo "Warning: This script is designed for ARM64 (aarch64) Raspberry Pi"
    echo "Your architecture is: $ARCH"
    echo "Continuing anyway..."
fi

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Install build tools if needed
if ! command -v g++ &> /dev/null; then
    echo "Build tools not found. Installing build-essential..."
    sudo apt-get update
    sudo apt-get install -y build-essential python3
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Rebuild serialport for ARM64
echo ""
echo "Rebuilding serialport library for ARM64..."
npm rebuild serialport

# Build the app for ARM64
echo ""
echo "Building app for ARM64..."
npm run build-linux-arm64

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ Build completed successfully!"
    echo ""
    echo "Your Raspberry Pi executable is in the 'dist' folder:"
    echo ""
    ls -lh dist/*.AppImage dist/*.deb dist/*.tar.gz 2>/dev/null || ls -lh dist/
    echo ""
    echo "To run the AppImage:"
    echo "  cd dist"
    echo "  chmod +x \"Matrix Stirling Engine-\"*.AppImage"
    echo "  ./\"Matrix Stirling Engine-\"*.AppImage"
    echo ""
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "✗ Build failed. Please check the error messages above."
    echo "=========================================="
    exit 1
fi

