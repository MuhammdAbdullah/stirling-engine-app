# Run App from Source Code (Development Mode) on Raspberry Pi

This will run the app directly from source code - no installation needed, perfect for testing!

---

## Step-by-Step Instructions

### Step 1: Connect to Raspberry Pi

From Windows PowerShell:
```powershell
ssh abdullah@192.168.1.78
```

### Step 2: Install Node.js (If Not Already Installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version
npm --version
```

### Step 3: Install Build Tools (If Needed)

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

### Step 4: Clone the Repository

```bash
cd ~
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
```

### Step 5: Install Dependencies

```bash
npm install
```

**Note:** This takes 5-10 minutes on Raspberry Pi. Be patient!

### Step 6: Run the App in Development Mode

```bash
npm start
```

The app will start and open in a window!

---

## Quick One-Line Setup (After Node.js is Installed)

```bash
cd ~ && git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git && cd stirling-engine-app && npm install && npm start
```

---

## Run with VNC (To See GUI from Windows)

If you want to see the app window on your Windows computer:

### On Pi:

```bash
# Install VNC server (if not installed)
sudo apt install -y tightvncserver

# Start VNC server
vncserver :1
```

### Set Display and Run:

```bash
cd ~/stirling-engine-app
export DISPLAY=:1
npm start
```

### On Windows:

1. Download VNC Viewer: https://www.realvnc.com/en/connect/download/viewer/
2. Connect to: `192.168.1.78:1`
3. You'll see the app running!

---

## Update Code and Test Changes

After making changes to the code:

```bash
cd ~/stirling-engine-app
git pull
npm install  # Only if dependencies changed
npm start
```

---

## Run in Background (For Testing)

```bash
cd ~/stirling-engine-app
npm start &
```

Check if running:
```bash
ps aux | grep electron
```

Stop it:
```bash
pkill -f electron
```

---

## Troubleshooting

### "Command not found: node"
Install Node.js (see Step 2 above)

### "Permission denied"
```bash
chmod +x ~/stirling-engine-app/node_modules/.bin/electron
```

### "Cannot connect to X server"
Use VNC (see instructions above) or run directly on Pi with monitor

### Serial port permission errors
```bash
sudo usermod -a -G dialout $USER
```
Then log out and log back in.

### "npm install" fails
Make sure build tools are installed:
```bash
sudo apt-get install -y build-essential python3
```

---

## Advantages of Running from Source

- ✅ No installation needed
- ✅ Easy to update code
- ✅ Can test changes immediately
- ✅ Can use `npm run dev` for debug mode
- ✅ Easy to remove (just delete the folder)

---

## Development Commands

```bash
# Run normally
npm start

# Run with developer tools
npm run dev

# Build executable (creates dist folder)
npm run build-linux-arm64
```




