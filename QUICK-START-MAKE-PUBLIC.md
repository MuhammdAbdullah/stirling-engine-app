# Quick Start: Make Raspberry Pi Executable Publicly Available

## ⚡ Fastest Way (5 minutes)

### Step 1: Open GitHub in Browser
Go to: **https://github.com/MuhammdAbdullah/stirling-engine-app**

### Step 2: Create Workflow File
1. Click **"Add file"** → **"Create new file"**
2. Type this exact path: `.github/workflows/build-raspberry-pi.yml`
3. Copy ALL the content from the file below and paste it

### Step 3: Copy This Content

```yaml
name: Build for Raspberry Pi

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-arm64:
    name: Build ARM64 (Pi 3/4/5)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up QEMU for ARM64
        uses: docker/setup-qemu-action@v2
        with:
          platforms: arm64

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install build dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libudev-dev build-essential

      - name: Install dependencies
        run: npm install
        env:
          npm_config_arch: arm64

      - name: Rebuild native modules for ARM64
        run: |
          npm rebuild serialport --target_arch=arm64

      - name: Build for ARM64
        run: npm run build-linux-arm64
        env:
          npm_config_arch: arm64

      - name: Upload ARM64 artifacts
        uses: actions/upload-artifact@v3
        with:
          name: raspberry-pi-arm64
          path: dist/*.AppImage
          retention-days: 30

  build-armv7l:
    name: Build ARMv7 (Pi 1/2/Zero)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up QEMU for ARMv7
        uses: docker/setup-qemu-action@v2
        with:
          platforms: arm

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install build dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y libudev-dev build-essential

      - name: Install dependencies
        run: npm install
        env:
          npm_config_arch: armv7l

      - name: Rebuild native modules for ARMv7
        run: |
          npm rebuild serialport --target_arch=armv7l

      - name: Build for ARMv7l
        run: npm run build-linux-armv7l
        env:
          npm_config_arch: armv7l

      - name: Upload ARMv7l artifacts
        uses: actions/upload-artifact@v3
        with:
          name: raspberry-pi-armv7l
          path: dist/*.AppImage
          retention-days: 30

  create-release:
    name: Create Release with Builds
    needs: [build-arm64, build-armv7l]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download ARM64 artifacts
        uses: actions/download-artifact@v3
        with:
          name: raspberry-pi-arm64
          path: ./artifacts/arm64

      - name: Download ARMv7l artifacts
        uses: actions/download-artifact@v3
        with:
          name: raspberry-pi-armv7l
          path: ./artifacts/armv7l

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            ./artifacts/arm64/*
            ./artifacts/armv7l/*
          tag_name: v${{ github.run_number }}
          name: Release v${{ github.run_number }} - Raspberry Pi Builds
          body: |
            Pre-built executables for Raspberry Pi
            
            **ARM64** (Raspberry Pi 3, 4, 5):
            - Download the AppImage file
            - Make it executable: `chmod +x "Matrix Stirling Engine-"*.AppImage`
            - Run: `./"Matrix Stirling Engine-"*.AppImage`
            
            **ARMv7** (Raspberry Pi 1, 2, Zero):
            - Download the AppImage file
            - Make it executable: `chmod +x "Matrix Stirling Engine-"*.AppImage`
            - Run: `./"Matrix Stirling Engine-"*.AppImage`
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Step 4: Commit
1. Scroll down
2. Commit message: `Add GitHub Actions workflow for automated Raspberry Pi builds`
3. Click **"Commit new file"**

### Step 5: Wait for Build (10-15 minutes)
1. Go to **"Actions"** tab
2. Watch the build progress
3. When complete, go to **"Releases"** tab
4. Your executable will be there! 🎉

## ✅ Result

After the build completes, anyone can download the Raspberry Pi executable from:
**https://github.com/MuhammdAbdullah/stirling-engine-app/releases**

The executable will be automatically rebuilt every time you push changes to the main branch!

## Need Help?

See detailed instructions in: **ADD-WORKFLOW-INSTRUCTIONS.md**

