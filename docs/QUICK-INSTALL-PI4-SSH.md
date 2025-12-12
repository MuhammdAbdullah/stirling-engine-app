# Quick Install on Raspberry Pi 4 via SSH - Simple Steps

**For Raspberry Pi 4 ONLY - Uses ARM64 architecture**

---

## Step 1: Connect to Your Pi via SSH

From Windows PowerShell:

```powershell
ssh YOUR_USERNAME@YOUR_PI_IP
```

**Example:** `ssh pi@192.168.1.100`

---

## Step 2: Verify You're on Pi 4

```bash
uname -m
```

**Must show:** `aarch64` ✅

---

## Step 3: Choose One Method

### Method A: Download Pre-built (Easiest)

**Step 1: Check what releases are available**

**Option A: Use your browser** (easiest):
Go to: https://github.com/MuhammdAbdullah/stirling-engine-app/releases
Look for files with `arm64` in the name (NOT `amd64` or `x64`!)

**Option B: Check from command line** (if curl is installed):
```bash
curl -s https://api.github.com/repos/MuhammdAbdullah/stirling-engine-app/releases | grep -i "arm64.*appimage" | head -5
```

**If curl is not installed**, just use Option A (browser) or try the download commands below.

**Step 2: Download the ARM64 AppImage**

**Latest release is v12. Use one of these methods:**

**Method 1: Download from release v12 directly**

```bash
cd ~
# Remove any HTML file you accidentally downloaded
rm -f releases

# Download the ARM64 AppImage from v12
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v12/Matrix.Stirling.Engine-1.0.0-arm64.AppImage

# Install required system libraries (if missing)
sudo apt-get update
sudo apt-get install -y zlib1g libfuse2

# Make it executable and run (use --no-sandbox flag if you get sandbox errors)
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage --no-sandbox
```

**Method 2: Find the exact filename first**

1. Go to: https://github.com/MuhammdAbdullah/stirling-engine-app/releases
2. Click on release **v12**
3. Find the file with `arm64` in the name (NOT `amd64` or `x64`!)
4. Right-click the file → "Copy link address"
5. Use that URL with `wget`:

```bash
cd ~
rm -f releases
wget [PASTE_THE_COPIED_URL_HERE]
chmod +x *-arm64.AppImage
./*-arm64.AppImage
```

**Important:** The download URL format is:
`https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/TAG/FILENAME`

You need the **full URL including `/download/TAG/FILENAME`**, NOT just `/releases`!

---

### Method B: Build from Source (Always Works)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
cd ~
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
npm install
chmod +x build-arm64-pi.sh
bash build-arm64-pi.sh

# Run the app
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage
./"Matrix Stirling Engine-"*.AppImage
```

---

## Important Notes

✅ **Use ARM64** - Pi 4 needs `arm64` files  
❌ **Never use x86/x64/amd64** - those are for Intel/AMD computers  
✅ **Check filename** - must have `arm64` in it  

---

---

## Troubleshooting

### Error: "libz.so: cannot open shared object file"

Even if `zlib1g` is installed, the AppImage might not find it. Try these fixes:

**Fix 1: Install additional zlib packages and check library location**

```bash
sudo apt-get update
sudo apt-get install -y zlib1g zlib1g-dev libzstd1
```

**Fix 2: Check if libz.so exists and where it is**

```bash
# Find where libz.so is located
find /usr/lib* -name "libz.so*" 2>/dev/null
ldconfig -p | grep libz
```

**Fix 3: Install all Electron/Chromium dependencies (most comprehensive fix)**

**For Ubuntu 24.04 (Plucky) and newer - use t64 packages:**

```bash
sudo apt-get update
sudo apt-get install -y \
  zlib1g zlib1g-dev libzstd1 \
  libfuse2t64 \
  libnss3 libatk-bridge2.0-0t64 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2t64 \
  libgtk-3-0t64 libnotify4 libxss1 libxtst6 \
  xdg-utils libatspi2.0-0t64 libuuid1 \
  libsecret-1-0 libappindicator3-1

# Update library cache
sudo ldconfig
```

**For older Ubuntu/Debian versions:**

```bash
sudo apt-get update
sudo apt-get install -y \
  zlib1g zlib1g-dev libzstd1 \
  libfuse2 \
  libnss3 libatk-bridge2.0-0 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2 \
  libgtk-3-0 libnotify4 libxss1 libxtst6 \
  xdg-utils libatspi2.0-0 libuuid1 \
  libsecret-1-0 libappindicator3-1

# Update library cache
sudo ldconfig
```

Then try running the AppImage again.

**Fix 4: Sandbox error - run with --no-sandbox flag**

If you get an error about "SUID sandbox helper binary", run the AppImage with the `--no-sandbox` flag:

```bash
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage --no-sandbox
```

This is safe for local use and is the easiest solution.

### Error: "SUID sandbox helper binary was found, but is not configured correctly"

This is a common Electron/Chrome sandbox issue. **Easiest fix - run with --no-sandbox:**

```bash
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage --no-sandbox
```

This is safe for local use on your Pi.

### Error: "cannot execute binary file: Exec format error"

This means the AppImage is for the wrong architecture or the path is wrong.

**Fix 1: Check the file exists and verify architecture**

```bash
# Check what files are in the dist folder
ls -lh ~/stirling-engine-app/dist/

# Check the file architecture (should show ARM64)
file ~/stirling-engine-app/dist/"Matrix Stirling Engine-"*.AppImage
```

**Fix 2: Use the exact filename (don't use wildcard)**

```bash
# First, find the exact filename
cd ~/stirling-engine-app/dist
ls -lh *.AppImage

# Then update the script with the exact filename
cat > ~/run-stirling-engine.sh << 'EOF'
#!/bin/bash
cd ~/stirling-engine-app/dist
./Matrix\ Stirling\ Engine-1.0.0-arm64.AppImage --no-sandbox
EOF
chmod +x ~/run-stirling-engine.sh
```

**Fix 3: Run directly from dist folder**

```bash
cd ~/stirling-engine-app/dist
./Matrix\ Stirling\ Engine-1.0.0-arm64.AppImage --no-sandbox
```

**Fix 4: Check if AppImage is actually ARM64**

```bash
# Verify architecture
file ~/stirling-engine-app/dist/*.AppImage

# Should show: "ARM aarch64" or similar
# If it shows "x86-64" or "Intel", the build failed
```

### Error: Serialport native module cannot load

If you see errors about `/tmp/.org.chromium.Chromium.XXXXX: cannot open shared object file` related to serialport, the pre-built AppImage might have incorrect native bindings.

**Solution: Build the app directly on your Pi** (ensures serialport is built correctly for ARM64):

```bash
# Install Node.js and build tools
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential python3 libudev-dev

# Clone and build
cd ~
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
npm install

# Rebuild serialport for ARM64
npm rebuild serialport

# Build the app
chmod +x build-arm64-pi.sh
bash build-arm64-pi.sh

# Run the newly built app
cd dist
chmod +x "Matrix Stirling Engine-"*.AppImage

# Create launcher script in home directory
cat > ~/run-stirling-engine.sh << 'EOF'
#!/bin/bash
cd ~/stirling-engine-app/dist
./"Matrix Stirling Engine-"*.AppImage --no-sandbox
EOF
chmod +x ~/run-stirling-engine.sh

echo "Build complete! Run the app with: ~/run-stirling-engine.sh"
echo "(Run this on the Pi's desktop, not via SSH)"
```

**Why this works:** Building on the Pi ensures serialport native bindings are compiled correctly for ARM64 architecture.

### Other missing library errors

If you get errors about other missing libraries, install common ones:

```bash
sudo apt-get update
sudo apt-get install -y zlib1g libfuse2 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

---

---

## Important: Running GUI Apps via SSH

**Electron apps need a display to run!** If you're connected via SSH, you have two options:

### Option 1: Set Up VNC (Recommended for Remote Access)

**VNC lets you see and control the Pi's desktop from Windows.**

**For Ubuntu-based Pi (like Ubuntu 24.04):**

**Step 1: Install Desktop Environment (if not installed)**

Check if you have a desktop:
```bash
echo $XDG_CURRENT_DESKTOP
```

If it's empty or you don't have a desktop, install one:
```bash
sudo apt-get update
sudo apt-get install -y ubuntu-desktop-minimal
# OR for lighter desktop:
# sudo apt-get install -y xfce4 xfce4-goodies
```

**Step 2: Install VNC Server**

```bash
sudo apt-get update
sudo apt-get install -y tigervnc-standalone-server tigervnc-common
```

**Step 3: Create VNC Startup Script**

For Ubuntu, you need to configure VNC to start a desktop:

```bash
mkdir -p ~/.vnc
cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
[ -x /etc/vnc/xstartup ] && exec /etc/vnc/xstartup
[ -r $HOME/.Xresources ] && xrdb $HOME/.Xresources
x-window-manager &
# For Ubuntu/GNOME:
export XDG_CURRENT_DESKTOP="GNOME"
export GNOME_SHELL_SESSION_MODE="ubuntu"
# For XFCE (if you installed it):
# startxfce4 &
EOF
chmod +x ~/.vnc/xstartup
```

**Step 2: Set VNC Password**

```bash
vncpasswd
```

Enter a password (you'll need this to connect from Windows). Press Enter when asked for "view-only password" (you can skip it).

**Step 3: Start VNC Server**

```bash
vncserver :1 -geometry 1920x1080 -depth 24
```

**Step 4: Make VNC Start Automatically (Optional)**

```bash
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/vncserver.service << 'EOF'
[Unit]
Description=VNC Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/vncserver :1 -geometry 1920x1080 -depth 24
Restart=on-failure

[Install]
WantedBy=default.target
EOF

systemctl --user enable vncserver.service
systemctl --user start vncserver.service
```

**Step 5: Connect from Windows**

1. Download VNC Viewer: https://www.realvnc.com/en/connect/download/viewer/
2. Install and open VNC Viewer
3. Enter your Pi's IP address followed by `:1` (e.g., `192.168.1.96:1`)
4. Enter the VNC password you set
5. You'll see the Pi's desktop!

**Step 6: Run the App from VNC**

Once connected via VNC:
- Open a terminal on the Pi's desktop
- Run: `~/run-stirling-engine.sh`

**To stop VNC server:**
```bash
vncserver -kill :1
```

**To restart VNC server:**
```bash
vncserver :1 -geometry 1920x1080 -depth 24
```

**If VNC starts but doesn't appear in list:**

Check what files exist:
```bash
ls -la ~/.vnc/
```

Check for any log files:
```bash
ls -la ~/.vnc/*.log 2>/dev/null || echo "No log files found"
```

Try starting VNC with verbose output to see errors:
```bash
vncserver :1 -geometry 1920x1080 -depth 24 -localhost no
```

Common issues:
- Missing xstartup script: Make sure `~/.vnc/xstartup` exists and is executable
- Desktop environment not starting: Check if XFCE is properly installed
- Permission issues: Make sure `~/.vnc` directory exists and has correct permissions

**Fix: Recreate xstartup script and restart:**
```bash
mkdir -p ~/.vnc
cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
[ -x /etc/vnc/xstartup ] && exec /etc/vnc/xstartup
[ -r $HOME/.Xresources ] && xrdb $HOME/.Xresources
startxfce4 &
EOF
chmod +x ~/.vnc/xstartup
vncserver -kill :1 2>/dev/null || true
vncserver :1 -geometry 1920x1080 -depth 24
```

### Option 2: Run on Pi's Desktop Directly

If you have a monitor/keyboard/mouse connected:
1. Open a terminal on the Pi's desktop
2. Run: `~/run-stirling-engine.sh`

### Option 2: Use X11 Forwarding (Advanced)

If you must run via SSH, enable X11 forwarding:

**On Windows (using PowerShell with X11 forwarding):**

```powershell
# Install X11 server on Windows first (like VcXsrv or Xming)
# Then connect with X11 forwarding:
ssh -X YOUR_USERNAME@YOUR_PI_IP
```

**On the Pi, set DISPLAY:**

```bash
export DISPLAY=:0
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage --no-sandbox
```

**Note:** X11 forwarding can be complex. Option 1 (running on Pi's desktop) is much easier for beginners.

---

---

## Uninstalling Old Version

Before installing a new version, remove the old one:

### Step 1: Check How It Was Installed

```bash
# Check if installed via DEB package
dpkg -l | grep stirling-engine-monitor

# Check for AppImage files
ls -lh ~/Matrix.Stirling.Engine* 2>/dev/null

# Check for desktop shortcuts
ls -lh ~/.local/share/applications/stirling-engine.desktop 2>/dev/null
```

### Step 2: Remove Based on Installation Method

**If installed via DEB package:**

```bash
sudo dpkg -r stirling-engine-monitor
sudo apt-get autoremove -y
```

**If using AppImage (just delete the files):**

```bash
cd ~
rm -f Matrix.Stirling.Engine*.AppImage*
rm -f Matrix.Stirling.Engine*.AppImage.1
```

**Remove desktop shortcuts (if created):**

```bash
rm -f ~/.local/share/applications/stirling-engine.desktop
```

**Remove launcher scripts (if created):**

```bash
rm -f ~/run-stirling-engine.sh
```

### Step 3: Complete Cleanup (All Methods)

```bash
# Remove all AppImage files
cd ~
rm -f Matrix.Stirling.Engine*.AppImage*

# Remove DEB package (if installed)
sudo dpkg -r stirling-engine-monitor 2>/dev/null || true
sudo apt-get autoremove -y

# Remove desktop shortcuts
rm -f ~/.local/share/applications/stirling-engine.desktop

# Remove launcher scripts
rm -f ~/run-stirling-engine.sh

# Clean up any temporary mount points (if any)
rm -rf /tmp/.mount_Matrix* 2>/dev/null || true
```

**Done!** The old version is now removed. You can proceed with installing the new version.

---

## Download and Install (After Uninstalling)

After removing the old version, follow these steps to download and install the latest version:

### Step 1: Download the Latest Release (v12)

```bash
cd ~

# Download the ARM64 AppImage from release v12
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v12/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

**Wait for download to complete** (about 101 MB, takes 1-2 minutes)

### Step 2: Install Required System Libraries

```bash
# Install all required libraries for Ubuntu 24.04 (Plucky)
sudo apt-get update && sudo apt-get install -y \
  zlib1g zlib1g-dev libzstd1 \
  libfuse2t64 \
  libnss3 libatk-bridge2.0-0t64 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2t64 \
  libgtk-3-0t64 libnotify4 libxss1 libxtst6 \
  xdg-utils libatspi2.0-0t64 libuuid1 \
  libsecret-1-0 libappindicator3-1 && \
sudo ldconfig
```

### Step 3: Make It Executable

```bash
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### Step 4: Create a Launcher Script (Optional but Recommended)

```bash
cat > ~/run-stirling-engine.sh << 'EOF'
#!/bin/bash
cd ~
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage --no-sandbox
EOF

chmod +x ~/run-stirling-engine.sh
```

### Step 5: Run the App

**Important:** You need to run this on the Pi's desktop (not via SSH). Use VNC or connect a monitor.

```bash
# Run directly
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage --no-sandbox

# OR use the launcher script
~/run-stirling-engine.sh
```

---

## Complete Installation (One Command Sequence)

**Copy and paste this entire block:**

```bash
# Step 1: Download
cd ~
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v12/Matrix.Stirling.Engine-1.0.0-arm64.AppImage

# Step 2: Install libraries
sudo apt-get update && sudo apt-get install -y zlib1g zlib1g-dev libzstd1 libfuse2t64 libnss3 libatk-bridge2.0-0t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libgtk-3-0t64 libnotify4 libxss1 libxtst6 xdg-utils libatspi2.0-0t64 libuuid1 libsecret-1-0 libappindicator3-1 && sudo ldconfig

# Step 3: Make executable
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage

# Step 4: Create launcher script
cat > ~/run-stirling-engine.sh << 'EOF'
#!/bin/bash
cd ~
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage --no-sandbox
EOF
chmod +x ~/run-stirling-engine.sh

echo "Installation complete! Run with: ~/run-stirling-engine.sh"

# Note: If the file was saved as .AppImage.1, rename it:
# mv Matrix.Stirling.Engine-1.0.0-arm64.AppImage.1 Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

**Note:** Remember to run the app on the Pi's desktop (via VNC or direct monitor), not via SSH!

---

## Full Guide

For detailed instructions, see: `INSTALL-PI4-FROM-GITHUB-SSH.md`

