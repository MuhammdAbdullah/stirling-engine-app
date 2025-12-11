# Building for Raspberry Pi ARM64 (aarch64)

This guide explains how to build the Matrix Stirling Engine app for Raspberry Pi running ARM64 architecture.

## Quick Build Steps

### On Raspberry Pi (Recommended)

1. **Install Node.js** (if not already installed):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
   cd stirling-engine-app
   ```

3. **Run the build script**:
   ```bash
   bash build-raspberry-pi.sh
   ```

   The script will:
   - Detect your Raspberry Pi architecture (ARM64 or ARMv7)
   - Install dependencies if needed
   - Rebuild the serialport library for ARM architecture
   - Build the app for your specific architecture

4. **Find your built app**:
   ```bash
   cd dist
   ls -lh *.AppImage *.deb *.tar.gz
   ```

### Manual Build (Alternative)

If you prefer to build manually:

```bash
# Install dependencies
npm install

# Rebuild serialport for ARM64
npm rebuild serialport

# Build for ARM64
npm run build-linux-arm64
```

## What Gets Built

The build process creates three package formats:

1. **AppImage** - Standalone executable (recommended)
   - File: `Matrix Stirling Engine-1.0.0-arm64.AppImage`
   - Usage: `chmod +x *.AppImage && ./"Matrix Stirling Engine-"*.AppImage`

2. **DEB package** - Debian package for easy installation
   - File: `stirling-engine-monitor_1.0.0_arm64.deb`
   - Usage: `sudo dpkg -i stirling-engine-monitor_1.0.0_arm64.deb`

3. **TAR.GZ archive** - Compressed archive
   - File: `stirling-engine-monitor-1.0.0-arm64.tar.gz`
   - Usage: Extract and run the executable inside

## Serial Library

The app includes the `serialport` library which is automatically rebuilt for ARM64 architecture during the build process. The library supports:

- **Windows**: Uses Windows serial port drivers
- **Linux (x64)**: Uses Linux serial port drivers  
- **Linux (ARM64)**: Uses Linux ARM64 serial port drivers (for Raspberry Pi)
- **Linux (ARMv7)**: Uses Linux ARMv7 serial port drivers (for older Raspberry Pi)

All platform-specific serial libraries are included in the build - nothing is removed.

## Requirements

- Raspberry Pi 3, 4, or 5 (for ARM64)
- Raspberry Pi OS (Debian-based Linux)
- Node.js 18.x or later
- Internet connection (for downloading dependencies)

## Troubleshooting

### Build fails with "serialport rebuild error"

Make sure you have build tools installed:
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

### "Permission denied" when running AppImage

Make the file executable:
```bash
chmod +x "Matrix Stirling Engine-"*.AppImage
```

### Serial port not detected

Add your user to the dialout group:
```bash
sudo usermod -a -G dialout $USER
```
Then log out and log back in.

## Notes

- The build must be done **on** a Raspberry Pi (or Linux machine with ARM support)
- Native modules like `serialport` cannot be cross-compiled from Windows
- The serialport library is automatically rebuilt for the target architecture
- All necessary files are included in the build automatically

