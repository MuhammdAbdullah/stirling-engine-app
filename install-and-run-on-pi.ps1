# Simple script to install and run Matrix Stirling Engine on Raspberry Pi
# This script connects to your Pi and installs/runs the app

# Your Pi connection details
$piUser = "abdullah"
$piHost = "192.168.1.96"
$piAddress = "$piUser@$piHost"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Installing Matrix Stirling Engine on Pi" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if we can connect to the Pi
Write-Host "Step 1: Testing connection to Pi..." -ForegroundColor Yellow
$testConnection = ssh -o ConnectTimeout=5 -o BatchMode=yes $piAddress "echo 'connected'" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Cannot connect to Pi at $piAddress" -ForegroundColor Red
    Write-Host "Please make sure:" -ForegroundColor Yellow
    Write-Host "  1. The Pi is turned on" -ForegroundColor Yellow
    Write-Host "  2. You're on the same network" -ForegroundColor Yellow
    Write-Host "  3. SSH is enabled on the Pi" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Try connecting manually first:" -ForegroundColor Yellow
    Write-Host "  ssh $piAddress" -ForegroundColor White
    exit 1
}

Write-Host "✓ Connected to Pi successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Install Node.js if needed
Write-Host "Step 2: Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = ssh $piAddress "node --version 2>/dev/null || echo 'not installed'"

if ($nodeVersion -match "not installed") {
    Write-Host "Node.js not found. Installing Node.js 18.x..." -ForegroundColor Yellow
    ssh $piAddress @"
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
"@
    Write-Host "✓ Node.js installed!" -ForegroundColor Green
} else {
    Write-Host "✓ Node.js already installed: $nodeVersion" -ForegroundColor Green
}
Write-Host ""

# Step 3: Clone or update the repository
Write-Host "Step 3: Setting up repository..." -ForegroundColor Yellow
ssh $piAddress @"
    if [ -d ~/stirling-engine-app ]; then
        echo 'Repository exists. Updating...'
        cd ~/stirling-engine-app
        git pull
    else
        echo 'Cloning repository...'
        cd ~
        git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
        cd stirling-engine-app
    fi
"@
Write-Host "✓ Repository ready!" -ForegroundColor Green
Write-Host ""

# Step 4: Install dependencies
Write-Host "Step 4: Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes. Please wait..." -ForegroundColor Yellow
ssh $piAddress @"
    cd ~/stirling-engine-app
    if [ ! -d node_modules ]; then
        npm install
    else
        echo 'Dependencies already installed. Skipping...'
    fi
"@
Write-Host "✓ Dependencies installed!" -ForegroundColor Green
Write-Host ""

# Step 5: Build the app
Write-Host "Step 5: Building the app..." -ForegroundColor Yellow
Write-Host "This may take a few minutes. Please wait..." -ForegroundColor Yellow
ssh $piAddress @"
    cd ~/stirling-engine-app
    bash build-raspberry-pi.sh
"@
Write-Host "✓ Build completed!" -ForegroundColor Green
Write-Host ""

# Step 6: Ask how to run
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "How would you like to run the app?" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Run on Pi's display (if Pi has monitor/keyboard)" -ForegroundColor White
Write-Host "  ssh $piAddress" -ForegroundColor Gray
Write-Host "  cd ~/stirling-engine-app" -ForegroundColor Gray
Write-Host "  npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Run the built AppImage on Pi's display" -ForegroundColor White
Write-Host "  ssh $piAddress" -ForegroundColor Gray
Write-Host "  cd ~/stirling-engine-app/dist" -ForegroundColor Gray
Write-Host "  chmod +x *.AppImage" -ForegroundColor Gray
Write-Host "  ./\"Matrix Stirling Engine-\"*.AppImage" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 3: Run now via SSH (requires X11 forwarding)" -ForegroundColor White
Write-Host "  This will try to run the app now..." -ForegroundColor Yellow
Write-Host ""

$runNow = Read-Host "Run the app now? (y/n)"

if ($runNow -eq "y" -or $runNow -eq "Y") {
    Write-Host ""
    Write-Host "Starting the app..." -ForegroundColor Yellow
    Write-Host "Note: If you see display errors, the Pi needs a monitor or VNC server." -ForegroundColor Yellow
    Write-Host ""
    
    # Try to run from source first (simpler)
    ssh -X $piAddress @"
        cd ~/stirling-engine-app
        export DISPLAY=:0
        npm start &
"@
    
    Write-Host ""
    Write-Host "App started! Check the Pi's display to see it running." -ForegroundColor Green
    Write-Host ""
    Write-Host "To stop the app, connect to Pi and run:" -ForegroundColor Yellow
    Write-Host "  pkill -f electron" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "To run the app later, connect to Pi:" -ForegroundColor Yellow
    Write-Host "  ssh $piAddress" -ForegroundColor White
    Write-Host "  cd ~/stirling-engine-app" -ForegroundColor White
    Write-Host "  npm start" -ForegroundColor White
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

