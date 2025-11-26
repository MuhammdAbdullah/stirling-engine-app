# Upload workflow file to GitHub using REST API
$repo = "MuhammdAbdullah/stirling-engine-app"
$filePath = ".github/workflows/build-raspberry-pi.yml"
$branch = "main"
$message = "Add GitHub Actions workflow for automated Raspberry Pi builds"

# Read workflow file content
$workflowContent = Get-Content ".github/workflows/build-raspberry-pi.yml" -Raw -Encoding UTF8

# Convert to base64
$bytes = [System.Text.Encoding]::UTF8.GetBytes($workflowContent)
$base64Content = [Convert]::ToBase64String($bytes)

# Get GitHub token
$token = gh auth token
if (-not $token) {
    Write-Host "Error: Could not get GitHub token. Make sure you're logged in with 'gh auth login'" -ForegroundColor Red
    exit 1
}

# Create JSON payload
$body = @{
    message = $message
    content = $base64Content
    branch = $branch
} | ConvertTo-Json -Compress

# API endpoint
$url = "https://api.github.com/repos/$repo/contents/$filePath"

# Headers
$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
    "Content-Type" = "application/json"
}

Write-Host "Uploading workflow file to GitHub..." -ForegroundColor Yellow
Write-Host "Repository: $repo" -ForegroundColor Cyan
Write-Host "File: $filePath" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Put -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Successfully uploaded workflow file!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The workflow will now run automatically on the next push to main branch." -ForegroundColor Green
    Write-Host "You can also trigger it manually from the Actions tab." -ForegroundColor Green
    Write-Host ""
    Write-Host "Check the Actions tab: https://github.com/$repo/actions" -ForegroundColor Cyan
} catch {
    Write-Host "Error uploading file:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}

