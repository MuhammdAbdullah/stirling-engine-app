# Try using GitHub GraphQL API to create workflow file
$repo = "MuhammdAbdullah/stirling-engine-app"
$owner = "MuhammdAbdullah"
$repoName = "stirling-engine-app"
$filePath = ".github/workflows/build-raspberry-pi.yml"
$branch = "main"

# Read workflow content
$workflowContent = Get-Content ".github/workflows/build-raspberry-pi.yml" -Raw -Encoding UTF8
$bytes = [System.Text.Encoding]::UTF8.GetBytes($workflowContent)
$base64Content = [Convert]::ToBase64String($bytes)

# Get token
$token = gh auth token
if (-not $token) {
    Write-Host "Error: Could not get GitHub token" -ForegroundColor Red
    exit 1
}

# Get current commit SHA
$currentSha = git rev-parse origin/main 2>$null
if (-not $currentSha) {
    $currentSha = git rev-parse HEAD
}

# GraphQL mutation to create file
$mutation = @"
mutation {
  createCommitOnBranch(
    input: {
      branch: {
        repositoryNameWithOwner: "$owner/$repoName"
        branchName: "$branch"
      }
      message: {
        headline: "Add GitHub Actions workflow for automated Raspberry Pi builds"
      }
      fileChanges: {
        additions: [
          {
            path: "$filePath"
            contents: "$base64Content"
          }
        ]
      }
      expectedHeadOid: "$currentSha"
    }
  ) {
    commit {
      url
    }
  }
}
"@

$body = @{
    query = $mutation
} | ConvertTo-Json -Compress

$headers = @{
    "Authorization" = "bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Trying GraphQL API..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/graphql" -Method Post -Headers $headers -Body $body
    if ($response.data.createCommitOnBranch) {
        Write-Host "Success! Workflow file created!" -ForegroundColor Green
        Write-Host "Commit URL: $($response.data.createCommitOnBranch.commit.url)" -ForegroundColor Cyan
    } else {
        Write-Host "Response: $($response | ConvertTo-Json -Depth 10)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "GraphQL method failed, trying alternative..." -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
}

