# How to Add GitHub Actions Workflow - Step by Step

Follow these steps to make the Raspberry Pi executable publicly available:

## Step 1: Go to GitHub Repository

1. Open your browser and go to: **https://github.com/MuhammdAbdullah/stirling-engine-app**
2. Make sure you're logged in

## Step 2: Create the Workflow File

1. Click the **"Add file"** button (top right, next to "Code")
2. Select **"Create new file"**

## Step 3: Set the File Path

In the file path box, type exactly:
```
.github/workflows/build-raspberry-pi.yml
```

**Important:** GitHub will automatically create the `.github` and `workflows` folders when you type this path.

## Step 4: Copy and Paste the Content

Copy ALL the content below and paste it into the file editor:

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

## Step 5: Commit the File

1. Scroll down to the bottom of the page
2. In the "Commit new file" section:
   - **Commit message:** `Add GitHub Actions workflow for automated Raspberry Pi builds`
   - Leave "Add file via upload" unchecked
   - Click **"Commit new file"** button

## Step 6: Wait for Build to Complete

1. After committing, go to the **"Actions"** tab in your repository
2. You'll see a workflow run starting called "Build for Raspberry Pi"
3. Wait 10-15 minutes for the build to complete
4. Once complete, go to the **"Releases"** tab
5. You'll see a new release with the ARM64 and ARMv7 executables!

## Step 7: Verify Public Access

1. Open an incognito/private browser window (or log out)
2. Go to: **https://github.com/MuhammdAbdullah/stirling-engine-app/releases**
3. You should see the latest release with downloadable AppImage files
4. Anyone can now download the executables!

## Troubleshooting

### Workflow doesn't appear in Actions tab
- Make sure you created the file in the correct path: `.github/workflows/build-raspberry-pi.yml`
- Check that the file was committed to the `main` branch

### Build fails
- Check the Actions tab for error messages
- Common issues: missing dependencies, build timeout
- The workflow will automatically retry on the next push

### Release not created
- Make sure the workflow completed successfully
- Check that both ARM64 and ARMv7 builds succeeded
- Releases are only created when pushing to `main` branch

## What Happens Next

Once the workflow is added:
- **Every time you push to main branch:** GitHub will automatically build and create a new release
- **Manual trigger:** You can also manually trigger builds from the Actions tab
- **Public downloads:** Anyone can download the executables from the Releases page

The executables will be available at:
**https://github.com/MuhammdAbdullah/stirling-engine-app/releases**

