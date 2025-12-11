# Fully automated update script using plink for password handling
# Run: .\update-pi-automated.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-build"
$remotePassword = "@Matrix123"

# Download plink if not available
function Get-Plink {
    $plinkPath = "$env:TEMP\plink.exe"
    if (Test-Path $plinkPath) {
        return $plinkPath
    }
    
    Write-Host "Downloading plink.exe (PuTTY)..." -ForegroundColor Yellow
    try {
        $plinkUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe"
        Invoke-WebRequest -Uri $plinkUrl -OutFile $plinkPath -UseBasicParsing
        Write-Host "Downloaded plink.exe" -ForegroundColor Green
        return $plinkPath
    } catch {
        Write-Host "Failed to download plink. Trying pscp..." -ForegroundColor Yellow
        return $null
    }
}

function Get-Pscp {
    $pscpPath = "$env:TEMP\pscp.exe"
    if (Test-Path $pscpPath) {
        return $pscpPath
    }
    
    Write-Host "Downloading pscp.exe..." -ForegroundColor Yellow
    try {
        $pscpUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe"
        Invoke-WebRequest -Uri $pscpUrl -OutFile $pscpPath -UseBasicParsing
        Write-Host "Downloaded pscp.exe" -ForegroundColor Green
        return $pscpPath
    } catch {
        return $null
    }
}

Write-Host "=== Step 1: Preparing Update Package ===" -ForegroundColor Cyan

$tempDir = "temp-update"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

$files = @("index.html", "renderer.js", "styles.css", "package.json", "main.js", "preload.js")
foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file "$tempDir/"
        Write-Host "  Added: $file" -ForegroundColor Gray
    }
}

$zipFile = "app-update.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force
Remove-Item -Recurse -Force $tempDir

Write-Host "Update package created!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 2: Setting up SSH Tools ===" -ForegroundColor Cyan
$plink = Get-Plink
$pscp = Get-Pscp

if (-not $plink) {
    Write-Host "ERROR: Could not download plink. Cannot automate password entry." -ForegroundColor Red
    Write-Host "Please run: .\update-pi-simple.ps1 and enter password manually" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

Write-Host "=== Step 3: Copying Files to Pi ===" -ForegroundColor Cyan

if ($pscp) {
    Write-Host "Copying archive using pscp..." -ForegroundColor Yellow
    # pscp needs full path or just filename in home directory, -batch to auto-accept host key
    & $pscp -batch -pw $remotePassword $zipFile "${remoteUser}@${remoteHost}:app-update.zip"
} else {
    Write-Host "Copying archive using plink..." -ForegroundColor Yellow
    $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $zipFile)))
    $base64 | & $plink -batch -ssh -pw $remotePassword "${remoteUser}@${remoteHost}" "base64 -d > app-update.zip"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy files!" -ForegroundColor Red
    exit 1
}

Write-Host "Files copied successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 4: Creating Update Script ===" -ForegroundColor Cyan

$updateScript = @'
#!/bin/bash
set -e
cd ~/stirling-engine-build

echo "Extracting updated files..."
if [ -f ~/app-update.zip ]; then
    unzip -q -o ~/app-update.zip
    rm ~/app-update.zip
elif [ -f app-update.zip ]; then
    unzip -q -o app-update.zip
    rm app-update.zip
else
    echo "ERROR: app-update.zip not found!"
    exit 1
fi

echo ""
echo "Rebuilding ARM64 version..."
npm run build-linux-arm64

if [ $? -ne 0 ]; then
    echo "ERROR: Build failed!"
    exit 1
fi

echo ""
echo "Removing old package..."
sudo dpkg -r stirling-engine-monitor 2>/dev/null || true

echo ""
echo "Installing new package..."
DEB_FILE=$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z "$DEB_FILE" ]; then
    echo "ERROR: DEB file not found!"
    exit 1
fi

sudo dpkg -i "$DEB_FILE"
sudo apt-get install -f -y

echo ""
echo "Fixing sandbox permissions..."
if [ -f /opt/stirling-engine/chrome-sandbox ]; then
    sudo chown root:root /opt/stirling-engine/chrome-sandbox
    sudo chmod 4755 /opt/stirling-engine/chrome-sandbox
fi

echo ""
echo "=== Update Complete! ==="
'@

# Write script with Unix line endings
$updateScript -replace "`r`n", "`n" | Out-File -FilePath "update-script.sh" -Encoding ASCII -NoNewline
Add-Content -Path "update-script.sh" -Value "`n" -NoNewline

Write-Host "Copying update script..." -ForegroundColor Yellow
if ($pscp) {
    & $pscp -batch -pw $remotePassword "update-script.sh" "${remoteUser}@${remoteHost}:update-script.sh"
} else {
    $scriptBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path "update-script.sh")))
    $scriptBase64 | & $plink -batch -ssh -pw $remotePassword "${remoteUser}@${remoteHost}" "base64 -d > update-script.sh; chmod +x update-script.sh"
}

Write-Host ""

Write-Host "=== Step 5: Running Update on Pi ===" -ForegroundColor Cyan
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

& $plink -batch -ssh -pw $remotePassword "${remoteUser}@${remoteHost}" "bash update-script.sh 2>/dev/null || bash ~/update-script.sh; rm -f update-script.sh ~/update-script.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "App has been updated on Raspberry Pi!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the updated app:" -ForegroundColor Cyan
    Write-Host "  ssh ${remoteUser}@${remoteHost}" -ForegroundColor White
    Write-Host "  matrix-stirling-engine" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Update failed!" -ForegroundColor Red
    Write-Host "Check error messages above for details." -ForegroundColor Yellow
}

# Cleanup
Remove-Item $zipFile -ErrorAction SilentlyContinue
Remove-Item "update-script.sh" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

