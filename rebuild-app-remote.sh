#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

cd ~/stirling-engine-app

# Pull latest changes
git pull

# Rebuild
npm run build-linux

echo ""
echo "Rebuild complete! Run the app with:"
echo "cd ~/stirling-engine-app/dist"
echo "./\"Matrix Stirling Engine-1.0.0-arm64.AppImage\""


