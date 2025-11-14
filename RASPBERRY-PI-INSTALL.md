# Installing Matrix Stirling Engine App on Raspberry Pi

Simple step-by-step guide to install the app using pre-built executables from GitHub.

---

## Method 1: Download Pre-built Executable (Recommended - Easiest)

**This is the easiest way - just download and run!**

### Step 1: Find Your Raspberry Pi Model

Check which Raspberry Pi you have:
- **Raspberry Pi 3, 4, or 5** → Use **ARM64** version
- **Raspberry Pi 1, 2, or Zero** → Use **ARMv7** version

To check your Pi model, run:
```bash
uname -m
```
- If it shows `aarch64` → You need **ARM64**
- If it shows `armv7l` → You need **ARMv7**

### Step 2: Download from GitHub

1. Open a web browser on your Raspberry Pi (or download on your computer and transfer it)
2. Go to: **https://github.com/MuhammdAbdullah/stirling-engine-app/releases**
3. Find the latest release
4. Download the AppImage file:
   - Look for file ending in `-arm64.AppImage` (for Pi 3/4/5)
   - Or file ending in `-armv7l.AppImage` (for Pi 1/2/Zero)

**Or download directly from terminal:**
```bash
# For Raspberry Pi 3, 4, or 5 (ARM64)
cd ~/Downloads
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/latest/download/Matrix-Stirling-Engine-1.0.0-arm64.AppImage

# For Raspberry Pi 1, 2, or Zero (ARMv7)
cd ~/Downloads
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/latest/download/Matrix-Stirling-Engine-1.0.0-armv7l.AppImage
```

### Step 3: Make it Executable

```bash
cd ~/Downloads
chmod +x "Matrix Stirling Engine-"*.AppImage
```

### Step 4: Run the App

```bash
./"Matrix Stirling Engine-"*.AppImage
```

**That's it!** The app should start.

### Step 5: Fix Serial Port Permissions (One-time setup)

If you get permission errors when connecting hardware, run this once:

```bash
sudo usermod -a -G dialout $USER
```

Then **log out and log back in** (or restart your Pi) for the change to take effect.

---

## Method 2: Build from Source (If pre-built isn't available)

Only use this if the pre-built executable isn't available or you need the latest code.

### Prerequisites

- Raspberry Pi with Raspberry Pi OS
- Internet connection

### Step 1: Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Clone the Repository

```bash
cd ~
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
```

### Step 3: Install Dependencies

```bash
npm install
```

**This takes 5-10 minutes** on Raspberry Pi.

### Step 4: Build the App

```bash
# The script automatically detects your Pi model
bash build-raspberry-pi.sh
```

Or build manually:
```bash
# For Raspberry Pi 3, 4, or 5
npm run build-linux-arm64

# For Raspberry Pi 1, 2, or Zero
npm run build-linux-armv7l
```

### Step 5: Run the App

```bash
# Option 1: Run from source
npm start

# Option 2: Run the built AppImage
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

---

## Connecting Your Hardware

1. Connect your Stirling Engine hardware via USB cable to the Raspberry Pi
2. Open the app (if not already running)
3. The app will automatically detect the connection
4. The status banner will turn green showing "SYSTEM ONLINE"

---

## Troubleshooting

### "Permission denied" when running AppImage

```bash
chmod +x "Matrix Stirling Engine-"*.AppImage
```

### Serial port permission errors

```bash
sudo usermod -a -G dialout $USER
```
Then log out and log back in.

### App won't start

Check for error messages in the terminal. Make sure you downloaded the correct version (ARM64 vs ARMv7) for your Pi model.

### Hardware not detected

1. Check USB connection: `lsusb`
2. Check if device appears: `dmesg | tail`
3. Verify serial port permissions (see above)

### "File not found" when downloading

The GitHub Releases page might not have builds yet. In that case:
- Use Method 2 (Build from Source) instead
- Or wait for the GitHub Actions workflow to build and release the executables

---

## Updating the App

### If you used Method 1 (Pre-built executable):

1. Download the new AppImage from GitHub Releases
2. Replace the old file
3. Run the new version

### If you used Method 2 (Built from source):

```bash
cd ~/stirling-engine-app
git pull
npm install
bash build-raspberry-pi.sh
```

---

## Quick Reference

**Download pre-built (easiest):**
```bash
# 1. Download from GitHub Releases
# 2. Make executable
chmod +x "Matrix Stirling Engine-"*.AppImage
# 3. Run
./"Matrix Stirling Engine-"*.AppImage
```

**Build from source:**
```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone and build
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
npm install
bash build-raspberry-pi.sh
npm start
```

---

## Need Help?

- Check the main [README.md](README.md) for app usage
- Check [LINUX-INSTALL.md](LINUX-INSTALL.md) for Linux details
- Open an issue on GitHub: https://github.com/MuhammdAbdullah/stirling-engine-app/issues
