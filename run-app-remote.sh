#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

cd ~/stirling-engine-app/dist
chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"

# Try to run with DISPLAY set
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

# Run the app
./"Matrix Stirling Engine-1.0.0-arm64.AppImage" &

echo "App launched! Check your Ubuntu desktop for the application window."
echo "If you don't see it, you may need to run it directly on the Ubuntu machine."


