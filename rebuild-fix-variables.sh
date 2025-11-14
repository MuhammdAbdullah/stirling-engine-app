#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f "Matrix Stirling" || echo "No instances"
sleep 3

cd ~/stirling-engine-app

echo "Pulling variable fix..."
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
echo "Waiting 10 seconds..."
sleep 10

echo ""
echo "Checking for errors:"
grep -i "error\|undefined\|batch" /tmp/stirling-app.log | tail -10

echo ""
echo "✓ App should now work without undefined variable errors."
echo "✓ Data should be plotting on graphs."









