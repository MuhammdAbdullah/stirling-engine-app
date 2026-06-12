# Simple script to update app on Pi with password automation
# Run this from Windows PowerShell: .\update-pi-with-password.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-build"
$remotePassword = "@Matrix123"

Write-Host "=== Step 1: Preparing updated files ===" -ForegroundColor Cyan
Write-Host ""

# Create temp directory with updated files
$tempDir = "temp-build-update"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying updated files..." -ForegroundColor Yellow

# Copy only the files that changed
Copy-Item "index.html" "$tempDir/" -ErrorAction SilentlyContinue
Copy-Item "renderer.js" "$tempDir/" -ErrorAction SilentlyContinue
Copy-Item "styles.css" "$tempDir/" -ErrorAction SilentlyContinue
Copy-Item "package.json" "$tempDir/" -ErrorAction SilentlyContinue
Copy-Item "main.js" "$tempDir/" -ErrorAction SilentlyContinue
Copy-Item "preload.js" "$tempDir/" -ErrorAction SilentlyContinue

# Create zip archive
$archiveName = "app-update.zip"
Write-Host "Creating update archive..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $archiveName -Force

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

Write-Host "✓ Update archive created!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 2: Copying files to Pi ===" -ForegroundColor Cyan
Write-Host ""

# Create a simple batch file to handle password
$batchFile = "scp-with-password.bat"
$batchContent = @"
@echo off
echo %password% | scp app-update.zip %user%@%host%:~/
"@

# Try using sshpass-style approach with echo
Write-Host "Copying archive to Pi..." -ForegroundColor Yellow
$env:SSH_ASKPASS_REQUIRE = "never"
echo $remotePassword | scp $archiveName "${remoteUser}@${remoteHost}:~/"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "SCP requires password entry. Please run manually:" -ForegroundColor Yellow
    Write-Host "  scp $archiveName ${remoteUser}@${remoteHost}:~/" -ForegroundColor White
    Write-Host "  Password: $remotePassword" -ForegroundColor White
    Write-Host ""
    Write-Host "Then SSH to Pi and run:" -ForegroundColor Yellow
    Write-Host "  cd $remotePath" -ForegroundColor White
    Write-Host "  unzip -o ~/app-update.zip" -ForegroundColor White
    Write-Host "  npm run build-linux-arm64" -ForegroundColor White
    Write-Host "  sudo dpkg -i dist/*arm64*.deb" -ForegroundColor White
    exit 1
}

Write-Host "✓ Files copied!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 3: Creating update script on Pi ===" -ForegroundColor Cyan
Write-Host ""

# Create bash script
$bashScript = @"
#!/bin/bash
cd $remotePath

echo 'Extracting updated files...'
unzip -q -o ~/app-update.zip
rm ~/app-update.zip

echo ''
echo 'Rebuilding ARM64 version...'
npm run build-linux-arm64

if [ `$? -ne 0 ]; then
    echo 'ERROR: Build failed!'
    exit 1
fi

echo ''
echo 'Removing old package...'
sudo dpkg -r stirling-engine-monitor 2>/dev/null || true

echo ''
echo 'Installing new package...'
DEB_FILE=`$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z "`$DEB_FILE" ]; then
    echo 'ERROR: DEB file not found!'
    exit 1
fi
sudo dpkg -i "`$DEB_FILE"
sudo apt-get install -f -y

echo ''
echo 'Fixing sandbox permissions...'
if [ -f /opt/stirling-engine/chrome-sandbox ]; then
    sudo chown root:root /opt/stirling-engine/chrome-sandbox
    sudo chmod 4755 /opt/stirling-engine/chrome-sandbox
fi

echo ''
echo '=== Update complete! ==='
"@

$tempScript = "temp-update-script.sh"
$bashScript | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host "Copying update script..." -ForegroundColor Yellow
echo $remotePassword | scp $tempScript "${remoteUser}@${remoteHost}:~/update-script.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy script!" -ForegroundColor Red
    Write-Host "Please copy manually and run on Pi" -ForegroundColor Yellow
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✓ Script copied!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 4: Running update on Pi ===" -ForegroundColor Cyan
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

# Run the script
Write-Host "Executing update script..." -ForegroundColor Yellow
echo $remotePassword | ssh "${remoteUser}@${remoteHost}" "bash ~/update-script.sh && rm ~/update-script.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "The app has been updated on your Raspberry Pi." -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the updated app:" -ForegroundColor Cyan
    Write-Host "  ssh ${remoteUser}@${remoteHost}" -ForegroundColor White
    Write-Host "  matrix-stirling-engine" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Update failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
}

# Cleanup
Remove-Item $tempScript -ErrorAction SilentlyContinue
Remove-Item $archiveName -ErrorAction SilentlyContinue








