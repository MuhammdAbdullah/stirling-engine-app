#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f "Matrix Stirling" || echo "No instances"
sleep 2

cd ~/stirling-engine-app

echo "Pulling Chart.js fixes..."
git pull

echo "Rebuilding with Chart.js fixes..."
npm run build-linux

cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

echo "Launching app..."
./"Matrix Stirling Engine-1.0.0-arm64.AppImage" > /tmp/stirling-app.log 2>&1 &

echo "App launched!"
echo "Waiting 5 seconds..."
sleep 5

echo ""
echo "✓ App should now work without Chart.js errors."
echo "Check the DevTools console - you should see:"
echo "  'Chart.js is available, loading renderer...'"
echo "  'Chart.js loaded successfully'"









