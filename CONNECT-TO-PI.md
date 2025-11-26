# How to Connect to Raspberry Pi from Windows

## Your Pi Details:
- **IP Address:** 192.168.1.96
- **Username:** abdullah
- **Password:** College16

---

## Method 1: Using SSH (Command Line) - Recommended

### Step 1: Open PowerShell or Command Prompt

Press `Win + X` and select "Windows PowerShell" or "Terminal"

### Step 2: Connect via SSH

```powershell
ssh abdullah@192.168.1.96
```

**First time connection:** You'll see a message asking to confirm. Type `yes` and press Enter.

**Enter password:** Type your Raspberry Pi password (you won't see it as you type - this is normal)

---

## Method 2: Using Windows Terminal (If Installed)

1. Open Windows Terminal
2. Click the dropdown arrow next to the "+" button
3. Select "SSH"
4. Enter: `abdullah@192.168.1.96`
5. Press Enter

---

## Method 3: Using PuTTY (If You Have It)

1. Open PuTTY
2. Host Name: `192.168.1.96`
3. Port: `22`
4. Connection type: `SSH`
5. Click "Open"
6. Login as: `abdullah`
7. Enter your password

---

## After Connecting

Once connected, you'll see the Raspberry Pi command prompt. You can now:

### Download and install the app:

```bash
cd ~
wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage
chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

---

## Transfer Files from Windows to Pi

### Using SCP (Command Line):

From Windows PowerShell, copy files to Pi:

```powershell
scp "E:\Thermo\Striling Engine\file.txt" abdullah@192.168.1.96:~/
```

### Using WinSCP (GUI Tool):

1. Download WinSCP: https://winscp.net/
2. Host name: `192.168.1.96`
3. User name: `abdullah`
4. Password: (your Pi password)
5. Click "Login"
6. Drag and drop files between Windows and Pi

---

## Quick Connection Commands

### Connect to Pi:
```powershell
ssh abdullah@192.168.1.96
```

### Copy file to Pi:
```powershell
scp "path\to\file" abdullah@192.168.1.96:~/
```

### Copy file from Pi:
```powershell
scp abdullah@192.168.1.96:~/file "path\to\save"
```

### Run command on Pi without opening SSH:
```powershell
ssh abdullah@192.168.1.96 "command here"
```

---

## Troubleshooting

### "Connection refused" or "Host unreachable":
- Make sure Pi is turned on
- Check if Pi and Windows PC are on the same network
- Try: `ping 192.168.1.96` to test connection

### "Permission denied":
- Make sure username is correct: `abdullah`
- Check password (it's case-sensitive)
- Try resetting Pi password if needed

### "SSH is not recognized":
- Windows 10/11 should have SSH built-in
- If not, enable it: Settings > Apps > Optional Features > Add "OpenSSH Client"

---

## Enable SSH on Raspberry Pi (If Not Enabled)

If SSH is not enabled on your Pi:

1. Connect a monitor/keyboard to Pi
2. Run: `sudo systemctl enable ssh`
3. Run: `sudo systemctl start ssh`
4. Or use Raspberry Pi Configuration tool: `sudo raspi-config`

---

## One-Line Connection and Install

Connect and install the app in one go:

```powershell
ssh abdullah@192.168.1.96 "cd ~ && wget https://github.com/MuhammdAbdullah/stirling-engine-app/releases/download/v7/Matrix.Stirling.Engine-1.0.0-arm64.AppImage && chmod +x Matrix.Stirling.Engine-1.0.0-arm64.AppImage"
```

Then connect and run:
```powershell
ssh abdullah@192.168.1.96
./Matrix.Stirling.Engine-1.0.0-arm64.AppImage
```

