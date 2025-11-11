#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use 16

# Close any running instances
echo "Closing any running instances..."
pkill -f "Matrix Stirling" || pkill -f stirling-engine-monitor || echo "No running instances found"
sleep 2

cd ~/stirling-engine-app

# Pull latest changes
echo "Pulling latest fixes..."
git pull

# Rebuild
echo "Rebuilding app with error handling fixes..."
npm run build-linux

# Wait a moment for build to complete
sleep 2

# Launch the new version
cd dist
if [ -f "Matrix Stirling Engine-1.0.0-arm64.AppImage" ]; then
    chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
    export DISPLAY=:0.0
    export XAUTHORITY=/home/abdullah/.Xauthority
    
    echo "Launching fixed app..."
    ./"Matrix Stirling Engine-1.0.0-arm64.AppImage" &
    
    echo "App launched with error handling fixes!"
    echo "The JavaScript error dialog should no longer appear."
else
    echo "AppImage not found. Build may have failed."
fi


