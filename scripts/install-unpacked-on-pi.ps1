# Simple script to install the unpacked Linux version on Raspberry Pi
# This copies the linux-unpacked folder and creates a launcher
# Usage: .\install-unpacked-on-pi.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remoteAppPath = "~/stirling-engine-monitor"

Write-Host "=== Step 1: Copying unpacked Linux app to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "This may take a few minutes (the app is large)..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

# Check if linux-unpacked exists
if (-not (Test-Path "dist\linux-unpacked")) {
    Write-Host "ERROR: dist\linux-unpacked folder not found!" -ForegroundColor Red
    Write-Host "Please build the Linux version first with: npm run build-linux" -ForegroundColor Yellow
    exit 1
}

# Copy the entire linux-unpacked folder
scp -r "dist\linux-unpacked\*" "${remoteUser}@${remoteHost}:$remoteAppPath/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Copy failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 2: Creating launcher script on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host ""

# Create a simple launcher script
ssh "${remoteUser}@${remoteHost}" @"
mkdir -p ~/bin
cat > ~/bin/stirling-engine << 'EOF'
#!/bin/bash
cd ~/stirling-engine-monitor
./stirling-engine-monitor
EOF
chmod +x ~/bin/stirling-engine

# Add ~/bin to PATH if not already there
if ! echo \$PATH | grep -q ~/bin; then
    echo 'export PATH=\$PATH:~/bin' >> ~/.bashrc
    export PATH=\$PATH:~/bin
fi

echo 'Launcher script created!'
"@

Write-Host ""
Write-Host "=== Step 3: Installing required dependencies ===" -ForegroundColor Cyan
Write-Host "You may be asked for your sudo password..." -ForegroundColor Yellow
Write-Host ""

# Install dependencies that might be needed
ssh "${remoteUser}@${remoteHost}" "sudo apt-get update && sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2"

Write-Host ""
Write-Host "=== Installation Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "To run the app, SSH into the Pi and type:" -ForegroundColor Cyan
Write-Host "  stirling-engine" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or run it directly:" -ForegroundColor Cyan
Write-Host "  cd ~/stirling-engine-monitor && ./stirling-engine-monitor" -ForegroundColor Yellow



