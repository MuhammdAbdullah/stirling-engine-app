# How to Create a GitHub Release with Executables

This guide explains how to create a GitHub release and upload the built executables.

---

## Current Situation

- Built files are in the `dist/` folder
- The `dist/` folder is in `.gitignore` (so files won't be pushed to git)
- You need to manually create a GitHub release and upload the files

---

## Method 1: Create Release via GitHub Website (Easiest)

### Step 1: Prepare Your Files

The built files are in the `dist/` folder:
- `Matrix Stirling Engine-1.0.0.AppImage` (Linux x64)
- `Matrix Stirling Engine Setup 1.0.0.exe` (Windows)
- `stirling-engine-monitor_1.0.0_amd64.deb` (Linux DEB package)
- `stirling-engine-monitor-1.0.0.tar.gz` (Linux TAR.GZ)

**Note:** These are built for x64 (Intel/AMD). For Raspberry Pi (ARM), you need to build on a Raspberry Pi or wait for the automated build system.

### Step 2: Create Release on GitHub

1. Go to your repository: https://github.com/MuhammdAbdullah/stirling-engine-app
2. Click on **"Releases"** (on the right side)
3. Click **"Create a new release"** or **"Draft a new release"**
4. Fill in:
   - **Tag version:** `v1.0.0` (or your version number)
   - **Release title:** `Release v1.0.0` (or your title)
   - **Description:** Add release notes describing what's in this release
5. Click **"Attach binaries"** or drag and drop your files:
   - `Matrix Stirling Engine-1.0.0.AppImage`
   - `Matrix Stirling Engine Setup 1.0.0.exe`
   - `stirling-engine-monitor_1.0.0_amd64.deb`
   - `stirling-engine-monitor-1.0.0.tar.gz`
6. Click **"Publish release"**

---

## Method 2: Create Release via GitHub CLI

If you have GitHub CLI installed:

```bash
# Install GitHub CLI (if not installed)
# Windows: winget install GitHub.cli
# Or download from: https://cli.github.com/

# Authenticate
gh auth login

# Create a release and upload files
gh release create v1.0.0 \
  "dist/Matrix Stirling Engine-1.0.0.AppImage" \
  "dist/Matrix Stirling Engine Setup 1.0.0.exe" \
  "dist/stirling-engine-monitor_1.0.0_amd64.deb" \
  "dist/stirling-engine-monitor-1.0.0.tar.gz" \
  --title "Release v1.0.0" \
  --notes "Initial release of Matrix Stirling Engine app"
```

---

## Method 3: Build Raspberry Pi Executables and Add to Release

### Option A: Build on Raspberry Pi

1. On your Raspberry Pi, follow the build instructions in `RASPBERRY-PI-INSTALL.md`
2. After building, you'll have ARM executables in the `dist/` folder
3. Upload those ARM AppImage files to the GitHub release

### Option B: Wait for Automated Builds

Once the GitHub Actions workflow is set up (`.github/workflows/build-raspberry-pi.yml`), it will automatically:
- Build ARM64 and ARMv7 executables
- Create releases with the built files
- No manual upload needed

---

## Recommended Release Structure

When creating a release, organize it like this:

**Release Title:** `Release v1.0.0`

**Release Notes:**
```
## Matrix Stirling Engine v1.0.0

### Downloads

**Windows:**
- Matrix Stirling Engine Setup 1.0.0.exe - Windows installer

**Linux (x64 - Intel/AMD):**
- Matrix Stirling Engine-1.0.0.AppImage - Portable AppImage
- stirling-engine-monitor_1.0.0_amd64.deb - DEB package for Debian/Ubuntu
- stirling-engine-monitor-1.0.0.tar.gz - TAR.GZ archive

**Raspberry Pi (ARM):**
- Coming soon - will be available via automated builds

### Installation

See [RASPBERRY-PI-INSTALL.md](RASPBERRY-PI-INSTALL.md) for installation instructions.
```

**Attached Files:**
- Windows installer
- Linux x64 AppImage
- Linux DEB package
- Linux TAR.GZ
- (ARM executables when available)

---

## Quick Steps Summary

1. **Build your app** (if not already built): `npm run build-win` or `npm run build-linux`
2. **Go to GitHub Releases page**: https://github.com/MuhammdAbdullah/stirling-engine-app/releases
3. **Click "Create a new release"**
4. **Set tag and title** (e.g., `v1.0.0`)
5. **Upload files** from the `dist/` folder
6. **Publish release**

---

## Notes

- The `dist/` folder is in `.gitignore`, so built files won't be committed to git
- Releases are separate from git commits - you manually upload files
- For automated releases, the GitHub Actions workflow will handle this
- Raspberry Pi ARM executables need to be built on a Pi or via automated builds

