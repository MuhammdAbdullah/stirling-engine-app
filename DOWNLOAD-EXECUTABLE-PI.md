# How to Download Executable to Raspberry Pi from GitHub

Simple guide for downloading and running the app on your Raspberry Pi.

---

## Option 1: Download Pre-built Executable (When Available)

**Note:** Pre-built executables will be available in GitHub Releases once the automated build system creates them. Check the releases page to see if they're available.

### Step 1: Check GitHub Releases

1. Open a web browser (on your computer or Pi)
2. Go to: **https://github.com/MuhammdAbdullah/stirling-engine-app/releases**
3. Look for the latest release
4. Check if there are AppImage files for ARM (ARM64 or ARMv7)

### Step 2: Find Your Pi Architecture

On your Raspberry Pi, run:
```bash
uname -m
```

- If it shows `aarch64` → You need **ARM64** version
- If it shows `armv7l` → You need **ARMv7** version

### Step 3: Download the Executable

**Method A: Download via Web Browser**

1. On the GitHub Releases page, find the AppImage file for your Pi:
   - For Pi 3/4/5: Look for file with `arm64` in the name
   - For Pi 1/2/Zero: Look for file with `armv7l` in the name
2. Click on the file to download it
3. Transfer it to your Raspberry Pi (via USB, network share, or download directly on Pi)

**Method B: Download via Terminal (on Pi)**

**First, check what releases are available:**
```bash
# Check available releases
curl -s https://api.github.com/repos/MuhammdAbdullah/stirling-engine-app/releases
```

**Then download the specific file you need:**
```bash
cd ~/Downloads

# For Raspberry Pi 3, 4, or 5 (ARM64)
# Replace "TAG_NAME" with the actual release tag (e.g., "v1.0.0")
# Replace "FILENAME" with the actual filename from the releases page
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/TAG_NAME/FILENAME-arm64.AppImage

# For Raspberry Pi 1, 2, or Zero (ARMv7)
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/TAG_NAME/FILENAME-armv7l.AppImage
```

**Method C: Download Latest Release Automatically (When Available)**

```bash
cd ~/Downloads

# This will work once releases are available
# For ARM64 (Pi 3/4/5)
LATEST_ARM64=$(curl -s https://api.github.com/repos/MuhammdAbdullah/stirling-engine-app/releases/latest | grep "browser_download_url.*arm64.AppImage" | cut -d '"' -f 4)
if [ ! -z "$LATEST_ARM64" ]; then
    wget $LATEST_ARM64
else
    echo "No ARM64 release found. Please check GitHub Releases page."
fi

# For ARMv7 (Pi 1/2/Zero)
LATEST_ARMV7=$(curl -s https://api.github.com/repos/MuhammdAbdullah/stirling-engine-app/releases/latest | grep "browser_download_url.*armv7l.AppImage" | cut -d '"' -f 4)
if [ ! -z "$LATEST_ARMV7" ]; then
    wget $LATEST_ARMV7
else
    echo "No ARMv7 release found. Please check GitHub Releases page."
fi
```

### Step 4: Make it Executable

```bash
cd ~/Downloads
chmod +x "Matrix Stirling Engine-"*.AppImage
```

### Step 5: Run the App

```bash
./"Matrix Stirling Engine-"*.AppImage
```

---

## Option 2: Build on Pi and Use the Built Executable

**This is the current method since pre-built executables aren't available yet.**

### Step 1: Clone the Repository

```bash
cd ~
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
```

### Step 2: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Build the App

```bash
# This automatically detects your Pi model and builds the correct version
bash build-raspberry-pi.sh
```

The built executable will be in the `dist/` folder.

### Step 5: Run the Built Executable

```bash
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

---

## Option 3: Transfer Built Executable from Another Computer

If you built the app on your Windows computer (for testing), you can transfer it to Pi:

### On Windows:

1. Build the app: `npm run build-linux-arm64` (or `build-linux-armv7l`)
2. Find the AppImage in the `dist/` folder
3. Transfer it to your Pi using one of these methods:

**Method A: Using SCP (from Windows PowerShell with OpenSSH)**

```powershell
# Replace with your Pi's IP address and username
scp "dist\Matrix Stirling Engine-1.0.0.AppImage" abdullah@192.168.1.123:~/Downloads/
```

**Method B: Using USB Drive**

1. Copy the AppImage to a USB drive
2. Plug USB drive into Raspberry Pi
3. Copy from USB to Pi:
   ```bash
   cp /media/pi/USBDRIVE/"Matrix Stirling Engine-"*.AppImage ~/Downloads/
   ```

**Method C: Using Network Share**

1. Share a folder on Windows
2. Mount it on Pi:
   ```bash
   sudo mkdir /mnt/windows
   sudo mount -t cifs //WINDOWS_IP/shared_folder /mnt/windows -o username=your_username
   cp /mnt/windows/"Matrix Stirling Engine-"*.AppImage ~/Downloads/
   ```

---

## Fix Serial Port Permissions (One-time Setup)

After downloading or building, fix serial port permissions:

```bash
sudo usermod -a -G dialout $USER
```

Then **log out and log back in** (or restart your Pi).

---

## Quick Commands Summary

**Download from GitHub (when available):**

**Step 1: Check what's available on GitHub Releases page first:**
- Go to: https://github.com/MuhammdAbdullah/stirling-engine-app/releases
- Find the release tag (e.g., "v1.0.0") and exact filename

**Step 2: Download using the correct tag and filename:**
```bash
cd ~/Downloads
# Replace TAG_NAME and FILENAME with actual values from GitHub Releases
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/TAG_NAME/FILENAME
chmod +x FILENAME
./FILENAME
```

**Or use the automatic method (when releases exist):**
```bash
cd ~/Downloads
LATEST=$(curl -s https://api.github.com/repos/MuhammdAbdullah/stirling-engine-app/releases/latest | grep "browser_download_url.*arm64.AppImage" | cut -d '"' -f 4)
wget $LATEST
chmod +x *.AppImage
./*.AppImage
```

**Build on Pi:**
```bash
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install
bash build-raspberry-pi.sh
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

---

## Troubleshooting

### "File not found" or "404 Not Found" when downloading

**This means:**
- The release doesn't exist yet on GitHub
- The version number or filename is incorrect
- The release hasn't been created yet

**Solution:**
1. Check the actual GitHub Releases page: https://github.com/MuhammdAbdullah/stirling-engine-app/releases
2. If no releases exist, use **Option 2: Build on Pi** instead
3. If releases exist but download fails, check the exact filename and tag name on the releases page

### "Permission denied" when running

```bash
chmod +x "Matrix Stirling Engine-"*.AppImage
```

### Serial port errors

```bash
sudo usermod -a -G dialout $USER
# Then log out and back in
```

### Wrong architecture error

Make sure you downloaded the correct version:
- `aarch64` Pi → ARM64 AppImage
- `armv7l` Pi → ARMv7 AppImage

Check your Pi architecture: `uname -m`

