#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

cd ~/stirling-engine-app

git pull
npm run build-linux

cd dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"

# Reinstall
cp "Matrix Stirling Engine-1.0.0-arm64.AppImage" ~/.local/share/matrix-stirling-engine/stirling-engine.AppImage
chmod +x ~/.local/share/matrix-stirling-engine/stirling-engine.AppImage

echo "✓ App rebuilt and reinstalled"
echo ""
echo "To run the app:"
echo "  stirling-engine"
echo ""
echo "Or check DevTools console for data flow messages:"
echo "  - [UI] Received X packet(s)"
echo "  - [UI] Processed X PV packet(s) in batch"
echo "  - [UI] Processed batch of X packet(s)"









