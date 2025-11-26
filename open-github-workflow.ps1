# Open GitHub with workflow file ready to paste
$repo = "MuhammdAbdullah/stirling-engine-app"
$filePath = ".github/workflows/build-raspberry-pi.yml"
$url = "https://github.com/$repo/new/main?filename=$filePath"

Write-Host ""
Write-Host "Opening GitHub in your browser..." -ForegroundColor Yellow
Write-Host "URL: $url" -ForegroundColor Cyan
Write-Host ""

# Read workflow content
$workflowContent = Get-Content ".github/workflows/build-raspberry-pi.yml" -Raw

# Create a temporary HTML file that will copy content to clipboard and open GitHub
$html = @"
<!DOCTYPE html>
<html>
<head>
    <title>GitHub Workflow Setup</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #0366d6; }
        .step { margin: 20px 0; padding: 15px; background: #f6f8fa; border-left: 4px solid #0366d6; }
        .code { background: #24292e; color: #f6f8fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: 'Courier New', monospace; font-size: 12px; white-space: pre-wrap; }
        button { background: #28a745; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 4px; cursor: pointer; margin: 10px 5px; }
        button:hover { background: #22863a; }
        .copy-btn { background: #0366d6; }
        .copy-btn:hover { background: #0256cc; }
        .success { color: #28a745; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Setup GitHub Workflow for Raspberry Pi</h1>
        
        <div class="step">
            <h2>Step 1: GitHub is opening in your browser</h2>
            <p>Wait for the GitHub page to load...</p>
        </div>
        
        <div class="step">
            <h2>Step 2: Type this path in GitHub</h2>
            <div class="code">.github/workflows/build-raspberry-pi.yml</div>
        </div>
        
        <div class="step">
            <h2>Step 3: Copy the workflow content</h2>
            <p>Click the button below to copy all content to your clipboard:</p>
            <button class="copy-btn" onclick="copyContent()">📋 Copy Workflow Content</button>
            <p id="copyStatus"></p>
        </div>
        
        <div class="step">
            <h2>Step 4: Paste in GitHub</h2>
            <p>Go back to GitHub and paste the content into the file editor.</p>
        </div>
        
        <div class="step">
            <h2>Step 5: Commit</h2>
            <p>Scroll down and click "Commit new file"</p>
        </div>
        
        <div class="step">
            <h2>Workflow Content:</h2>
            <div class="code" id="content">$($workflowContent -replace '<', '&lt;' -replace '>', '&gt;')</div>
        </div>
    </div>
    
    <script>
        function copyContent() {
            const content = `$($workflowContent -replace '`', '\`' -replace '\$', '\$')`;
            navigator.clipboard.writeText(content).then(() => {
                document.getElementById('copyStatus').innerHTML = '<span class="success">✓ Content copied to clipboard!</span>';
            }).catch(err => {
                alert('Please manually select and copy the content from the code box below.');
            });
        }
        
        // Auto-open GitHub
        window.open('$url', '_blank');
    </script>
</body>
</html>
"@

$htmlFile = "github-workflow-setup.html"
$html | Out-File -FilePath $htmlFile -Encoding UTF8

Write-Host "Opening setup page..." -ForegroundColor Green
Start-Process $htmlFile

Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. GitHub will open in your browser" -ForegroundColor White
Write-Host "2. A setup page will open with copy button" -ForegroundColor White
Write-Host "3. Click 'Copy Workflow Content' button" -ForegroundColor White
Write-Host "4. Paste into GitHub file editor" -ForegroundColor White
Write-Host "5. Click 'Commit new file'" -ForegroundColor White
Write-Host ""
Write-Host "The workflow file content is also saved in: $htmlFile" -ForegroundColor Cyan







