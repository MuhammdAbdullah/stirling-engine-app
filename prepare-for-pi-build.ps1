# Simple script to prepare files for building on Raspberry Pi
# Usage: .\prepare-for-pi-build.ps1
# Then follow the instructions it prints

Write-Host "=== Preparing files for Raspberry Pi build ===" -ForegroundColor Cyan
Write-Host ""

# Create temp directory
$tempDir = "temp-build-files"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying source files..." -ForegroundColor Yellow

# Copy necessary files
Copy-Item "package.json" "$tempDir/"
Copy-Item "package-lock.json" "$tempDir/"
Copy-Item "main.js" "$tempDir/"
Copy-Item "preload.js" "$tempDir/"
Copy-Item "renderer.js" "$tempDir/"
Copy-Item "index.html" "$tempDir/"
Copy-Item "styles.css" "$tempDir/"
Copy-Item "data-worker.js" "$tempDir/"
Copy-Item "stirling-data-parser.js" "$tempDir/"
Copy-Item -Recurse "lib" "$tempDir/"
Copy-Item -Recurse "assets" "$tempDir/"

# Create zip archive
$archiveName = "stirling-source.zip"
Write-Host "Creating archive: $archiveName" -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $archiveName -Force

# Clean up temp directory
Remove-Item -Recurse -Force $tempDir

Write-Host ""
Write-Host "=== Files prepared! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Now follow these steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Copy the archive to your Raspberry Pi:" -ForegroundColor Yellow
Write-Host "   scp stirling-source.zip abdullah@192.168.1.96:~/" -ForegroundColor White
Write-Host ""
Write-Host "2. Copy the build script to your Pi:" -ForegroundColor Yellow
Write-Host "   scp build-on-pi.sh abdullah@192.168.1.96:~/" -ForegroundColor White
Write-Host ""
Write-Host "3. SSH into your Pi:" -ForegroundColor Yellow
Write-Host "   ssh abdullah@192.168.1.96" -ForegroundColor White
Write-Host ""
Write-Host "4. Run the build script on the Pi:" -ForegroundColor Yellow
Write-Host "   bash build-on-pi.sh" -ForegroundColor White
Write-Host ""
Write-Host "The build will take 10-20 minutes. When done, run:" -ForegroundColor Cyan
Write-Host "   matrix-stirling-engine" -ForegroundColor White
Write-Host ""

