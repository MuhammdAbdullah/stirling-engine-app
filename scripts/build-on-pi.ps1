# Simple script to build and install the app directly on Raspberry Pi
# This avoids cross-compilation issues by building on the Pi itself
# Usage: .\build-on-pi.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-build"

Write-Host "=== Step 1: Creating build directory on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

# Create directory on Pi
ssh "${remoteUser}@${remoteHost}" "mkdir -p $remotePath"

Write-Host ""
Write-Host "=== Step 2: Copying source files to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "This may take a minute..." -ForegroundColor Yellow
Write-Host ""

# Copy all necessary files (excluding node_modules and dist)
scp -r "package.json" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "package-lock.json" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "main.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "preload.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "renderer.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "index.html" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "styles.css" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "data-worker.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "stirling-data-parser.js" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "lib" "${remoteUser}@${remoteHost}:$remotePath/"
scp -r "assets" "${remoteUser}@${remoteHost}:$remotePath/"

Write-Host ""
Write-Host "=== Step 3: Building on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "This will take several minutes..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

# Build on Raspberry Pi
ssh "${remoteUser}@${remoteHost}" @"
cd $remotePath
if [ ! -d node_modules ]; then
    echo 'Installing dependencies...'
    npm install
fi
echo 'Building ARM64 version...'
npm run build-linux-arm64
"@

Write-Host ""
Write-Host "=== Step 4: Installing on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host ""

# Install the built package
ssh "${remoteUser}@${remoteHost}" @"
cd $remotePath
DEB_FILE=\$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z \"\$DEB_FILE\" ]; then
    echo 'ERROR: DEB file not found!'
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
} else {
    Write-Host ""
    Write-Host "ERROR: Installation failed!" -ForegroundColor Red
}



