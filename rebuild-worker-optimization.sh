#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f "Matrix Stirling" || echo "No instances"
sleep 3

cd ~/stirling-engine-app

echo "Pulling worker thread optimization..."
git pull

echo "Rebuilding with worker thread optimization..."
npm run build-linux

cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

echo "Launching app with worker thread optimization..."
./"Matrix Stirling Engine-1.0.0-arm64.AppImage" > /tmp/stirling-app.log 2>&1 &

echo "App launched!"
echo "Waiting 10 seconds..."
sleep 10

echo ""
echo "Checking worker thread status:"
grep -i "worker\|WORKER" /tmp/stirling-app.log | tail -5

echo ""
echo "✓ App should now process data faster with worker thread."
echo "✓ Data parsing runs on separate CPU core."
echo "✓ UI should be more responsive with less lag."









