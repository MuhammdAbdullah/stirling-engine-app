# Installing App from GitHub on Raspberry Pi via SSH (Windows)

This guide shows you how to install the Matrix Stirling Engine app on your Raspberry Pi by connecting from Windows using SSH and cloning from GitHub.

---

## What You Need

- **Windows computer** with PowerShell or Command Prompt
- **Raspberry Pi** connected to the same network
- **Pi's IP address** (you can find this in your router settings or by running `hostname -I` on the Pi)
- **Pi username and password**

## Important: Which Version to Build

**Use ARM64 version** - This works on Raspberry Pi 3, 4, and 5 (most common models).

- ✅ **ARM64** (`build-linux-arm64`) - Use this for most Pi models
- ⚠️ **ARMv7** (`build-linux-armv7l`) - Only for very old Pi 1, 2, or Zero

**If you're not sure which Pi you have, use ARM64 - it's the default and works on most models.**

---

## Step 1: Connect to Your Raspberry Pi via SSH

Open **PowerShell** or **Command Prompt** on your Windows computer.

### Option A: Using PowerShell (Recommended)

```powershell
ssh abdullah@192.168.1.96
```

**Replace these values:**
- `abdullah` = your Pi username
- `192.168.1.96` = your Pi's IP address

### Option B: Using Command Prompt

```cmd
ssh abdullah@192.168.1.96
```

**What happens:**
- You'll be asked "Are you sure you want to continue connecting?" - type `yes` and press Enter
- You'll be asked for your password - type your Pi password (you won't see it as you type) and press Enter
- Once connected, you'll see a command prompt like `abdullah@raspberrypi:~$`

---

## Step 2: Install Node.js (If Not Already Installed)

Once you're connected to your Pi, check if Node.js is installed:

```bash
node --version
```

**If you see a version number** (like `v18.17.0`), skip to Step 3.

**If you see "command not found"**, install Node.js:

```bash
# Download and install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify it worked
node --version
npm --version
```

**This takes 2-3 minutes.**

---

## Step 3: Clone the App from GitHub

Navigate to your home folder and clone the repository:

```bash
# Go to home folder
cd ~

# Clone the repository from GitHub
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git

# Go into the app folder
cd stirling-engine-app
```

**What this does:** Downloads all the app files from GitHub to your Pi.

---

## Step 4: Install Dependencies

Install all the required packages (this is like installing all the parts the app needs to work):

```bash
npm install
```

**This takes 5-10 minutes** - be patient! You'll see lots of text scrolling by. This is normal.

**If you get errors**, you might need to install build tools first:

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

Then try `npm install` again.

---

## Step 5: Build the App for Raspberry Pi

**IMPORTANT: Use ARM64 version (unless you have a very old Pi)**

Most Raspberry Pi models use ARM64. 

### Option A: Use the Build Script (Recommended - Fixes fpm Issue)

We have a special script that fixes the fpm problem automatically:

```bash
# Make the script executable (first time only)
chmod +x build-arm64-pi.sh

# Run the build script
bash build-arm64-pi.sh
```

This script automatically clears the x86 fpm cache before building, so you won't get the "cannot execute binary file" error.

### Option B: Build Directly (May Show fpm Error)

If you prefer to build directly:

```bash
npm run build-linux-arm64
```

**Note:** This might show an error about fpm, but the AppImage will still build successfully. See troubleshooting section if this happens.

**Which version should you use?**

- **ARM64** (use this one!) - For Raspberry Pi 3, 4, or 5 (most common)
  - Command: `npm run build-linux-arm64`
  - **This is what you should use unless you have a very old Pi**

- **ARMv7** (only for old models) - For Raspberry Pi 1, 2, or Zero (very old)
  - Command: `npm run build-linux-armv7l`
  - Only use this if ARM64 doesn't work

**This takes 5-10 minutes** - the app is being compiled for your Pi.

**Important:** The build might show an error about "fpm" or "cannot execute binary file" when building the DEB package. **This is okay!** The AppImage and tar.gz files will still be built successfully, and you can use those instead. See the troubleshooting section below for details.

---

## Step 6: Install the Built App

After building, check what files were created:

```bash
# Go to the dist folder
cd dist

# List all files to see what was built
ls -la
```

You should see files like:
- `Matrix Stirling Engine-1.0.0-arm64.AppImage` (standalone executable - **recommended**)
- `stirling-engine-monitor-1.0.0-arm64.tar.gz` (compressed archive)
- `stirling-engine-monitor_1.0.0_arm64.deb` (Debian package - might not exist if build had errors)

### Option A: Use AppImage (Easiest - Recommended)

If you see an `.AppImage` file, use this method:

```bash
# Make it executable
chmod +x "Matrix Stirling Engine-"*.AppImage

# Run it
./"Matrix Stirling Engine-"*.AppImage
```

**To run it later**, just double-click the AppImage file or run the command above again.

### Option B: Install DEB Package (If Available)

If the DEB file was created successfully:

```bash
# Install the DEB package (replace filename with what you see)
sudo dpkg -i stirling-engine-monitor_1.0.0_arm64.deb

# Fix any missing dependencies
sudo apt-get install -f -y

# Then run the app
matrix-stirling-engine
```

**Note:** The filename might be slightly different - use `ls -la` to see the exact name.

---

## Step 7: Run the App

After installation, you can run the app:

```bash
matrix-stirling-engine
```

**Or** you can find it in your applications menu by searching for "Matrix Stirling Engine".

---

## Quick Reference - All Commands in Order

Copy and paste these commands one by one into your SSH session:

```bash
# 1. Check/Install Node.js
node --version
# If not found, run:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone from GitHub
cd ~
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app

# 3. Install dependencies
npm install

# 4. Build the app (ARM64 - use this for most Pi models)
# Option A: Use the build script (recommended - fixes fpm issue)
chmod +x build-arm64-pi.sh
bash build-arm64-pi.sh

# Option B: Build directly (may show fpm error, but AppImage will still work)
# npm run build-linux-arm64

# Note: Only use build-linux-armv7l if you have a very old Pi (Pi 1, 2, or Zero)

# 5. Check what was built
cd dist
ls -la

# 6. Run the app (use AppImage if DEB failed)
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage

# OR if DEB was built successfully:
# sudo dpkg -i stirling-engine-monitor_1.0.0_arm64.deb
# sudo apt-get install -f -y
# matrix-stirling-engine
```

---

## Troubleshooting

### "Permission denied" when connecting via SSH

- Make sure SSH is enabled on your Pi
- Check that you're using the correct username and password
- Verify the IP address is correct

### "git: command not found"

Install git:

```bash
sudo apt-get update
sudo apt-get install -y git
```

### Build fails with "fpm" or "cannot execute binary file" error

**This is a common issue!** The error happens when building the DEB package, but the AppImage will still be built successfully.

**What happened:** Even though you ran `build-linux-arm64`, electron-builder incorrectly downloads an x86 version of fpm (a package builder) which can't run on ARM64 Raspberry Pi. This is a bug in electron-builder - it downloads x86 fpm even when building for ARM64.

**Why this happens:** electron-builder has a bug where it always downloads x86 fpm binaries, regardless of what architecture you're building for. This is why you see x86 even when building ARM64.

**Solution 1: Use the Build Script (Easiest - Prevents the Error)**

Use the special build script that fixes this automatically:

```bash
chmod +x build-arm64-pi.sh
bash build-arm64-pi.sh
```

This script clears the x86 fpm cache before building, preventing the error.

**Solution 2: Use the AppImage (Works Even If DEB Failed)**

The AppImage file was built successfully even if the DEB failed. Just use it:

```bash
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

**Solution 3: Fix DEB Build by Installing fpm Natively**

If you really need the DEB package, install fpm natively:

```bash
# Install Ruby and fpm
sudo apt-get update
sudo apt-get install -y ruby ruby-dev build-essential
sudo gem install fpm

# Clear the bad fpm cache
rm -rf ~/.cache/electron-builder/fpm/fpm-*-linux-x86

# Try building again
cd ~/stirling-engine-app
npm run build-linux-arm64
```

**Note:** Installing fpm takes extra time. The AppImage works just as well and doesn't require installation!

### Build fails with other errors

Make sure you have build tools installed:

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

Then try building again.

### App won't start

Check for error messages. Make sure you built the correct version:
- **Use ARM64** (`build-linux-arm64`) for Raspberry Pi 3, 4, or 5
- **Use ARMv7** (`build-linux-armv7l`) only for very old Raspberry Pi 1, 2, or Zero

If you're not sure which Pi model you have, use ARM64 - it works on most models.

### Can't find the DEB file

List all files in the dist folder:

```bash
cd dist
ls -la *.deb
```

Then use the exact filename you see.

---

## Updating the App Later

To update the app after making changes on GitHub:

```bash
# Go to the app folder
cd ~/stirling-engine-app

# Get the latest changes from GitHub
git pull

# Reinstall dependencies (in case new ones were added)
npm install

# Rebuild (ARM64 version)
npm run build-linux-arm64

# Reinstall
cd dist
sudo dpkg -i stirling-engine-monitor_1.0.0_arm64.deb
sudo apt-get install -f -y
```

---

## Need Help?

- Check other guides in the `docs` folder
- Make sure your Pi is connected to the internet
- Verify you're using the correct GitHub repository URL
- Check that your Pi has enough storage space (you need at least 1GB free)

