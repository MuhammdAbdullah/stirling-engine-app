#!/bin/bash
# Diagnostic script to check build status on Raspberry Pi
# Run this on the Pi: bash check-build-status.sh

echo "=== Checking Build Status ==="
echo ""

# Check if build directory exists
if [ -d ~/stirling-engine-build ]; then
    echo "✓ Build directory exists"
    cd ~/stirling-engine-build
    
    # Check if files were extracted
    if [ -f package.json ]; then
        echo "✓ Source files extracted"
        
        # Check Node.js
        if command -v node &> /dev/null; then
            echo "✓ Node.js installed: $(node --version)"
        else
            echo "✗ Node.js not installed"
        fi
        
        # Check if node_modules exists
        if [ -d node_modules ]; then
            echo "✓ Dependencies installed"
        else
            echo "✗ Dependencies not installed"
        fi
        
        # Check if dist folder exists
        if [ -d dist ]; then
            echo "✓ Build output directory exists"
            DEB_FILE=$(ls dist/*arm64*.deb 2>/dev/null | head -1)
            if [ -n "$DEB_FILE" ]; then
                echo "✓ DEB package found: $DEB_FILE"
            else
                echo "✗ DEB package not found"
                echo "Files in dist/:"
                ls -la dist/ 2>/dev/null || echo "dist/ directory is empty or doesn't exist"
            fi
        else
            echo "✗ Build output directory doesn't exist"
        fi
    else
        echo "✗ Source files not extracted properly"
    fi
else
    echo "✗ Build directory doesn't exist"
fi

echo ""
echo "=== Checking if app is installed ==="
if command -v matrix-stirling-engine &> /dev/null; then
    echo "✓ App is installed"
    which matrix-stirling-engine
else
    echo "✗ App is not installed"
fi

echo ""
echo "=== Current directory contents ==="
ls -la ~/stirling-engine-build 2>/dev/null || echo "Build directory doesn't exist"

