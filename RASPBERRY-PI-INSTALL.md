# Installing Matrix Stirling Engine App on Raspberry Pi

Simple step-by-step guide to install the app using pre-built executables from GitHub.

---

## Method 1: Download Pre-built Executable (When Available)

**Note:** Pre-built executables will be available in GitHub Releases once the automated build system is set up. For now, please use **Method 2: Build from Source** below.

### When Pre-built Executables Are Available:

1. Go to: **https://github.com/MuhammdAbdullah/stirling-engine-app/releases**
2. Find the latest release
3. Download the AppImage file for your Raspberry Pi:
   - **ARM64** for Raspberry Pi 3, 4, or 5
   - **ARMv7** for Raspberry Pi 1, 2, or Zero
4. Make it executable and run:
   ```bash
   chmod +x "Matrix Stirling Engine-"*.AppImage
   ./"Matrix Stirling Engine-"*.AppImage
   ```

---

## Method 2: Build from Source (Current Method - Recommended)

**This is the current recommended method** - build the app directly on your Raspberry Pi. Pre-built executables will be available in the future once the automated build system is set up.

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

Pre-built executables are not yet available. Please use **Method 2: Build from Source** instead. The automated build system will be set up soon to provide pre-built executables.

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

**Build from source (current method):**
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
