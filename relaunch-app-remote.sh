#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Close any running instances
echo "Closing any running instances..."
pkill -f "Matrix Stirling" || pkill -f stirling-engine-monitor || echo "No running instances found"
sleep 2

# Wait for build to complete if needed
cd ~/stirling-engine-app/dist

# Check if the AppImage exists and is executable
if [ -f "Matrix Stirling Engine-1.0.0-arm64.AppImage" ]; then
    chmod +x "Matrix Stirling Engine-1.0.0-arm64.AppImage"
    
    # Set display for GUI
    export DISPLAY=:0.0
    export XAUTHORITY=/home/abdullah/.Xauthority
    
    # Launch the app
    echo "Launching the app..."
    ./"Matrix Stirling Engine-1.0.0-arm64.AppImage" &
    
    echo "App launched! Check your Ubuntu desktop."
else
    echo "AppImage not found. Please rebuild first."
fi


