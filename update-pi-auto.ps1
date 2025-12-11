# Automated script to update app on Pi with automatic password handling
# Run this from Windows PowerShell: .\update-pi-auto.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-build"
$remotePassword = "@Matrix123"

# Function to download and setup plink
function Setup-Plink {
    $plinkPath = "$env:TEMP\plink.exe"
    
    if (Test-Path $plinkPath) {
        Write-Host "Found plink.exe in temp folder" -ForegroundColor Green
        return $plinkPath
    }
    
    Write-Host "Downloading plink.exe (PuTTY)..." -ForegroundColor Yellow
    try {
        $plinkUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe"
        Invoke-WebRequest -Uri $plinkUrl -OutFile $plinkPath -UseBasicParsing
        Write-Host "✓ plink.exe downloaded!" -ForegroundColor Green
        return $plinkPath
    } catch {
        Write-Host "Failed to download plink. Will use regular SSH (password required)" -ForegroundColor Yellow
        return $null
    }
}

Write-Host "=== Step 1: Preparing updated files ===" -ForegroundColor Cyan
Write-Host ""

# Create temp directory with updated files
$tempDir = "temp-build-update"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying updated files..." -ForegroundColor Yellow

# Copy files that might have changed
$filesToCopy = @("index.html", "renderer.js", "styles.css", "package.json", "main.js", "preload.js")
foreach ($file in $filesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file "$tempDir/"
        Write-Host "  Copied: $file" -ForegroundColor Gray
    }
}

# Create zip archive
$archiveName = "app-update.zip"
Write-Host "Creating update archive..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $archiveName -Force

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

Write-Host "✓ Update archive created!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 2: Setting up SSH tools ===" -ForegroundColor Cyan
$plink = Setup-Plink
$pscp = $null

if ($plink) {
    $pscp = $plink -replace "plink.exe", "pscp.exe"
    if (-not (Test-Path $pscp)) {
        # Try to download pscp too
        Write-Host "Downloading pscp.exe..." -ForegroundColor Yellow
        try {
            $pscpUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe"
            $pscpPath = "$env:TEMP\pscp.exe"
            Invoke-WebRequest -Uri $pscpUrl -OutFile $pscpPath -UseBasicParsing
            $pscp = $pscpPath
            Write-Host "✓ pscp.exe downloaded!" -ForegroundColor Green
        } catch {
            Write-Host "pscp download failed, will use plink for file transfer" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Step 3: Copying files to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host ""

if ($pscp -and (Test-Path $pscp)) {
    Write-Host "Using pscp to copy archive..." -ForegroundColor Yellow
    & $pscp -pw $remotePassword $archiveName "${remoteUser}@${remoteHost}:~/"
} elseif ($plink) {
    Write-Host "Using plink to copy archive..." -ForegroundColor Yellow
    # Use plink with base64 encoding for binary files
    $base64Content = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $archiveName)))
    $base64Content | & $plink -ssh -pw $remotePassword "${remoteUser}@${remoteHost}" "base64 -d > ~/app-update.zip"
} else {
    Write-Host "Using regular SCP (password required)..." -ForegroundColor Yellow
    Write-Host "Password: $remotePassword" -ForegroundColor Cyan
    scp $archiveName "${remoteUser}@${remoteHost}:~/"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy archive!" -ForegroundColor Red
    Write-Host "Please try copying manually:" -ForegroundColor Yellow
    Write-Host "  scp $archiveName ${remoteUser}@${remoteHost}:~/" -ForegroundColor White
    Remove-Item $archiveName -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✓ Files copied!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 4: Creating and running update script ===" -ForegroundColor Cyan
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

# Create bash script (using single quotes to prevent PowerShell parsing)
$bashScriptContent = @'
#!/bin/bash
set -e
cd REMOTE_PATH_PLACEHOLDER

echo 'Extracting updated files...'
unzip -q -o ~/app-update.zip
rm ~/app-update.zip

echo ''
echo 'Rebuilding ARM64 version...'
npm run build-linux-arm64

if [ $? -ne 0 ]; then
    echo 'ERROR: Build failed!'
    exit 1
fi

echo ''
echo 'Removing old package...'
sudo dpkg -r stirling-engine-monitor 2>/dev/null || true

echo ''
echo 'Installing new package...'
DEB_FILE=$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z "$DEB_FILE" ]; then
    echo 'ERROR: DEB file not found!'
    exit 1
fi
sudo dpkg -i "$DEB_FILE"
sudo apt-get install -f -y

echo ''
echo 'Fixing sandbox permissions...'
if [ -f /opt/stirling-engine/chrome-sandbox ]; then
    sudo chown root:root /opt/stirling-engine/chrome-sandbox
    sudo chmod 4755 /opt/stirling-engine/chrome-sandbox
fi

echo ''
echo '=== Update complete! ==='
'@

# Replace placeholder with actual path
$bashScript = $bashScriptContent -replace 'REMOTE_PATH_PLACEHOLDER', $remotePath

$tempScript = "temp-update-script.sh"
$bashScript | Out-File -FilePath $tempScript -Encoding ASCII

# Copy script to Pi
if ($pscp -and (Test-Path $pscp)) {
    & $pscp -pw $remotePassword $tempScript "${remoteUser}@${remoteHost}:~/update-script.sh"
} elseif ($plink) {
    $scriptContent = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $tempScript)))
    $scriptContent | & $plink -ssh -pw $remotePassword "${remoteUser}@${remoteHost}" "base64 -d > ~/update-script.sh; chmod +x ~/update-script.sh"
} else {
    scp $tempScript "${remoteUser}@${remoteHost}:~/update-script.sh"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy script!" -ForegroundColor Red
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    exit 1
}

# Execute the script
Write-Host "Running update script on Pi..." -ForegroundColor Yellow
if ($plink) {
    & $plink -ssh -pw $remotePassword "${remoteUser}@${remoteHost}" "bash ~/update-script.sh; rm ~/update-script.sh"
} else {
    ssh "${remoteUser}@${remoteHost}" "bash ~/update-script.sh; rm ~/update-script.sh"
}

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
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
}

# Cleanup
Remove-Item $tempScript -ErrorAction SilentlyContinue
Remove-Item $archiveName -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done!" -ForegroundColor Green

