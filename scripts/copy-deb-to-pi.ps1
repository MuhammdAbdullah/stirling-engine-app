# Simple script to copy DEB package to Raspberry Pi with progress monitoring
# Usage: .\copy-deb-to-pi.ps1

$sourceFile = "dist\stirling-engine-monitor_1.0.0_amd64.deb"
$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$remotePath = "~/stirling-engine-monitor.deb"

Write-Host "=== Copying DEB package to remote device ===" -ForegroundColor Cyan

# Check if file exists
if (-not (Test-Path $sourceFile)) {
    Write-Host "ERROR: File not found: $sourceFile" -ForegroundColor Red
    exit 1
}

# Show file size
$fileSize = (Get-Item $sourceFile).Length / 1MB
Write-Host "File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Yellow
Write-Host "Destination: $remoteUser@$remoteHost`:$remotePath" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting transfer... (this may take 30-60 seconds)" -ForegroundColor Cyan
Write-Host ""

# Use scp with verbose output to see progress
# The -v flag shows verbose output which includes some progress information
scp -v "$sourceFile" "${remoteUser}@${remoteHost}:${remotePath}"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Transfer completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✗ Transfer failed with error code: $LASTEXITCODE" -ForegroundColor Red
}



