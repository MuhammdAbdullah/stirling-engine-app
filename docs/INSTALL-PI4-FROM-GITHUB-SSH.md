# Install on Raspberry Pi 4 from GitHub via SSH - Step by Step

**IMPORTANT: Raspberry Pi 4 uses ARM64 architecture - NEVER use x86 or amd64 files!**

This guide shows you exactly how to install the app on your Raspberry Pi 4 by connecting via SSH and downloading from GitHub.

---

## What You Need Before Starting

- **Windows computer** with PowerShell
- **Raspberry Pi 4** connected to the same network
- **Pi's IP address** (find it in router settings or run `hostname -I` on the Pi)
- **Pi username and password**

---

## Step 1: Connect to Your Raspberry Pi via SSH

Open **PowerShell** on your Windows computer.

```powershell
ssh YOUR_USERNAME@YOUR_PI_IP_ADDRESS
```

**Replace:**
- `YOUR_USERNAME` = your Pi username (usually `pi` or your name)
- `YOUR_PI_IP_ADDRESS` = your Pi's IP address (like `192.168.1.100`)

**Example:**
```powershell
ssh pi@192.168.1.100
```

**What happens:**
- Type `yes` when asked "Are you sure you want to continue connecting?"
- Enter your Pi password (you won't see it as you type)
- You'll see a prompt like `pi@raspberrypi:~$` when connected

---

## Step 2: Verify You're on Raspberry Pi 4 (Check Architecture)

**This is CRITICAL - we need ARM64, NOT x86/64!**

Run this command to check your Pi's architecture:

```bash
uname -m
```

**What you should see:**
- `aarch64` = ARM64 ✅ **This is correct for Pi 4!**
- `armv7l` = ARMv7 (old Pi models)

**If you see `aarch64`, you're good! Continue to Step 3.**

**If you see something else, STOP - you might not be on a Pi 4.**

---

## Step 3: Choose Installation Method

You have **TWO options**:

### Option A: Download Pre-built Release (Easiest - If Available)
**Use this if GitHub Releases has a pre-built ARM64 file.**

### Option B: Build from Source (Always Works)
**Use this if no pre-built release exists, or if you want the latest code.**

---

## Option A: Download Pre-built Release from GitHub

### Step A1: Check What Releases Are Available

```bash
# Check the latest release
curl -s https://api.github.com/repos/MuhammdAbdullah/stirling-engine-app/releases/latest | grep "browser_download_url.*arm64"
```

**What to look for:**
- Files with `arm64` in the name = ✅ **Use this for Pi 4**
- Files with `amd64` or `x64` = ❌ **DO NOT USE - Wrong architecture!**
- Files with `armv7l` = ❌ **Wrong for Pi 4 (only for old Pi models)**

### Step A2: Download the ARM64 AppImage

**First, find the exact release tag and filename.** Go to:
**https://github.com/MuhammdAbdullah/stirling-engine-app/releases**

Look for a file like: `Matrix Stirling Engine-1.0.0-arm64.AppImage`

**Then download it:**

```bash
# Go to home folder
cd ~

# Download the ARM64 AppImage (replace TAG and FILENAME with actual values)
# Example format:
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v1.0.0/Matrix-Stirling-Engine-1.0.0-arm64.AppImage

# Or download latest automatically (if available):
# wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/latest/download/Matrix-Stirling-Engine-*-arm64.AppImage
```

**Important:** Make sure the filename has `arm64` in it, NOT `amd64` or `x64`!

### Step A3: Make It Executable

```bash
chmod +x Matrix-Stirling-Engine-*-arm64.AppImage
```

### Step A4: Run the App

```bash
./Matrix-Stirling-Engine-*-arm64.AppImage
```

**Done!** Skip to "Running the App" section below.

---

## Option B: Build from Source (Clone and Build)

### Step B1: Install Node.js (If Not Already Installed)

```bash
# Check if Node.js is installed
node --version
```

**If you see a version number** (like `v18.17.0`), skip to Step B2.

**If you see "command not found"**, install Node.js:

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**This takes 2-3 minutes.**

### Step B2: Install Git (If Not Already Installed)

```bash
# Check if git is installed
git --version
```

**If you see "command not found"**, install git:

```bash
sudo apt-get update
sudo apt-get install -y git
```

### Step B3: Clone the Repository from GitHub

```bash
# Go to home folder
cd ~

# Clone the repository
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git

# Go into the app folder
cd stirling-engine-app
```

**What this does:** Downloads all the app files from GitHub to your Pi.

### Step B4: Install Dependencies

```bash
npm install
```

**This takes 5-10 minutes** - be patient! You'll see lots of text scrolling. This is normal.

**If you get errors**, install build tools first:

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

Then try `npm install` again.

### Step B5: Build the App for ARM64 (Pi 4)

**CRITICAL: Use ARM64 build command - NOT x64!**

```bash
# Use the build script (recommended - fixes common issues)
chmod +x build-arm64-pi.sh
bash build-arm64-pi.sh
```

**OR build directly:**

```bash
npm run build-linux-arm64
```

**Important:** 
- ✅ Use `build-linux-arm64` for Pi 4
- ❌ DO NOT use `build-linux-x64` or `build-linux-amd64` - those are for Intel/AMD computers!

**This takes 5-10 minutes** - the app is being compiled for your Pi 4.

**Note:** You might see an error about "fpm" or "cannot execute binary file" when building the DEB package. **This is okay!** The AppImage will still be built successfully, and you can use that.

### Step B6: Find and Run the Built App

```bash
# Go to the dist folder
cd dist

# List all files to see what was built
ls -la
```

**You should see files like:**
- `Matrix Stirling Engine-1.0.0-arm64.AppImage` ✅ **Use this!**
- `stirling-engine-monitor-1.0.0-arm64.tar.gz`
- `stirling-engine-monitor_1.0.0_arm64.deb` (might not exist if build had errors)

**Make it executable and run:**

```bash
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

---

## Running the App

After installation (either method), you can run the app:

### Method 1: Run Directly

```bash
cd ~
./Matrix-Stirling-Engine-*-arm64.AppImage
```

### Method 2: Create a Desktop Shortcut (Optional)

```bash
# Create desktop entry
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/stirling-engine.desktop << 'EOF'
[Desktop Entry]
Name=Matrix Stirling Engine
Comment=Stirling Engine Temperature Monitor
Exec=$HOME/Matrix-Stirling-Engine-*-arm64.AppImage
Icon=application-default-icon
Terminal=false
Type=Application
Categories=Utility;
EOF

# Make it executable
chmod +x ~/.local/share/applications/stirling-engine.desktop
```

Now you can find it in your applications menu!

---

## Quick Reference - All Commands in Order

**Copy and paste these commands one by one into your SSH session:**

### For Pre-built Release (Option A):

```bash
# 1. Connect via SSH (from Windows PowerShell)
# ssh YOUR_USERNAME@YOUR_PI_IP

# 2. Check architecture
uname -m

# 3. Download ARM64 AppImage (replace with actual URL from GitHub Releases)
cd ~
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/TAG/Matrix-Stirling-Engine-VERSION-arm64.AppImage

# 4. Make executable and run
chmod +x Matrix-Stirling-Engine-*-arm64.AppImage
./Matrix-Stirling-Engine-*-arm64.AppImage
```

### For Building from Source (Option B):

```bash
# 1. Connect via SSH (from Windows PowerShell)
# ssh YOUR_USERNAME@YOUR_PI_IP

# 2. Check architecture
uname -m

# 3. Install Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Clone repository
cd ~
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app

# 5. Install dependencies
npm install

# 6. Build ARM64 version
chmod +x build-arm64-pi.sh
bash build-arm64-pi.sh

# 7. Run the app
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

---

## Troubleshooting

### "Permission denied" when connecting via SSH

- Make sure SSH is enabled on your Pi
- Check that you're using the correct username and password
- Verify the IP address is correct

### Wrong architecture error

**If you see errors about "wrong architecture" or "cannot execute binary file":**
- Make sure you downloaded/built the **ARM64** version
- Check with `uname -m` - should show `aarch64`
- Never use files with `amd64`, `x64`, or `x86` in the name

### "git: command not found"

```bash
sudo apt-get update
sudo apt-get install -y git
```

### Build fails with "fpm" error

**This is normal!** The AppImage will still be built successfully. Just use the AppImage file instead of the DEB package.

### App won't start

- Make sure you're using the ARM64 version
- Check that the file is executable: `chmod +x *.AppImage`
- Verify you're on Pi 4: `uname -m` should show `aarch64`

### Serial port permission errors

```bash
sudo usermod -a -G dialout $USER
```

Then log out and log back in.

---

## Updating the App Later

### If you downloaded a pre-built release:

```bash
cd ~
rm Matrix-Stirling-Engine-*-arm64.AppImage
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/latest/download/Matrix-Stirling-Engine-*-arm64.AppImage
chmod +x Matrix-Stirling-Engine-*-arm64.AppImage
./Matrix-Stirling-Engine-*-arm64.AppImage
```

### If you built from source:

```bash
cd ~/stirling-engine-app
git pull
npm install
bash build-arm64-pi.sh
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

---

## Important Reminders

✅ **Always use ARM64** for Raspberry Pi 4  
❌ **Never use x86, x64, or amd64** - those are for Intel/AMD computers  
✅ **Check architecture** with `uname -m` - should show `aarch64`  
✅ **Look for `arm64` in filenames** when downloading  
❌ **Avoid files with `amd64` or `x64`** in the name  

---

## Need Help?

- Check other guides in the `docs` folder
- Make sure your Pi is connected to the internet
- Verify you're using the correct GitHub repository URL
- Check that your Pi has enough storage space (you need at least 1GB free)





