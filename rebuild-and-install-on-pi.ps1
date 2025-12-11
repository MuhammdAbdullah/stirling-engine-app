# Script to rebuild and install the app on Raspberry Pi
# Run this from Windows PowerShell: .\rebuild-and-install-on-pi.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-build"
$remotePassword = "@Matrix123"

# Function to check if plink is available
function Test-Plink {
    $plinkPath = Get-Command plink.exe -ErrorAction SilentlyContinue
    if ($plinkPath) {
        return $plinkPath.Source
    }
    # Check common PuTTY installation paths
    $commonPaths = @(
        "${env:ProgramFiles}\PuTTY\plink.exe",
        "${env:ProgramFiles(x86)}\PuTTY\plink.exe",
        "$env:LOCALAPPDATA\Programs\PuTTY\plink.exe"
    )
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    return $null
}

# Function to run SSH command with password
function Invoke-SSHCommand {
    param(
        [string]$Command,
        [string]$User = $remoteUser,
        [string]$RemoteHost = $remoteHost,
        [string]$Password = $remotePassword
    )
    
    $plink = Test-Plink
    if ($plink) {
        Write-Host "Using plink for SSH connection..." -ForegroundColor Cyan
        & $plink -ssh -pw $Password "${User}@${RemoteHost}" $Command
    } else {
        Write-Host "plink not found, using regular SSH..." -ForegroundColor Yellow
        Write-Host "Note: You may need to enter password manually" -ForegroundColor Yellow
        ssh "${User}@${RemoteHost}" $Command
    }
}

# Function to copy file with password
function Copy-FileWithPassword {
    param(
        [string]$LocalPath,
        [string]$RemotePath,
        [string]$User = $remoteUser,
        [string]$RemoteHost = $remoteHost,
        [string]$Password = $remotePassword
    )
    
    $plink = Test-Plink
    if ($plink) {
        $pscp = $plink -replace "plink.exe", "pscp.exe"
        if (Test-Path $pscp) {
            Write-Host "Using pscp for file transfer..." -ForegroundColor Cyan
            & $pscp -pw $Password $LocalPath "${User}@${RemoteHost}:${RemotePath}"
        } else {
            Write-Host "pscp not found, trying with plink..." -ForegroundColor Yellow
            # Use plink with cat command as fallback
            Get-Content $LocalPath | & $plink -ssh -pw $Password "${User}@${RemoteHost}" "cat > ${RemotePath}"
        }
    } else {
        Write-Host "plink not found, using regular SCP..." -ForegroundColor Yellow
        Write-Host "Note: You may need to enter password manually" -ForegroundColor Yellow
        scp $LocalPath "${User}@${RemoteHost}:${RemotePath}"
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

# Copy only the files that changed
Copy-Item "index.html" "$tempDir/"
Copy-Item "renderer.js" "$tempDir/"
Copy-Item "styles.css" "$tempDir/"
Copy-Item "package.json" "$tempDir/"

# Create zip archive
$archiveName = "app-update.zip"
Write-Host "Creating update archive..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $archiveName -Force

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

Write-Host "✓ Update archive created!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 2: Copying updated files to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host ""

Copy-FileWithPassword -LocalPath $archiveName -RemotePath "~/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy update archive!" -ForegroundColor Red
    Remove-Item $archiveName -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✓ Files copied!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Step 3: Updating files and rebuilding on Pi ===" -ForegroundColor Cyan
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

# Create a temporary bash script to run on Pi
$bashScript = @"
#!/bin/bash
cd $remotePath

# Extract updated files
echo 'Extracting updated files...'
unzip -q -o ~/app-update.zip
rm ~/app-update.zip

# Rebuild the app
echo ''
echo 'Rebuilding ARM64 version...'
npm run build-linux-arm64

if [ `$? -ne 0 ]; then
    echo 'ERROR: Build failed!'
    exit 1
fi

# Remove old package
echo ''
echo 'Removing old package...'
sudo dpkg -r stirling-engine-monitor 2>/dev/null || true

# Install new package
echo ''
echo 'Installing new package...'
DEB_FILE=`$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z "`$DEB_FILE" ]; then
    echo 'ERROR: DEB file not found!'
    exit 1
fi
sudo dpkg -i "`$DEB_FILE"
sudo apt-get install -f -y

# Fix sandbox permissions
echo ''
echo 'Fixing sandbox permissions...'
if [ -f /opt/stirling-engine/chrome-sandbox ]; then
    sudo chown root:root /opt/stirling-engine/chrome-sandbox
    sudo chmod 4755 /opt/stirling-engine/chrome-sandbox
fi

echo ''
echo '=== Build and installation complete! ==='
echo 'The app has been updated and reinstalled.'
"@

# Save script to temp file
$tempScript = "temp-update-script.sh"
$bashScript | Out-File -FilePath $tempScript -Encoding ASCII -NoNewline

# Copy script to Pi and execute it
Write-Host "Copying update script to Pi..." -ForegroundColor Yellow
Copy-FileWithPassword -LocalPath $tempScript -RemotePath "~/update-script.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy update script!" -ForegroundColor Red
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    Remove-Item $archiveName -ErrorAction SilentlyContinue
    exit 1
}

# Execute the script on Pi
Write-Host "Running update script on Pi..." -ForegroundColor Yellow
Invoke-SSHCommand -Command "bash ~/update-script.sh && rm ~/update-script.sh"

# Clean up local temp script
Remove-Item $tempScript -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "The app has been rebuilt and installed on your Raspberry Pi." -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the updated app:" -ForegroundColor Cyan
    Write-Host "  ssh ${remoteUser}@${remoteHost}" -ForegroundColor White
    Write-Host "  matrix-stirling-engine" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Build or installation failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
}

# Clean up local archive
Remove-Item $archiveName -ErrorAction SilentlyContinue



