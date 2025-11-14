#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

# Close app
pkill -f "Matrix Stirling" || pkill -f stirling-engine-monitor || echo "No instances"
sleep 2

cd ~/stirling-engine-app

# Pull and rebuild
echo "Pulling latest fixes..."
git pull

echo "Rebuilding..."
npm run build-linux

echo ""
echo "Launching app..."
cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

./"Matrix Stirling Engine-1.0.0-arm64.AppImage" > /tmp/stirling-app.log 2>&1 &

echo "App launched!"
echo "Waiting 8 seconds for connection..."
sleep 8

echo ""
echo "Connection status:"
tail -10 /tmp/stirling-app.log | grep -i "connected\|online" || echo "Check logs below"
echo ""
echo "Recent logs:"
tail -15 /tmp/stirling-app.log

echo ""
echo "✓ App should now show 'SYSTEM ONLINE' in the UI banner if hardware is connected."









