# Script to set up SSH key authentication (no password needed)
# Run this once: .\setup-ssh-keys.ps1

$remoteUser = "abdullah"
$remoteHost = "192.168.1.96"
$password = "@Matrix123"

Write-Host "=== Setting up SSH key authentication ===" -ForegroundColor Cyan
Write-Host ""

# Check if SSH key exists
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
if (-not (Test-Path $sshKeyPath)) {
    Write-Host "Generating SSH key..." -ForegroundColor Yellow
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""' -q
    Write-Host "SSH key generated!" -ForegroundColor Green
} else {
    Write-Host "SSH key already exists." -ForegroundColor Green
}

Write-Host ""
Write-Host "Copying public key to Raspberry Pi..." -ForegroundColor Yellow
Write-Host "You will be asked for your password once..." -ForegroundColor Cyan
Write-Host ""

# Use sshpass equivalent for Windows or manual copy
# For Windows, we'll use a different approach
$publicKey = Get-Content "$sshKeyPath.pub"

# Create a temporary script to copy the key
$tempScript = @"
#!/bin/bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo '$publicKey' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
echo 'SSH key added successfully!'
"@

$tempScript | Out-File -FilePath "temp-setup-key.sh" -Encoding ASCII

Write-Host "Please run this command manually (enter password @Matrix123 when asked):" -ForegroundColor Yellow
Write-Host "  scp $env:USERPROFILE\.ssh\id_rsa.pub ${remoteUser}@${remoteHost}:~/temp-key.pub" -ForegroundColor White
Write-Host ""
Write-Host "Then SSH into the Pi and run:" -ForegroundColor Yellow
Write-Host "  ssh ${remoteUser}@${remoteHost}" -ForegroundColor White
Write-Host "  mkdir -p ~/.ssh" -ForegroundColor White
Write-Host "  chmod 700 ~/.ssh" -ForegroundColor White
Write-Host "  cat ~/temp-key.pub >> ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host "  chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
Write-Host "  rm ~/temp-key.pub" -ForegroundColor White
Write-Host ""

# Clean up
Remove-Item "temp-setup-key.sh" -ErrorAction SilentlyContinue



