# Script to copy updated package.json to Pi
# Run this from Windows PowerShell: .\update-package-json-on-pi.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"

Write-Host "=== Copying updated package.json to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host "You will be asked for your SSH password..." -ForegroundColor Yellow
Write-Host ""

scp package.json "${remoteUser}@${remoteHost}:~/stirling-engine-build/"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "package.json updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now SSH into the Pi and rebuild:" -ForegroundColor Cyan
    Write-Host "  ssh ${remoteUser}@${remoteHost}" -ForegroundColor White
    Write-Host "  cd ~/stirling-engine-build" -ForegroundColor White
    Write-Host "  npm run build-linux-arm64" -ForegroundColor White
} else {
    Write-Host "ERROR: Failed to copy package.json!" -ForegroundColor Red
}
