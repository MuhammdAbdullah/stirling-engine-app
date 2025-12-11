# Run App in Test Mode (No Installation) on Raspberry Pi

The AppImage file is **portable** - it doesn't need installation! You can run it directly for testing.

---

## Method 1: Run Directly on Pi (If You Have Monitor/Keyboard)

If you're physically at the Raspberry Pi with a monitor and keyboard:

```bash
cd ~
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

The app will open in a window on the Pi's display.

---

## Method 2: Run Over SSH with X11 Forwarding (Remote Display)

If you want to see the app window on your Windows computer:

### Step 1: Enable X11 Forwarding in SSH

From Windows PowerShell, connect with X11 forwarding:

```powershell
ssh -X abdullah@192.168.1.78
```

**Note:** You'll need an X server on Windows. Options:
- **VcXsrv** (Free): https://sourceforge.net/projects/vcxsrv/
- **Xming** (Free): https://sourceforge.net/projects/xming/

### Step 2: After Installing X Server, Connect:

```powershell
ssh -X abdullah@192.168.1.78
```

### Step 3: Set Display Variable (if needed):

```bash
export DISPLAY=:0.0
```

### Step 4: Run the App:

```bash
cd ~
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

---

## Method 3: Run in Background (Headless Testing)

If you just want to test if it runs without seeing the GUI:

```bash
cd ~
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage

# Run in background (for testing)
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage &
```

Check if it's running:
```bash
ps aux | grep AppImage
```

Stop it:
```bash
pkill -f AppImage
```

---

## Method 4: Run with VNC (Recommended for Remote GUI)

### On Raspberry Pi:

1. Install VNC server:
```bash
sudo apt update
sudo apt install -y tightvncserver
```

2. Start VNC server:
```bash
vncserver :1
```
(Set a password when prompted)

3. Run the app:
```bash
cd ~
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
DISPLAY=:1 ./Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### On Windows:

1. Download VNC Viewer: https://www.realvnc.com/en/connect/download/viewer/
2. Connect to: `192.168.1.78:1`
3. Enter VNC password
4. You'll see the Pi desktop and the running app

---

## Quick Test Commands

### Download and test run:

```bash
cd ~ && wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage && chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage && ./Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### Check if app file exists:

```bash
ls -lh ~/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### Test if file is executable:

```bash
file ~/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

---

## Important Notes

- **AppImage is portable** - No installation needed!
- **No system changes** - Just download and run
- **Easy to remove** - Just delete the file
- **GUI apps need display** - Use VNC or X11 forwarding for remote viewing

---

## Troubleshooting

### "Cannot connect to X server":
- Use VNC (Method 4) instead
- Or run directly on Pi with monitor

### "Permission denied":
```bash
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

### "No such file or directory":
```bash
cd ~
ls -lh Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```






