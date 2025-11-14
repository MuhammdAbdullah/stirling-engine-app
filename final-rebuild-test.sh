#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f "Matrix Stirling" || echo "No instances"
sleep 3

cd ~/stirling-engine-app

git pull
npm run build-linux

cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

echo "Launching app..."
./"Matrix Stirling Engine-1.0.0-arm64.AppImage" > /tmp/stirling-app.log 2>&1 &

echo "Waiting 10 seconds for connection and UI to update..."
sleep 10

echo ""
echo "Checking connection status messages:"
grep -i "Sending connection-status\|Connected to" /tmp/stirling-app.log | tail -5

echo ""
echo "✓ App is running. Check your Ubuntu desktop:"
echo "  1. DevTools should be open (Console tab)"
echo "  2. Look for [UI] messages in the console"
echo "  3. The banner should show 'SYSTEM ONLINE' if connected"









