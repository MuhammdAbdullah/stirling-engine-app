# Simple script to build and install on Raspberry Pi using a single SSH session
# Usage: .\build-on-pi-simple.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-build"

Write-Host "=== Step 1: Creating source archive ===" -ForegroundColor Cyan
Write-Host ""

# Create a temporary directory with only the files we need
$tempDir = "temp-build-files"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy necessary files
Copy-Item "package.json" "$tempDir/"
Copy-Item "package-lock.json" "$tempDir/"
Copy-Item "main.js" "$tempDir/"
Copy-Item "preload.js" "$tempDir/"
Copy-Item "renderer.js" "$tempDir/"
Copy-Item "index.html" "$tempDir/"
Copy-Item "styles.css" "$tempDir/"
Copy-Item "data-worker.js" "$tempDir/"
Copy-Item "stirling-data-parser.js" "$tempDir/"
Copy-Item -Recurse "lib" "$tempDir/"
Copy-Item -Recurse "assets" "$tempDir/"

# Create zip archive
$archiveName = "stirling-source.zip"
Write-Host "Creating archive: $archiveName" -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $archiveName -Force

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

Write-Host "Archive created!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 2: Copying archive to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host "This may take a minute..." -ForegroundColor Yellow
Write-Host ""

# Copy archive to Pi
scp $archiveName "${remoteUser}@${remoteHost}:~/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy archive!" -ForegroundColor Red
    Remove-Item $archiveName -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Archive copied successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 3: Building and installing on Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "This will take 10-20 minutes..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

# Run everything in one SSH session
ssh "${remoteUser}@${remoteHost}" @"
set -e

echo '=== Extracting source files ==='
rm -rf $remotePath
mkdir -p $remotePath
cd $remotePath
unzip -q ~/stirling-source.zip
rm ~/stirling-source.zip

echo ''
echo '=== Checking Node.js ==='
if ! command -v node &> /dev/null; then
    echo 'Installing Node.js...'
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo \"Node.js version: \$(node --version)\"
fi

echo ''
echo '=== Installing npm dependencies ==='
echo 'This will take several minutes...'
npm install

echo ''
echo '=== Building ARM64 version ==='
echo 'This will take several minutes...'
npm run build-linux-arm64

echo ''
echo '=== Installing DEB package ==='
DEB_FILE=\$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z \"\$DEB_FILE\" ]; then
    echo 'ERROR: DEB file not found!'
    ls -la dist/
    exit 1
fi
echo \"Installing: \$DEB_FILE\"
sudo dpkg -i \"\$DEB_FILE\"
sudo apt-get install -f -y

echo ''
echo '=== Build and installation complete! ==='
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "The app is now installed on your Raspberry Pi." -ForegroundColor Green
    Write-Host ""
    Write-Host "To run it, SSH into the Pi and type:" -ForegroundColor Cyan
    Write-Host "  matrix-stirling-engine" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or search for 'Matrix Stirling Engine' in your applications menu." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "ERROR: Build or installation failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
}

# Clean up local archive
Remove-Item $archiveName -ErrorAction SilentlyContinue

