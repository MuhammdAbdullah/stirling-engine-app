# Installing Matrix Stirling Engine App on Raspberry Pi

This guide explains how to download and run the Matrix Stirling Engine app on your Raspberry Pi.

---

## Quick Start: Download Pre-built Executable (Easiest)

**The easiest way is to download a pre-built executable from GitHub:**

1. Go to: https://github.com/MuhammdAbdullah/stirling-engine-app/releases
2. Download the AppImage file for your Raspberry Pi:
   - **ARM64** for Raspberry Pi 3, 4, or 5
   - **ARMv7** for Raspberry Pi 1, 2, or Zero
3. Make it executable and run:
   ```bash
   chmod +x "Matrix Stirling Engine-"*.AppImage
   ./"Matrix Stirling Engine-"*.AppImage
   ```

**That's it!** No building required.

---

## Build from Source (If you need the latest code)

If you want to build from source or the pre-built version isn't available yet:

---

## Prerequisites

- Raspberry Pi (any model) with Raspberry Pi OS installed
- Internet connection
- USB cable to connect to the Stirling Engine hardware

---

## Step 1: Open Terminal on Raspberry Pi

1. Open Terminal on your Raspberry Pi (or connect via SSH)
2. Make sure you're in your home directory:
   ```bash
   cd ~
   ```

---

## Step 2: Install Node.js

The app requires Node.js version 18 or higher.

**Check if Node.js is already installed:**
```bash
node --version
```

**If Node.js is not installed or version is too old, install it:**

```bash
# Download and install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

---

## Step 3: Clone the Repository

```bash
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
```

---

## Step 4: Install Dependencies

```bash
npm install
```

This will install all required packages including Electron and serialport. **This may take 5-10 minutes** on Raspberry Pi.

---

## Step 5: Build the App for Raspberry Pi

Run the build script that automatically detects your Pi's architecture:

```bash
bash build-raspberry-pi.sh
```

**Or build manually for your specific Pi model:**

**For Raspberry Pi 3, 4, or 5 (ARM64):**
```bash
npm run build-linux-arm64
```

**For Raspberry Pi 1, 2, or Zero (ARMv7):**
```bash
npm run build-linux-armv7l
```

The build process will take several minutes. When complete, you'll find the built files in the `dist/` folder.

---

## Step 6: Run the App

You have three options to run the app:

### Option A: Run from Source (Development Mode)

```bash
npm start
```

### Option B: Run the Built AppImage

```bash
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

### Option C: Install the DEB Package

```bash
cd dist
sudo dpkg -i stirling-engine-monitor_*.deb
```

Then launch it from the Applications menu, or run:
```bash
matrix-stirling-engine
```

---

## Step 7: Connect Hardware

1. Connect your Stirling Engine hardware via USB cable
2. The app will automatically detect the connection
3. The status banner will turn green when connected

---

## Troubleshooting

### "Permission denied" when running AppImage

Make the file executable:
```bash
chmod +x "Matrix Stirling Engine-"*.AppImage
```

### Serial port permission errors

Add your user to the dialout group:
```bash
sudo usermod -a -G dialout $USER
```
Then log out and log back in for changes to take effect.

### Build fails with "serialport" errors

The serialport module needs to be compiled for ARM. Make sure you're building on the Raspberry Pi itself, not cross-compiling from another machine.

### App won't start

Check for errors:
```bash
npm start
```

Look for error messages in the terminal output.

### Hardware not detected

1. Check USB connection: `lsusb`
2. Verify the device appears: `dmesg | tail`
3. Check serial port permissions (see above)

---

## Updating the App

To get the latest version:

```bash
cd ~/stirling-engine-app
git pull
npm install
bash build-raspberry-pi.sh
```

---

## Quick Start Summary

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone repository
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app

# 3. Install dependencies
npm install

# 4. Build for Raspberry Pi
bash build-raspberry-pi.sh

# 5. Run the app
npm start
```

---

## Need Help?

- Check the main [README.md](README.md) for general app usage
- Check [LINUX-INSTALL.md](LINUX-INSTALL.md) for Linux-specific instructions
- Open an issue on GitHub if you encounter problems

