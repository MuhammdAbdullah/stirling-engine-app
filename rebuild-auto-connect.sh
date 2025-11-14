#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f "Matrix Stirling" || echo "No instances"
sleep 3

cd ~/stirling-engine-app

echo "Pulling latest auto-connect fixes..."
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
echo "Waiting 10 seconds for connection and UI updates..."
sleep 10

echo ""
echo "Connection status:"
grep -i "Sending connection-status\|Connected to\|Window finished loading" /tmp/stirling-app.log | tail -5

echo ""
echo "✓ App should now automatically detect and connect to hardware."
echo "✓ Status banner should show 'SYSTEM ONLINE' when connected."
echo ""
echo "Check DevTools console for [UI] messages showing connection status updates."









