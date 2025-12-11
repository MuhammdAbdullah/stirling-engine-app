# Script to upload workflow file to GitHub
$filePath = ".github/workflows/build-raspberry-pi.yml"
$repo = "MuhammdAbdullah/stirling-engine-app"
$branch = "main"
$message = "Add GitHub Actions workflow for automated Raspberry Pi builds"

# Read file content
$content = Get-Content $filePath -Raw -Encoding UTF8

# Convert to base64
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64Content = [Convert]::ToBase64String($bytes)

# Create JSON payload
$body = @{
    message = $message
    content = $base64Content
    branch = $branch
} | ConvertTo-Json -Depth 10

# Write to temp file
$tempFile = "temp-workflow-upload.json"
$body | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Uploading workflow file to GitHub..."
Write-Host "File: $filePath"
Write-Host "Repository: $repo"
Write-Host ""

# Upload using gh CLI
gh api repos/$repo/contents/$filePath -X PUT -F "@$tempFile"

# Clean up
Remove-Item $tempFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done! Check the Actions tab in your GitHub repository."









