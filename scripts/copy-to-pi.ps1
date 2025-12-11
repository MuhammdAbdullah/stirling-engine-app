# Simple script to copy files to Raspberry Pi
# Run this from Windows PowerShell: .\copy-to-pi.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"

Write-Host "=== Copying files to Raspberry Pi ===" -ForegroundColor Cyan
Write-Host ""

# Check if files exist
if (-not (Test-Path "stirling-source.zip")) {
    Write-Host "ERROR: stirling-source.zip not found!" -ForegroundColor Red
    Write-Host "Please run .\prepare-for-pi-build.ps1 first" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "build-on-pi.sh")) {
    Write-Host "ERROR: build-on-pi.sh not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Copying source archive..." -ForegroundColor Yellow
Write-Host "You will be asked for your SSH password..." -ForegroundColor Cyan
scp "stirling-source.zip" "${remoteUser}@${remoteHost}:~/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy archive!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Archive copied!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Copying build script..." -ForegroundColor Yellow
scp "build-on-pi.sh" "${remoteUser}@${remoteHost}:~/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to copy build script!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build script copied!" -ForegroundColor Green
Write-Host ""

Write-Host "=== Files copied successfully! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Now SSH into your Pi and run the build script:" -ForegroundColor Cyan
Write-Host "  ssh ${remoteUser}@${remoteHost}" -ForegroundColor White
Write-Host "  bash build-on-pi.sh" -ForegroundColor White
Write-Host ""



