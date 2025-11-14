#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

# Stop any existing instances
pkill -f stirling-engine 2>/dev/null
sleep 2

cd ~/stirling-engine-app

echo "Pulling latest fixes..."
git pull

echo "Rebuilding app..."
npm run build-linux

cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"

# Reinstall
echo "Reinstalling app..."
cp "Matrix Stirling Engine-1.0.0-arm64.AppImage" ~/.local/share/matrix-stirling-engine/stirling-engine.AppImage
chmod +x ~/.local/share/matrix-stirling-engine/stirling-engine.AppImage

echo "Launching app..."
export PATH="$HOME/.local/bin:$PATH"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

stirling-engine > /tmp/stirling-app.log 2>&1 &

sleep 3

echo ""
echo "✓ App rebuilt and launched!"
echo ""
echo "The app should now:"
echo "  - Plot graphs when data is received"
echo "  - Update charts at 20 FPS"
echo "  - Have a clean console (no debug spam)"
echo ""
echo "Check the app window to see if graphs are plotting."









