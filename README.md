# Matrix Stirling Engine Desktop App

An Electron-based control and logging application for the Matrix Stirling Engine.  
The app connects to the engine over USB serial (VID: `12BF`, PID: `010B`), visualizes real-time pressure/volume data with multiple chart types, logs CSV files, and automatically issues safety commands when hardware connects or the app closes.

---

## Current Project Status

✅ **Fully Functional** - The application is production-ready with all core features implemented and tested.

### Implemented Features

- ✅ **Auto-connect USB serial communication** - Automatically detects and connects to Stirling Engine hardware
- ✅ **Real-time data visualization**:
  - Pressure-Volume (P-V) chart with filled area and work calculation
  - Pressure vs Time chart
  - Volume vs Time chart
  - Live RPM and temperature display
- ✅ **CSV data logging** - Asynchronous CSV recording with start/stop button (visual indicator: red pulse when idle, green pulse when saving)
- ✅ **Hardware controls**:
  - Heater setpoint slider (20-70°C) with real-time updates
  - Heater ON/OFF toggle button
  - Aux output slider (0-100%) with sweep functionality
- ✅ **Calibration features** - M (measurement), Z (zero), N (done) calibration commands
- ✅ **Safety automation** - Automatic safety commands on connect/disconnect
- ✅ **Admin/debug window** - Password-protected window for viewing raw/parsed packets and sent commands
- ✅ **Performance optimizations**:
  - Worker thread for data parsing (off main UI thread)
  - Batch data processing for smooth chart updates
  - Chart update throttling for optimal performance
- ✅ **Theme support** - Light and dark themes for charts
- ✅ **Multi-platform builds** - Windows, Linux (x64/ARM64/ARMv7), macOS support

---

## Key Features

- **Live hardware telemetry**: Real-time plots of pressure/volume (P-V diagram), pressure vs time, volume vs time, RPM, and heater temperature.
- **CSV recorder**: Start/stop logging with a single button (button pulses red when idle, green when saving). Records timestamp, pressure, volume (mm³), temperature, and RPM.
- **Hardware controls**:
  - Heater toggle (`:C1;` / `:C0;`) plus setpoint slider (`:B<value>;`, range 20-70°C).
  - Aux output slider (`:X<value>;`, range 0-100%) with automatic sweep feature.
- **Calibration system**: Send calibration commands (M, Z, N) and receive calibration data packets.
- **Safety automation**: On connect sends `:D1;`, ensures heater is off, aux zeroed, and setpoint synced to 20°C; on shutdown sends `:B20;` → `:C0;` → `:X0;` → `:D0;`.
- **Admin/debug window**: Password-protected window (`matrix123`) with raw/parsed packet views and command history.
- **Performance**: Worker thread architecture for non-blocking data processing, batch updates for smooth UI.

---

## Getting Started (Windows)

```powershell
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
npm install
npm start
```

Linux/Mac users: install Node.js ≥ 18, then run the same commands (see `LINUX-INSTALL.md` for packaged builds).

### Useful npm scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the app in production mode |
| `npm run dev` | Run with devtools enabled |
| `npm run build-win` | Build Windows installer (NSIS) |
| `npm run build-linux` | Build AppImage/DEB/TAR.GZ (x64) |
| `npm run build-linux-arm64` | Build for ARM64 (Raspberry Pi 3/4/5) |
| `npm run build-linux-armv7l` | Build for ARMv7 (Raspberry Pi 1/2/Zero) |
| `npm run build-mac` | Build DMG |

Built artifacts land in `dist/`.

---

## Using the App

1. **Connect hardware** via USB. The status banner at the top turns green (`SYSTEM ONLINE`) once connected; the app automatically sends `:D1;`, `:C0;`, `:B20;`, `:X0;` for safety.
2. **View real-time data**:
   - P-V chart shows the pressure-volume cycle with filled area
   - Pressure vs Time and Volume vs Time charts update continuously
   - Work calculation displayed below P-V chart
   - RPM and temperature values shown in the control panel
3. **Heater control**:
   - Toggle button shows `● Heater ON`/`○ Heater OFF` and sends `:C1;` or `:C0;`.
   - Setpoint slider (20-70°C) sends `:B<setpoint>;` with debouncing (150ms delay).
   - Slider tip shows current value on hover.
4. **Aux output control**:
   - Slider sends `:X<value>;` (0–100%) with debouncing.
   - Sweep feature: automatically cycles aux output between 0-100% with configurable step size and interval.
5. **CSV logging**:
   - Click the "Start CSV Save" button (pulses red when idle).
   - Choose save location in the file dialog.
   - Button glows green and shows "Stop CSV Save" when recording.
   - Data includes: Timestamp, Pressure, Volume (mm³), Temperature, RPM.
   - Click again to stop and save the file.
6. **Calibration**:
   - Click "Calibration" button to open calibration modal.
   - Click "Zero" to send zero calibration command (`:Z1;`).
   - Click "Done" to complete calibration (`:N1;`).
   - Calibration value displays in the modal when received.
7. **Theme selection**: Use the theme dropdown to switch between light and dark chart themes.
8. **Admin window**: Click "Admin" button, enter password `matrix123`, view raw packets and command history.
9. **Shutdown**: When you close the window or exit, the app waits to send `:B20;` → `:C0;` → `:X0;` → `:D0;` before quitting.

---

## Important Files

| File | Role |
|------|------|
| `main.js` | Electron main process, serial comms, safety logic |
| `renderer.js` | UI behaviour, charts, CSV buffering |
| `preload.js` | IPC bridge (`setHeater`, `setHeaterMode`, `setHardwareReady`, etc.) |
| `data-worker.js` | Parses raw serial packets off the UI thread |
| `admin.html`/`admin.js` | Admin/debug window |
| `styles.css` | UI theming, CSV button pulse styles |
| `package.json` | Scripts, dependencies, electron-builder config |

---

## Serial Command Summary

### Commands Sent to Hardware

| Command | Purpose | Range |
|---------|---------|-------|
| `:B<value>;` | Heater setpoint in °C | 20–70 |
| `:C<state>;` | Heater mode | `1`=ON, `0`=OFF |
| `:D<state>;` | Hardware readiness | `1`=ready, `0`=not ready |
| `:X<value>;` | Aux output percentage | 0–100 |
| `:M1;` | Calibration measurement command | - |
| `:Z1;` | Zero calibration command | - |
| `:N1;` | Calibration done command | - |

### Data Packets Received from Hardware

Packets from hardware are parsed in `data-worker.js` (worker thread) and processed in `renderer.js`. The parser handles:
- **PV packets**: Pressure and volume readings (multiple samples per packet)
- **RT packets**: RPM and temperature readings
- **Calibration packets**: Special format packets for calibration data (`0xAB`, `0xA1`, `0xA2`, `0xC1`, `0xC2`, `0xEE`)

All data processing runs on a separate worker thread to keep the UI responsive.

---

## Building Installers

Electron Builder is preconfigured. Examples:

```powershell
# Windows NSIS installer
npm run build-win

# macOS DMG
npm run build-mac

# Linux AppImage/DEB/TAR.GZ (x64 - Intel/AMD)
npm run build-linux
```

### Building for Raspberry Pi

**Important**: The default Linux build is for x64 (Intel/AMD) and will **NOT** work on Raspberry Pi (ARM architecture).

📖 **See [RASPBERRY-PI-INSTALL.md](RASPBERRY-PI-INSTALL.md) for complete step-by-step instructions.**

**Quick start on Raspberry Pi:**
```bash
# On your Raspberry Pi
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
npm install
bash build-raspberry-pi.sh
npm start
```

**Or build for specific ARM architecture:**
```bash
# For Raspberry Pi 3, 4, or 5 (ARM64)
npm run build-linux-arm64

# For Raspberry Pi 1, 2, or Zero (ARMv7)
npm run build-linux-armv7l
```

**Note**: Building on Raspberry Pi is recommended because the `serialport` native module must be compiled for the target architecture. Cross-compilation from x64 to ARM can be complex.

See the helper scripts in the repo (`build-on-linux.sh`, `build-raspberry-pi.sh`, etc.) if you're packaging on different machines.

---

## Troubleshooting Tips

- **"SYSTEM OFFLINE" or "Not connected"**: 
  - Ensure USB cable is attached and device is powered on
  - Verify correct VID/PID (`12BF:010B`) - check Device Manager (Windows) or `lsusb` (Linux)
  - On Linux, ensure user is in `dialout` group: `sudo usermod -a -G dialout $USER` (logout/login required)
  - Use `check-connection.sh` scripts for diagnostics
  - The app auto-searches every 3 seconds until device is found
- **No CSV output**: 
  - Confirm you clicked "Start CSV Save" (button should pulse green)
  - Ensure hardware is sending PV packets (pressure/volume data)
  - CSV only logs packets with pressure/volume data (not RT-only packets)
- **Charts not updating**: 
  - Check that hardware is sending data (admin window shows raw packets)
  - Verify connection status shows "SYSTEM ONLINE"
  - Try clearing data and reconnecting
- **App hangs on close**: 
  - App waits for `:B20;`, `:C0;`, `:X0;`, `:D0;` to transmit
  - If serial port is unplugged mid-session, safety sequence times out after ~300ms and exits
  - This is normal behavior to ensure hardware safety
- **Admin window**: 
  - Press the "Admin" button, enter password `matrix123`
  - View raw/parsed packets and sent commands
  - Useful for debugging protocol issues
- **Performance issues**: 
  - Charts are throttled to ~20 FPS for smooth performance
  - Data processing runs on worker thread (non-blocking)
  - If UI is slow, reduce chart data points or disable unnecessary charts

---

## Contributing

1. Fork the repo and create a feature branch.
2. Follow existing coding style (vanilla JS, verbose for readability).
3. Run `npm test` (if added) and `npm run build` before opening a PR.

---

## License

MIT © 2024 Matrix Stirling Engine Team  
Feel free to adapt the code for your hardware, but test safety commands thoroughly before deploying on real equipment.
