# Simple script to update app on Pi
# Run: .\update-pi-simple.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-build"
$remotePassword = "@Matrix123"

Write-Host "=== Preparing Update Package ===" -ForegroundColor Cyan

# Create update package
$tempDir = "temp-update"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy updated files
$files = @("index.html", "renderer.js", "styles.css", "package.json", "main.js", "preload.js")
foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file "$tempDir/"
    }
}

# Create zip
$zipFile = "app-update.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force
Remove-Item -Recurse -Force $tempDir

Write-Host "Update package created: $zipFile" -ForegroundColor Green
Write-Host ""

Write-Host "=== Copying to Pi ===" -ForegroundColor Cyan
Write-Host "Password: $remotePassword" -ForegroundColor Yellow
Write-Host ""

# Copy files
scp $zipFile "${remoteUser}@${remoteHost}:~/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Copy failed!" -ForegroundColor Red
    Write-Host "Please copy manually:" -ForegroundColor Yellow
    Write-Host "  scp $zipFile ${remoteUser}@${remoteHost}:~/" -ForegroundColor White
    exit 1
}

Write-Host "Files copied successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Running Update on Pi ===" -ForegroundColor Cyan
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

# Create and copy update script
$scriptContent = @'
#!/bin/bash
cd ~/stirling-engine-build
unzip -o ~/app-update.zip
rm ~/app-update.zip
npm run build-linux-arm64
sudo dpkg -r stirling-engine-monitor 2>/dev/null || true
DEB_FILE=$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -n "$DEB_FILE" ]; then
    sudo dpkg -i "$DEB_FILE"
    sudo apt-get install -f -y
    if [ -f /opt/stirling-engine/chrome-sandbox ]; then
        sudo chown root:root /opt/stirling-engine/chrome-sandbox
        sudo chmod 4755 /opt/stirling-engine/chrome-sandbox
    fi
    echo "Update complete!"
else
    echo "ERROR: DEB file not found!"
    exit 1
fi
'@

$scriptContent | Out-File -FilePath "update-script.sh" -Encoding ASCII
scp "update-script.sh" "${remoteUser}@${remoteHost}:~/"

Write-Host "Running update..." -ForegroundColor Yellow
ssh "${remoteUser}@${remoteHost}" "bash ~/update-script.sh; rm ~/update-script.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS ===" -ForegroundColor Green
    Write-Host "App updated on Raspberry Pi!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERROR: Update failed!" -ForegroundColor Red
}

# Cleanup
Remove-Item $zipFile -ErrorAction SilentlyContinue
Remove-Item "update-script.sh" -ErrorAction SilentlyContinue





