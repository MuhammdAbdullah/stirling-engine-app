#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f "Matrix Stirling" || echo "No instances"
sleep 3

cd ~/stirling-engine-app

echo "Pulling UI initialization fixes..."
git pull

echo "Rebuilding..."
npm run build-linux

cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

echo "Launching app..."
./"Matrix Stirling Engine-1.0.0-arm64.AppImage" > /tmp/stirling-app.log 2>&1 &

echo "App launched!"
echo "Waiting 10 seconds for initialization..."
sleep 10

echo ""
echo "✓ App should now be responsive."
echo "Check that:"
echo "  1. Buttons are clickable"
echo "  2. Admin button works"
echo "  3. Status banner shows connection status"
echo ""
echo "If still frozen, check DevTools console for errors."







