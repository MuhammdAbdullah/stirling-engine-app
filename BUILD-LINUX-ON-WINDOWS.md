# Building Linux Versions on Windows

## The Problem
Native modules like `serialport` cannot be cross-compiled from Windows to Linux. You need a Linux environment to build Linux versions.

## Solution Options

### Option 1: Use WSL (Windows Subsystem for Linux) - **RECOMMENDED**

#### Step 1: Install WSL (if not already installed)
```powershell
wsl --install
```
Restart your computer after installation.

#### Step 2: Setup WSL
```powershell
# Open WSL
wsl

# Install Node.js in WSL
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get update
sudo apt-get install -y build-essential libudev-dev
```

#### Step 3: Build Linux versions
**From Windows PowerShell:**
```powershell
.\build-linux-wsl.ps1
```

**Or manually in WSL:**
```bash
wsl
cd /mnt/e/Thermo/Striling\ Engine
npm install
npm run build-linux-x64
```

---

### Option 2: Use Docker

#### Step 1: Install Docker Desktop
Download from: https://www.docker.com/products/docker-desktop

#### Step 2: Build using Docker
```powershell
# Build Linux x64
docker run --rm -v "${PWD}:/project" -w /project node:18 bash -c "npm install && npm run build-linux-x64"
```

---

### Option 3: Build on Raspberry Pi Directly

For ARM64 builds, build directly on your Pi:

```bash
# SSH into Pi
ssh abdullah@192.168.1.96

# Navigate to project
cd ~/stirling-engine-build

# Build
npm run build-linux-arm64
```

---

### Option 4: Use GitHub Actions (Already Configured)

Your project already has GitHub Actions workflows. Push to GitHub and let it build automatically!

---

## Quick Commands

### Build Linux x64 (requires WSL or Linux)
```bash
npm run build-linux-x64
```

### Build Linux ARM64 (requires Linux/ARM64)
```bash
npm run build-linux-arm64
```

### Build with skipped native rebuilds (Won't work with serialport!)
```bash
npm run build-linux-x64-skip-native
```

---

## Troubleshooting

### "Cannot find module 'serialport'"
- Make sure you ran `npm install` in the Linux environment (WSL/Docker)
- Native modules must be installed in the target platform

### "spawn EINVAL" error
- This happens when trying to cross-compile native modules
- Use WSL, Docker, or build on Linux directly

### Build succeeds but app doesn't work
- Make sure native modules were built for the correct architecture
- Check that all dependencies are included in the build

---

## Recommended Workflow

1. **Development**: Use Windows (works fine)
2. **Linux x64 builds**: Use WSL
3. **Linux ARM64 builds**: Build on Raspberry Pi or use GitHub Actions

