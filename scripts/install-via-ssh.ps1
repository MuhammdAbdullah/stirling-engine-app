# Simple script to install Matrix Stirling Engine app on Ubuntu via SSH
# This script will copy the DEB package and install it on the remote device

Write-Host "=== Matrix Stirling Engine - SSH Installation ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get SSH connection details from user
Write-Host "Please provide SSH connection details:" -ForegroundColor Yellow
$sshHost = Read-Host "Enter the IP address or hostname (e.g., 192.168.1.100 or pi@raspberrypi.local)"
$sshUser = Read-Host "Enter the username (or press Enter if included in hostname above)"

# If username is included in hostname (like pi@raspberrypi.local), extract it
if ($sshHost -match "@") {
    $parts = $sshHost -split "@"
    $sshUser = $parts[0]
    $sshHost = $parts[1]
}

# If username wasn't provided separately and not in hostname, ask for it
if ([string]::IsNullOrWhiteSpace($sshUser)) {
    $sshUser = Read-Host "Enter the username"
}

Write-Host ""
Write-Host "Connecting to: $sshUser@$sshHost" -ForegroundColor Green
Write-Host ""

# Step 2: Check if DEB file exists
$debFile = "dist\stirling-engine-monitor_1.0.0_amd64.deb"
if (-not (Test-Path $debFile)) {
    Write-Host "Error: DEB file not found at: $debFile" -ForegroundColor Red
    Write-Host "Please make sure you're running this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found DEB package: $debFile" -ForegroundColor Green
Write-Host ""

# Step 3: Copy the DEB file to the remote device
Write-Host "Step 1: Copying DEB package to remote device..." -ForegroundColor Yellow
Write-Host "You may be prompted for your SSH password." -ForegroundColor Yellow
Write-Host ""

# Use scp to copy the file
$scpCommand = "scp `"$debFile`" ${sshUser}@${sshHost}:~/stirling-engine-monitor.deb"
Write-Host "Running: $scpCommand" -ForegroundColor Gray
Write-Host ""

try {
    Invoke-Expression $scpCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to copy file. Please check your SSH connection." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ File copied successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Error copying file: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Install the package on the remote device
Write-Host "Step 2: Installing package on remote device..." -ForegroundColor Yellow
Write-Host "You may be prompted for your sudo password on the remote device." -ForegroundColor Yellow
Write-Host ""

# SSH command to install the DEB package
$installCommand = "ssh ${sshUser}@${sshHost} 'sudo dpkg -i ~/stirling-engine-monitor.deb && sudo apt-get install -f -y'"
Write-Host "Running installation commands..." -ForegroundColor Gray
Write-Host ""

try {
    Invoke-Expression $installCommand
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Installation may have encountered issues. Check the output above." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Installation completed successfully!" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host "Error during installation: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "You can try installing manually by connecting via SSH and running:" -ForegroundColor Yellow
    Write-Host "  sudo dpkg -i ~/stirling-engine-monitor.deb" -ForegroundColor White
    Write-Host "  sudo apt-get install -f" -ForegroundColor White
    exit 1
}

# Step 5: Clean up the temporary file on remote device
Write-Host "Step 3: Cleaning up temporary files..." -ForegroundColor Yellow
$cleanupCommand = "ssh ${sshUser}@${sshHost} 'rm ~/stirling-engine-monitor.deb'"
Invoke-Expression $cleanupCommand | Out-Null
Write-Host "✓ Cleanup completed!" -ForegroundColor Green
Write-Host ""

# Step 6: Success message
Write-Host "=== Installation Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "The app has been installed on the remote device." -ForegroundColor Cyan
Write-Host ""
Write-Host "To run the app on the remote device, connect via SSH and type:" -ForegroundColor Yellow
Write-Host "  stirling-engine-monitor" -ForegroundColor White
Write-Host ""
Write-Host "Or find it in the Applications menu as 'Matrix Stirling Engine'" -ForegroundColor Cyan
Write-Host ""

