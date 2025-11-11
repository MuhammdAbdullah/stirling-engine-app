#!/bin/bash

# Installation script for Matrix Stirling Engine AppImage on Linux
# This installs the app to system directories so it can be run from anywhere

set -e

echo "=== Matrix Stirling Engine Installation ==="
echo ""

# Check if running as root for system-wide install
if [ "$EUID" -eq 0 ]; then
    INSTALL_DIR="/opt/matrix-stirling-engine"
    BIN_DIR="/usr/local/bin"
    DESKTOP_DIR="/usr/share/applications"
    ICON_DIR="/usr/share/pixmaps"
    SYSTEM_WIDE=true
else
    INSTALL_DIR="$HOME/.local/share/matrix-stirling-engine"
    BIN_DIR="$HOME/.local/bin"
    DESKTOP_DIR="$HOME/.local/share/applications"
    ICON_DIR="$HOME/.local/share/pixmaps"
    SYSTEM_WIDE=false
fi

# Find the AppImage
APPIMAGE=""
if [ -f "dist/Matrix Stirling Engine-1.0.0-arm64.AppImage" ]; then
    APPIMAGE="dist/Matrix Stirling Engine-1.0.0-arm64.AppImage"
elif [ -f "Matrix Stirling Engine-1.0.0-arm64.AppImage" ]; then
    APPIMAGE="Matrix Stirling Engine-1.0.0-arm64.AppImage"
else
    echo "Error: AppImage not found!"
    echo "Please run this script from the project directory or where the AppImage is located."
    exit 1
fi

echo "Found AppImage: $APPIMAGE"
echo "Install directory: $INSTALL_DIR"
echo "Bin directory: $BIN_DIR"
echo ""

# Create directories
echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# Copy AppImage
echo "Copying AppImage..."
cp "$APPIMAGE" "$INSTALL_DIR/stirling-engine.AppImage"
chmod +x "$INSTALL_DIR/stirling-engine.AppImage"

# Extract icon if needed (AppImage can be mounted to extract icon)
echo "Setting up icon..."
ICON_PATH="$ICON_DIR/stirling-engine.png"
if [ -f "assets/android-chrome-512x512.png" ]; then
    cp "assets/android-chrome-512x512.png" "$ICON_PATH"
    # Resize to 256x256 for better compatibility
    if command -v convert &> /dev/null; then
        convert "assets/android-chrome-512x512.png" -resize 256x256 "$ICON_PATH"
    fi
elif [ -f "$HOME/stirling-engine-app/assets/android-chrome-512x512.png" ]; then
    cp "$HOME/stirling-engine-app/assets/android-chrome-512x512.png" "$ICON_PATH"
    if command -v convert &> /dev/null; then
        convert "$HOME/stirling-engine-app/assets/android-chrome-512x512.png" -resize 256x256 "$ICON_PATH"
    fi
else
    echo "Warning: Icon not found, using default..."
fi

# Create symlink in bin directory
echo "Creating symlink..."
ln -sf "$INSTALL_DIR/stirling-engine.AppImage" "$BIN_DIR/stirling-engine"
ln -sf "$INSTALL_DIR/stirling-engine.AppImage" "$BIN_DIR/matrix-stirling-engine"

# Create desktop entry
echo "Creating desktop entry..."
cat > "$DESKTOP_DIR/matrix-stirling-engine.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Matrix Stirling Engine
Comment=Monitor Stirling Engine temperature data with Chart.js
Exec=$INSTALL_DIR/stirling-engine.AppImage
Icon=$ICON_PATH
Terminal=false
Categories=Science;Engineering;Utility;
StartupNotify=true
EOF

chmod +x "$DESKTOP_DIR/matrix-stirling-engine.desktop"

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    echo "Updating desktop database..."
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "The app has been installed and can be run from anywhere using:"
echo "  stirling-engine"
echo "  matrix-stirling-engine"
echo ""
echo "Or find it in your applications menu as 'Matrix Stirling Engine'"
echo ""

# Add to PATH if not already there (for user install)
if [ "$SYSTEM_WIDE" = false ]; then
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo "Note: Add ~/.local/bin to your PATH if it's not already there:"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
        echo "  (Add this to your ~/.bashrc or ~/.profile to make it permanent)"
        echo ""
    fi
fi

echo "Installation location: $INSTALL_DIR"
echo ""







