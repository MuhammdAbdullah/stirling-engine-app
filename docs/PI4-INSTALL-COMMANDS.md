# Install Matrix Stirling Engine on Raspberry Pi 4 - Command Line

## Step-by-Step Installation Commands

### Step 1: Download the AppImage file

```bash
cd ~
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### Step 2: Make it executable

```bash
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### Step 3: Run the app

```bash
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

---

## Complete One-Line Installation (Copy and Paste)

```bash
cd ~ && wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage && chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage && ./Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

---

## Optional: Create a Desktop Shortcut

### Create a desktop entry file:

```bash
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/stirling-engine.desktop << 'EOF'
[Desktop Entry]
Name=Matrix Stirling Engine
Comment=Stirling Engine Temperature Monitor
Exec=$HOME/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
Icon=application-default-icon
Terminal=false
Type=Application
Categories=Utility;
EOF
```

### Make it executable:

```bash
chmod +x ~/.local/share/applications/stirling-engine.desktop
```

---

## Troubleshooting

### If you get "Permission denied":
```bash
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### If you get "No such file or directory":
Make sure you're in the home directory:
```bash
cd ~
ls -lh Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### If the app doesn't start:
Check if you have display access:
```bash
echo $DISPLAY
```

### If serial port errors occur:
Add your user to the dialout group:
```bash
sudo usermod -a -G dialout $USER
```
Then log out and log back in.

---

## Update to Latest Version

To update to a newer version later:

```bash
cd ~
rm Matrix.Stirling.Engine-1.0.0-arm64.AppImage
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/latest/download/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```









