#!/bin/bash

# Script to build the Linux app on a remote Linux machine via SSH
# Copy this script to your Linux machine and run it

echo "=========================================="
echo "  Building Matrix Stirling Engine for Linux"
echo "=========================================="
echo ""

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found!"
    echo "Please make sure you're in the project directory, or clone the repo first:"
    echo "  git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git"
    echo "  cd stirling-engine-app"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Installing Node.js..."
    
    # Detect the Linux distribution
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        echo "Detected Debian/Ubuntu system"
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ -f /etc/redhat-release ]; then
        # RedHat/Fedora/CentOS
        echo "Detected RedHat/Fedora/CentOS system"
        sudo dnf install -y nodejs npm
    elif [ -f /etc/arch-release ]; then
        # Arch Linux
        echo "Detected Arch Linux system"
        sudo pacman -S --noconfirm nodejs npm
    else
        echo "Error: Cannot detect Linux distribution. Please install Node.js manually."
        exit 1
    fi
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Install build dependencies for DEB package (if needed)
if command -v dpkg &> /dev/null; then
    echo "Checking for build dependencies..."
    if ! command -v ar &> /dev/null; then
        echo "Installing binutils (required for DEB package)..."
        sudo apt-get update
        sudo apt-get install -y binutils
    fi
fi

# Build the Linux version
echo ""
echo "Building Linux packages..."
echo "This may take a few minutes..."
echo ""

npm run build-linux

echo ""
echo "=========================================="
if [ $? -eq 0 ]; then
    echo "✓ Build completed successfully!"
    echo ""
    echo "Your Linux packages are in the 'dist' folder:"
    echo "  - Matrix Stirling Engine-1.0.0.AppImage"
    echo "  - stirling-engine-monitor_1.0.0_amd64.deb"
    echo "  - stirling-engine-monitor-1.0.0.tar.gz"
else
    echo "✗ Build failed. Please check the error messages above."
    exit 1
fi
echo "=========================================="


