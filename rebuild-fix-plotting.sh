#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

pkill -f stirling-engine || echo "No instances"
sleep 3

cd ~/stirling-engine-app

echo "Pulling data plotting fixes..."
git pull

echo "Rebuilding..."
npm run build-linux

# Reinstall the updated app
echo "Reinstalling updated app..."
cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"

# Install to system
INSTALL_DIR="$HOME/.local/share/matrix-stirling-engine"
BIN_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR" "$BIN_DIR"

cp "Matrix Stirling Engine-1.0.0-arm64.AppImage" "$INSTALL_DIR/stirling-engine.AppImage"
chmod +x "$INSTALL_DIR/stirling-engine.AppImage"

ln -sf "$INSTALL_DIR/stirling-engine.AppImage" "$BIN_DIR/stirling-engine"
ln -sf "$INSTALL_DIR/stirling-engine.AppImage" "$BIN_DIR/matrix-stirling-engine"

echo "Installation complete!"
echo ""
echo "Launching app to test..."
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority
export PATH="$HOME/.local/bin:$PATH"

stirling-engine > /tmp/stirling-app.log 2>&1 &

echo "App launched!"
echo "Waiting 10 seconds for data..."
sleep 10

echo ""
echo "Checking data flow:"
echo "Worker status:"
grep -i "worker\|WORKER" /tmp/stirling-app.log | tail -3

echo ""
echo "Data forwarding:"
grep -i "Forwarded\|Received\|Processed" /tmp/stirling-app.log | tail -5

echo ""
echo "✓ App rebuilt and relaunched"
echo "Check DevTools console for '[UI]' messages about data processing"







