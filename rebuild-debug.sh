#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f "Matrix Stirling" || echo "No instances"
sleep 2

cd ~/stirling-engine-app

echo "Pulling latest fixes..."
git pull

echo "Rebuilding with debugging enabled..."
npm run build-linux

cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

echo "Launching app with DevTools enabled..."
./"Matrix Stirling Engine-1.0.0-arm64.AppImage" > /tmp/stirling-app.log 2>&1 &

echo "App launched!"
echo "DevTools should be open - check the Console tab for debug messages."
echo "Look for messages starting with [UI] to see connection status updates."
echo ""
echo "Waiting 5 seconds..."
sleep 5

echo ""
echo "Connection status from logs:"
tail -10 /tmp/stirling-app.log | grep -i "connected\|status" || tail -5 /tmp/stirling-app.log







