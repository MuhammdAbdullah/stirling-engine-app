# Simple script to build ARM64 version and install on Raspberry Pi
# Usage: .\build-and-install-arm64.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"

Write-Host "=== Step 1: Building ARM64 version of the app ===" -ForegroundColor Cyan
Write-Host "This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""

# Build the ARM64 version
npm run build-linux-arm64

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 2: Finding the ARM64 DEB package ===" -ForegroundColor Cyan

# Find the ARM64 DEB file
$debFile = Get-ChildItem "dist\*arm64*.deb" | Select-Object -First 1

if (-not $debFile) {
    Write-Host "ERROR: ARM64 DEB file not found in dist folder!" -ForegroundColor Red
    Write-Host "Looking for files matching *arm64*.deb..." -ForegroundColor Yellow
    Get-ChildItem "dist\*.deb" | Select-Object Name
    exit 1
}

Write-Host "Found: $($debFile.Name)" -ForegroundColor Green
$fileSize = [math]::Round($debFile.Length / 1MB, 2)
Write-Host "Size: $fileSize MB" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== Step 3: Copying DEB package to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

# Copy to Raspberry Pi
scp "$($debFile.FullName)" "${remoteUser}@${remoteHost}:~/stirling-engine-monitor-arm64.deb"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Copy failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 4: Installing on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "You will be asked for your SSH password again..." -ForegroundColor Yellow
Write-Host ""

# Install on Raspberry Pi
ssh "${remoteUser}@${remoteHost}" "sudo dpkg -i ~/stirling-engine-monitor-arm64.deb && sudo apt-get install -f -y"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Installation Complete! ===" -ForegroundColor Green
    Write-Host "The app should now be installed on your Raspberry Pi." -ForegroundColor Green
    Write-Host ""
    Write-Host "To run it, SSH into the Pi and type:" -ForegroundColor Cyan
    Write-Host "  matrix-stirling-engine" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "ERROR: Installation failed!" -ForegroundColor Red
    Write-Host "You may need to install dependencies manually." -ForegroundColor Yellow
}

