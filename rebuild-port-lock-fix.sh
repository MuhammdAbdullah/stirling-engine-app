#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

echo "Stopping app..."
pkill -f "Matrix Stirling" || echo "No instances"
sleep 3

# Remove any lock files
echo "Cleaning up lock files..."
sudo rm -f /var/lock/LCK..ttyACM* 2>/dev/null
sudo rm -f /tmp/LCK..ttyACM* 2>/dev/null

cd ~/stirling-engine-app

echo "Pulling port lock fixes..."
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
echo "Waiting 15 seconds for connection..."
sleep 15

echo ""
echo "Connection status:"
grep -i "Connected to\|Open failed\|lock\|Sending connection-status.*connected.*true" /tmp/stirling-app.log | tail -10

echo ""
echo "✓ App should now connect without port lock errors."
echo "Check DevTools console for connection status."









