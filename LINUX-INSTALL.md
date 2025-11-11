# Linux Installation Guide

This guide explains how to download and install the Matrix Stirling Engine Monitor app on Linux systems.

## Quick Start

The easiest way is to use the **AppImage** format - no installation needed, just download and run!

## Download from GitHub

### Repository Link
**GitHub:** https://github.com/MuhammdAbdullah/stirling-engine-app

### Direct Download Links

You can download the Linux packages directly using these links:

1. **AppImage** (Recommended):
   - https://github.com/MuhammdAbdullah/stirling-engine-app/raw/main/dist/Matrix%20Stirling%20Engine-1.0.0.AppImage

2. **DEB Package** (For Ubuntu/Debian):
   - https://github.com/MuhammdAbdullah/stirling-engine-app/raw/main/dist/stirling-engine-monitor_1.0.0_amd64.deb

3. **TAR.GZ Archive** (Portable):
   - https://github.com/MuhammdAbdullah/stirling-engine-app/raw/main/dist/stirling-engine-monitor-1.0.0.tar.gz

## Installation Methods

### Method 1: AppImage (Easiest - No Installation Required)

**Best for:** Quick testing, portable use, any Linux distribution

**Steps:**

1. **Download the AppImage**
   ```bash
   cd ~/Downloads
   wget "https://github.com/MuhammdAbdullah/stirling-engine-app/raw/main/dist/Matrix%20Stirling%20Engine-1.0.0.AppImage" -O "Matrix Stirling Engine-1.0.0.AppImage"
   ```

   Or download it from your web browser by visiting the GitHub repository.

2. **Make it executable**
   ```bash
   chmod +x "Matrix Stirling Engine-1.0.0.AppImage"
   ```

3. **Run the application**
   ```bash
   ./"Matrix Stirling Engine-1.0.0.AppImage"
   ```

   **Tip:** You can also double-click the AppImage file in your file manager after making it executable.

**To move to a permanent location:**
```bash
# Move to Applications folder
mkdir -p ~/Applications
mv "Matrix Stirling Engine-1.0.0.AppImage" ~/Applications/

# Or move to system-wide location (requires sudo)
sudo mv "Matrix Stirling Engine-1.0.0.AppImage" /opt/
```

---

### Method 2: DEB Package (For Ubuntu/Debian/Linux Mint)

**Best for:** Ubuntu, Debian, and Debian-based distributions

**Prerequisites:**
- Ubuntu 18.04 or later
- Debian 10 or later
- sudo access

**Steps:**

1. **Download the DEB package**
   ```bash
   cd ~/Downloads
   wget "https://github.com/MuhammdAbdullah/stirling-engine-app/raw/main/dist/stirling-engine-monitor_1.0.0_amd64.deb"
   ```

2. **Install the package**
   ```bash
   sudo dpkg -i stirling-engine-monitor_1.0.0_amd64.deb
   ```

3. **Fix any missing dependencies (if needed)**
   ```bash
   sudo apt-get update
   sudo apt-get install -f
   ```

4. **Run the application**
   - **From Applications Menu:** Search for "Matrix Stirling Engine" in your applications menu
   - **From Terminal:** Type `stirling-engine-monitor` and press Enter

**To uninstall:**
```bash
sudo dpkg -r stirling-engine-monitor
```

---

### Method 3: TAR.GZ Archive (Portable)

**Best for:** Portable installation, any Linux distribution, custom installations

**Steps:**

1. **Download the TAR.GZ archive**
   ```bash
   cd ~/Downloads
   wget "https://github.com/MuhammdAbdullah/stirling-engine-app/raw/main/dist/stirling-engine-monitor-1.0.0.tar.gz"
   ```

2. **Extract the archive**
   ```bash
   tar -xzf stirling-engine-monitor-1.0.0.tar.gz
   cd stirling-engine-monitor-1.0.0
   ```

3. **Run the application**
   ```bash
   ./stirling-engine-monitor
   ```

**To move to a permanent location:**
```bash
# Move the extracted folder to opt
sudo mv stirling-engine-monitor-1.0.0 /opt/stirling-engine-monitor

# Create a symlink for easy access
sudo ln -s /opt/stirling-engine-monitor/stirling-engine-monitor /usr/local/bin/stirling-engine-monitor

# Now you can run it from anywhere with:
stirling-engine-monitor
```

---

## Troubleshooting

### AppImage won't run
- Make sure you made it executable: `chmod +x "Matrix Stirling Engine-1.0.0.AppImage"`
- Check if your system supports AppImage (most modern Linux distributions do)
- Try running from terminal to see error messages

### DEB installation fails
- Make sure you have internet connection for dependency installation
- Try: `sudo apt-get update && sudo apt-get install -f`
- Check if you're using a compatible Linux distribution (Ubuntu/Debian)

### Application won't start
- Check if you have required libraries installed:
  ```bash
  sudo apt-get install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0 libappindicator3-1
  ```
- For Fedora/RHEL/CentOS:
  ```bash
  sudo dnf install gtk3 libnotify nss libXScrnSaver libXtst xdg-utils at-spi2-atk libuuid libsecret libappindicator
  ```

### Permission denied errors
- Make sure you have execute permissions: `chmod +x filename`
- For system-wide installation, use `sudo` when needed

---

## System Requirements

- **OS:** Linux (x86_64/amd64)
- **Architecture:** 64-bit
- **RAM:** 512 MB minimum, 1 GB recommended
- **Disk Space:** 200 MB for installation

---

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Visit the GitHub repository: https://github.com/MuhammdAbdullah/stirling-engine-app
3. Check that your Linux distribution is supported

---

## Uninstalling

### AppImage
Simply delete the AppImage file:
```bash
rm ~/Downloads/"Matrix Stirling Engine-1.0.0.AppImage"
```

### DEB Package
```bash
sudo dpkg -r stirling-engine-monitor
```

### TAR.GZ Archive
Delete the extracted folder:
```bash
rm -rf ~/Downloads/stirling-engine-monitor-1.0.0
```


