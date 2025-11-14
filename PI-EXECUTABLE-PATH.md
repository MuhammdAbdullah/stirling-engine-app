# Raspberry Pi Executable Path Guide

## Important: No ARM Executables in Current dist/ Folder

The files currently in the `dist/` folder on your Windows computer are **NOT** for Raspberry Pi:
- `Matrix Stirling Engine-1.0.0.AppImage` → **x64 (Intel/AMD)**, not ARM
- `stirling-engine-monitor_1.0.0_amd64.deb` → **"amd64" means x64**, not ARM
- These will **NOT work** on Raspberry Pi

---

## Where Raspberry Pi Executables Will Be

### Option 1: Build on Raspberry Pi (Recommended)

When you build on your Raspberry Pi, the executable will be created at:

```bash
~/stirling-engine-app/dist/Matrix Stirling Engine-1.0.0.AppImage
```

**Full path example:**
```
/home/pi/stirling-engine-app/dist/Matrix Stirling Engine-1.0.0.AppImage
```

**To build and use it:**
```bash
# On your Raspberry Pi
cd ~/stirling-engine-app
npm install
bash build-raspberry-pi.sh

# The executable will be in:
cd dist
ls -lh "Matrix Stirling Engine-"*.AppImage

# Run it:
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

---

### Option 2: Download from GitHub Releases (When Available)

Once ARM executables are built and uploaded to GitHub Releases, you can download them to:

```bash
# Download location (you choose)
~/Downloads/Matrix-Stirling-Engine-1.0.0-arm64.AppImage
# or
~/Downloads/Matrix-Stirling-Engine-1.0.0-armv7l.AppImage
```

**Path structure:**
- **ARM64** (Pi 3/4/5): `~/Downloads/Matrix-Stirling-Engine-1.0.0-arm64.AppImage`
- **ARMv7** (Pi 1/2/Zero): `~/Downloads/Matrix-Stirling-Engine-1.0.0-armv7l.AppImage`

---

## Current Windows dist/ Folder Structure

On your Windows computer, the `dist/` folder contains:

```
E:\Thermo\Striling Engine\dist\
├── Matrix Stirling Engine-1.0.0.AppImage          (x64 Linux - NOT for Pi)
├── Matrix Stirling Engine Setup 1.0.0.exe         (Windows)
├── stirling-engine-monitor_1.0.0_amd64.deb        (x64 Linux - NOT for Pi)
└── stirling-engine-monitor-1.0.0.tar.gz           (x64 Linux - NOT for Pi)
```

**These files are for:**
- ✅ Windows computers
- ✅ x64 Linux computers (Intel/AMD processors)
- ❌ **NOT for Raspberry Pi** (ARM processors)

---

## How to Get Raspberry Pi Executable

### Method 1: Build on Raspberry Pi

1. **On your Raspberry Pi:**
   ```bash
   git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
   cd stirling-engine-app
   npm install
   bash build-raspberry-pi.sh
   ```

2. **The executable will be at:**
   ```bash
   ~/stirling-engine-app/dist/Matrix Stirling Engine-1.0.0.AppImage
   ```

3. **Run it:**
   ```bash
   cd ~/stirling-engine-app/dist
   chmod +x "Matrix Stirling Engine-"*.AppImage
   ./"Matrix Stirling Engine-"*.AppImage
   ```

### Method 2: Wait for Automated Builds

Once the GitHub Actions workflow is set up, ARM executables will be automatically built and available in GitHub Releases. Then you can download them.

---

## Summary

**Current situation:**
- ❌ No ARM executables in `dist/` folder
- ✅ x64 Linux and Windows executables exist (but won't work on Pi)

**To get Pi executable:**
- Build on Raspberry Pi → File will be at `~/stirling-engine-app/dist/Matrix Stirling Engine-1.0.0.AppImage`
- Or download from GitHub Releases (when available) → Save to `~/Downloads/` or any location you choose

**The path you need:**
- If built on Pi: `~/stirling-engine-app/dist/Matrix Stirling Engine-1.0.0.AppImage`
- If downloaded: `~/Downloads/Matrix-Stirling-Engine-1.0.0-arm64.AppImage` (or wherever you save it)

