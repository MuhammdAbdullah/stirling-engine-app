# Simple script to build and install the app on Raspberry Pi (ARM64)
# This builds directly on the Pi to avoid cross-compilation issues
# Usage: .\build-and-install-on-pi.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-build"

Write-Host "=== Step 1: Checking if Node.js is installed on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js version
$nodeVersion = ssh "${remoteUser}@${remoteHost}" "node --version 2>/dev/null || echo 'NOT_INSTALLED'"

if ($nodeVersion -match "NOT_INSTALLED") {
    Write-Host "Node.js is not installed on the Raspberry Pi." -ForegroundColor Yellow
    Write-Host "Installing Node.js..." -ForegroundColor Cyan
    
    ssh "${remoteUser}@${remoteHost}" @"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
"@
    
    Write-Host "Node.js installation complete!" -ForegroundColor Green
} else {
    Write-Host "Node.js is installed: $nodeVersion" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Step 2: Creating build directory on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host ""

# Create directory and clean it if it exists
ssh "${remoteUser}@${remoteHost}" "rm -rf $remotePath && mkdir -p $remotePath"

Write-Host ""
Write-Host "=== Step 3: Copying source files to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "This may take a minute..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

# Copy all necessary files
scp "package.json" "${remoteUser}@${remoteHost}:$remotePath/"
scp "package-lock.json" "${remoteUser}@${remoteHost}:$remotePath/"
scp "main.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp "preload.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp "renderer.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp "index.html" "${remoteUser}@${remoteHost}:$remotePath/"
scp "styles.css" "${remoteUser}@${remoteHost}:$remotePath/"
scp "data-worker.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp "stirling-data-parser.js" "${remoteUser}@${remoteHost}:$remotePath/"

# Copy directories
scp -r "lib" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "assets" "${remoteUser}@${remoteHost}:$remotePath/"

Write-Host ""
Write-Host "=== Step 4: Installing dependencies on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "This will take several minutes (first time only)..." -ForegroundColor Yellow
Write-Host ""

# Install dependencies
ssh "${remoteUser}@${remoteHost}" @"
cd $remotePath
echo 'Installing npm dependencies...'
npm install
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 5: Building ARM64 version on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "This will take several minutes..." -ForegroundColor Yellow
Write-Host ""

# Build on Raspberry Pi
ssh "${remoteUser}@${remoteHost}" @"
cd $remotePath
echo 'Building ARM64 DEB package...'
npm run build-linux-arm64
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 6: Installing on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "You may be asked for your sudo password..." -ForegroundColor Yellow
Write-Host ""

# Install the built package
ssh "${remoteUser}@${remoteHost}" @"
cd $remotePath
DEB_FILE=\$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z \"\$DEB_FILE\" ]; then
    echo 'ERROR: DEB file not found!'
    ls -la dist/
    exit 1
fi
echo \"Installing: \$DEB_FILE\"
sudo dpkg -i \"\$DEB_FILE\"
sudo apt-get install -f -y
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Installation Complete! ===" -ForegroundColor Green
    Write-Host "The app is now installed on your Raspberry Pi." -ForegroundColor Green
    Write-Host ""
    Write-Host "To run it, SSH into the Pi and type:" -ForegroundColor Cyan
    Write-Host "  matrix-stirling-engine" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or search for 'Matrix Stirling Engine' in your applications menu." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "ERROR: Installation failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
}

