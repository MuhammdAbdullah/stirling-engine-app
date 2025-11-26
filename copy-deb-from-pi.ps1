# Script to copy the finished DEB package from Raspberry Pi to Windows
# Run this from Windows PowerShell: .\copy-deb-from-pi.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"

Write-Host "=== Copying DEB package from Raspberry Pi ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Finding the DEB package on the Pi..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password..." -ForegroundColor Cyan
Write-Host ""

# Find the DEB file on the Pi
$debPath = ssh "${remoteUser}@${remoteHost}" "ls ~/stirling-engine-build/dist/*arm64*.deb 2>/dev/null | head -1"

if ([string]::IsNullOrWhiteSpace($debPath)) {
    Write-Host "ERROR: DEB package not found on the Pi!" -ForegroundColor Red
    Write-Host "Make sure the build completed successfully." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found: $debPath" -ForegroundColor Green
Write-Host ""

Write-Host "Copying DEB package to Windows..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password again..." -ForegroundColor Cyan
Write-Host ""

# Copy the DEB file
scp "${remoteUser}@${remoteHost}:$debPath" "dist\"

if ($LASTEXITCODE -eq 0) {
    $fileName = Split-Path $debPath -Leaf
    Write-Host ""
    Write-Host "=== Success! ===" -ForegroundColor Green
    Write-Host "DEB package copied to: dist\$fileName" -ForegroundColor Green
    Write-Host ""
    Write-Host "This DEB package can now be distributed and installed on any Raspberry Pi!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To install on any Pi, copy the DEB file and run:" -ForegroundColor Yellow
    Write-Host "  sudo dpkg -i $fileName" -ForegroundColor White
    Write-Host "  sudo apt-get install -f -y" -ForegroundColor White
} else {
    Write-Host "ERROR: Failed to copy DEB package!" -ForegroundColor Red
}

