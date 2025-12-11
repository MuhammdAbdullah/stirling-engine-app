# Manual Installation Guide for Raspberry Pi (ARM64)

Since automated SSH connections are being closed, follow these steps manually on your Windows computer.

## Step 1: Create Source Archive

Run this in PowerShell (in your project folder):

```powershell
# Create temp directory
$tempDir = "temp-build-files"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files
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

# Create zip
Compress-Archive -Path "$tempDir\*" -DestinationPath "stirling-source.zip" -Force
Remove-Item -Recurse -Force $tempDir
```

## Step 2: Copy Archive to Raspberry Pi

```powershell
scp stirling-source.zip abdullah@192.168.1.96:~/
```

(Enter your password when prompted)

## Step 3: Build and Install on Raspberry Pi

SSH into your Pi and run these commands one by one:

```bash
# SSH into Pi
ssh abdullah@192.168.1.96

# Once connected, run these commands:

# Extract files
rm -rf ~/stirling-engine-build
mkdir -p ~/stirling-engine-build
cd ~/stirling-engine-build
unzip -q ~/stirling-source.zip
rm ~/stirling-source.zip

# Check Node.js (install if needed)
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js version: $(node --version)"
fi

# Install dependencies (takes 5-10 minutes)
echo "Installing npm dependencies..."
npm install

# Build ARM64 version (takes 5-10 minutes)
echo "Building ARM64 version..."
npm run build-linux-arm64

# Install the DEB package
DEB_FILE=$(ls dist/*arm64*.deb 2>/dev/null | head -1)
if [ -z "$DEB_FILE" ]; then
    echo "ERROR: DEB file not found!"
    ls -la dist/
    exit 1
fi
echo "Installing: $DEB_FILE"
sudo dpkg -i "$DEB_FILE"
sudo apt-get install -f -y

echo "Installation complete!"
```

## Step 4: Run the App

After installation, you can run the app with:

```bash
matrix-stirling-engine
```

Or search for "Matrix Stirling Engine" in your applications menu.

## Troubleshooting

If you get errors during `npm install`, you may need to install build tools:

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

If the build fails, check the error messages and make sure all dependencies are installed.



