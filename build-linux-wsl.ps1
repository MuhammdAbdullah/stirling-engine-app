# Build Linux versions using WSL
# Run this from Windows PowerShell: .\build-linux-wsl.ps1

Write-Host "=== Building Linux versions using WSL ===" -ForegroundColor Cyan
Write-Host ""

# Check if WSL is available
$wslAvailable = Get-Command wsl -ErrorAction SilentlyContinue
if (-not $wslAvailable) {
    Write-Host "ERROR: WSL is not installed or not available!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install WSL:" -ForegroundColor Yellow
    Write-Host "  wsl --install" -ForegroundColor White
    Write-Host ""
    Write-Host "Or build manually in WSL:" -ForegroundColor Yellow
    Write-Host "  wsl" -ForegroundColor White
    Write-Host "  cd /mnt/e/Thermo/Striling\ Engine" -ForegroundColor White
    Write-Host "  npm run build-linux-x64" -ForegroundColor White
    exit 1
}

Write-Host "Building Linux x64..." -ForegroundColor Yellow
wsl bash -c "cd '/mnt/e/Thermo/Striling Engine' && npm run build-linux-x64"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "Linux builds are in the dist/ folder" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    Write-Host "Make sure you have:" -ForegroundColor Yellow
    Write-Host "  1. WSL installed and configured" -ForegroundColor White
    Write-Host "  2. Node.js installed in WSL" -ForegroundColor White
    Write-Host "  3. Dependencies installed (npm install in WSL)" -ForegroundColor White
}

