#!/bin/bash

# Simple script to build the Electron app for Linux
# This script should be run on a Linux machine or in WSL

echo "Building Linux version of Stirling Engine Monitor..."
echo ""

# Make sure we have Node.js and npm
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the Linux version
echo "Building Linux AppImage, DEB, and TAR.GZ packages..."
npm run build-linux

echo ""
echo "Build complete! Check the 'dist' folder for your Linux packages."
echo "You should find:"
echo "  - Matrix Stirling Engine-x.x.x.AppImage (run directly)"
echo "  - Matrix Stirling Engine-x.x.x.deb (install with: sudo dpkg -i ...)"
echo "  - Matrix Stirling Engine-x.x.x.tar.gz (extract and run)"


