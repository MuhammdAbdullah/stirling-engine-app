# Script to copy updated main.js to Raspberry Pi
# Run this from Windows PowerShell: .\copy-mainjs-to-pi.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"

Write-Host "=== Copying updated main.js to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Copying main.js..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password..." -ForegroundColor Cyan
Write-Host ""

# Copy the updated main.js file
scp "main.js" "${remoteUser}@${remoteHost}:~/stirling-engine-build/"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Success! ===" -ForegroundColor Green
    Write-Host "main.js copied to Pi successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now SSH into the Pi and rebuild:" -ForegroundColor Cyan
    Write-Host "  ssh ${remoteUser}@${remoteHost}" -ForegroundColor White
    Write-Host "  cd ~/stirling-engine-build" -ForegroundColor White
    Write-Host "  npm run build-linux-arm64" -ForegroundColor White
} else {
    Write-Host "ERROR: Failed to copy main.js!" -ForegroundColor Red
}

