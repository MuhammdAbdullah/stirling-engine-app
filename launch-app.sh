#!/bin/bash

export PATH="$HOME/.local/bin:$PATH"
export DISPLAY=:0.0
export XAUTHORITY=/home/abdullah/.Xauthority

# Stop any existing instances
pkill -f stirling-engine 2>/dev/null
sleep 2

# Launch the app
echo "Launching Matrix Stirling Engine..."
stirling-engine > /tmp/stirling-app.log 2>&1 &

sleep 3

echo "App launched!"
echo ""
echo "Check logs with: tail -f /tmp/stirling-app.log"
echo "Or check DevTools console in the app for data flow messages"







