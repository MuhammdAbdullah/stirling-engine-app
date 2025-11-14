# Building Raspberry Pi Executable - Instructions

## Important Note

**You cannot build ARM64 Linux executables from Windows.** Native modules like `serialport` must be compiled on the target architecture (ARM64 Linux).

## Option 1: Build on Raspberry Pi (Recommended)

### Step 1: Transfer Files to Raspberry Pi

Copy your project folder to your Raspberry Pi using one of these methods:

**Method A: Using Git (if you have a repository)**
```bash
# On Raspberry Pi
cd ~
git clone <your-repository-url>
cd stirling-engine-app
```

**Method B: Using SCP from Windows**
```powershell
# On Windows PowerShell
scp -r "E:\Thermo\Striling Engine" pi@<raspberry-pi-ip>:~/stirling-engine-app
```

**Method C: Using USB Drive**
1. Copy the entire project folder to a USB drive
2. Plug USB drive into Raspberry Pi
3. Copy files: `cp -r /media/pi/USB-DRIVE-NAME/Striling\ Engine ~/stirling-engine-app`

### Step 2: Run the Build Script

```bash
# On Raspberry Pi
cd ~/stirling-engine-app
chmod +x build-pi-executable.sh
bash build-pi-executable.sh
```

The script will:
- Install Node.js if needed
- Install build tools if needed
- Install all dependencies
- Rebuild serialport for ARM64
- Build the executable

### Step 3: Find Your Executable

After building, your executable will be in the `dist` folder:

```bash
cd dist
ls -lh
```

You'll see files like:
- `Matrix Stirling Engine-1.0.0-arm64.AppImage` (standalone executable)
- `stirling-engine-monitor_1.0.0_arm64.deb` (Debian package)
- `stirling-engine-monitor-1.0.0-arm64.tar.gz` (compressed archive)

### Step 4: Run the App

```bash
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

## Option 2: Use WSL (Windows Subsystem for Linux)

If you have WSL installed:

1. **Open WSL**:
   ```powershell
   wsl
   ```

2. **Navigate to your project**:
   ```bash
   cd /mnt/e/Thermo/Striling\ Engine
   ```

3. **Note**: WSL runs on x64, not ARM64, so you still can't build ARM64 executables directly. You would need to use cross-compilation tools, which is complex.

**Recommendation**: Use Option 1 (build on Raspberry Pi) - it's simpler and more reliable.

## Option 3: Automated Build with GitHub Actions

If you push your code to GitHub, you can set up automated builds. Create `.github/workflows/build-pi.yml`:

```yaml
name: Build Raspberry Pi ARM64

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm rebuild serialport
      - run: npm run build-linux-arm64
      - uses: actions/upload-artifact@v3
        with:
          name: arm64-build
          path: dist/*
```

## Quick Reference

**On Raspberry Pi:**
```bash
# 1. Navigate to project
cd ~/stirling-engine-app

# 2. Run build script
bash build-pi-executable.sh

# 3. Run the app
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

## Troubleshooting

### "Permission denied" when running script
```bash
chmod +x build-pi-executable.sh
```

### "Build tools not found" error
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

### "Serialport rebuild failed"
Make sure you have build tools installed (see above), then:
```bash
npm rebuild serialport
```

### Serial port permission errors
```bash
sudo usermod -a -G dialout $USER
# Then log out and log back in
```

## Summary

**The executable MUST be built on a Raspberry Pi or Linux machine with ARM64 support.** Windows cannot build ARM64 Linux executables due to native module compilation requirements.

The easiest way is to:
1. Copy your project to Raspberry Pi
2. Run `bash build-pi-executable.sh`
3. Find the executable in the `dist` folder

