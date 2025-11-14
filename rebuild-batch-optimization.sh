#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f "Matrix Stirling" || echo "No instances"
sleep 3

cd ~/stirling-engine-app

echo "Pulling batch optimization updates..."
git pull

echo "Rebuilding with aggressive batching..."
npm run build-linux

cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

echo "Launching optimized app..."
./"Matrix Stirling Engine-1.0.0-arm64.AppImage" > /tmp/stirling-app.log 2>&1 &

echo "App launched!"
echo "Waiting 10 seconds..."
sleep 10

echo ""
echo "✓ Optimizations applied:"
echo "  - Data packets batched every 100ms (10 updates/sec)"
echo "  - Chart updates throttled to 10 FPS"
echo "  - Reduced memory usage (500 points max, 30 data points)"
echo "  - Work calculation throttled to 500ms"
echo ""
echo "Lag should be significantly reduced!"









