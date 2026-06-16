# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Matrix Stirling Engine Desktop App — an Electron application for real-time control and monitoring of a Stirling thermodynamic engine. It auto-detects hardware via USB serial (VID: `12BF`, PID: `010B`), displays live P-V diagrams, provides heater/aux output control, and supports in-app firmware updates via a USB HID bootloader.

## Commands

```bash
npm start                  # Run in production mode
npm run dev                # Run with DevTools open
npm run build-css          # Compile Tailwind CSS (one-shot)
npm run watch-css          # Watch and recompile Tailwind CSS on change
npm run build-win          # Build Windows NSIS installer
npm run build-linux        # Build Linux x64 AppImage/DEB/TAR.GZ
npm run build-linux-arm64  # Build for Raspberry Pi 3/4/5 (ARM64)
npm run build-linux-armv7l # Build for Raspberry Pi 1/2/Zero (ARMv7)
npm run build-mac          # Build macOS DMG
```

CSS source is `assets/css/input.css` → compiled to `assets/css/app.css` (uses Tailwind v4 + DaisyUI v5). Always run `build-css` before building the app if styles changed.

## Architecture

### Process Structure

```
main.js               ← Electron main process: serial port, IPC handlers, worker management
├── data-worker.js        ← Worker thread: CPU-bound packet parsing (non-blocking)
├── stirling-data-parser.js ← Packet parsing logic + volume lookup table
├── preload.js            ← contextBridge: exposes safe IPC API to renderer as window.electronAPI
├── index.html + renderer.js  ← Main UI window
├── assets/css/input.css  ← Tailwind source (compiled to assets/css/app.css)
└── admin.html + admin.js ← Password-protected admin/debug/firmware panel (password: matrix123)
```

### Data Flow

1. Serial port (115200 baud, 8N1) receives binary packets
2. Raw bytes are sent to `data-worker.js` via Worker thread message passing
3. Worker uses `stirling-data-parser.js` to parse three packet types:
   - **PV packet** (7 bytes): `[0xAD,0xAD] + pressure(2B big-endian signed) + volume_index(1B) + [0xDA,0xDA]` — volume_index (0–50) maps to actual µL value via 51-entry lookup table
   - **RT packet** (10 bytes): `[0xCD,0xCD] + rpm(2B uint16) + temperature(4B big-endian float32) + [0xDC,0xDC]`
   - **Power packet** (8 bytes): `[0xA5,0xA5] + power(4B big-endian float32) + [0xA6,0xA6]`
4. Parsed data flows back to main process → renderer via `window.electronAPI.onStirlingData(callback)` (IPC channel: `stirling-data`)
5. Renderer feeds Chart.js (P-V diagram, pressure/time, volume/time, temp+RPM/time)

### Hardware Command Protocol

All commands use the format `:COMMAND;` (colon prefix, semicolon suffix):

| Command | Effect |
|---|---|
| `:B<20-70>;` | Heater setpoint (°C) |
| `:C<0\|1>;` | Heater OFF/ON |
| `:X<0-100>;` | Aux output percentage |
| `:D<0\|1>;` | Hardware ready flag |
| `:T1;` | Reboot into bootloader mode |
| `:M1;` `:Z1;` `:N1;` | Calibration sequence (measure, zero, done) |

On app close, a safety sequence is sent automatically: `B20 → C0 → X0 → D0`.

### Bootloader / Firmware Update Flow

When `:T1;` is sent, the hardware re-enumerates as a USB HID device (VID: `12BF`, PID: `00A1`). The admin panel connects to it via `node-hid` and runs the firmware update sequence:

1. `checkBootloaderDevice(vid, pid)` — detect without connecting
2. `connectToBootloaderUSB(vid, pid)` — open HID connection
3. `loadHexFile(filePath)` / `showOpenDialog(options)` — select Intel HEX file
4. `bootloaderReadInfo()` → `bootloaderEraseFlash()` → `bootloaderProgramFlash()` → `bootloaderReadCRC()` → `bootloaderJumpToApp()`
5. Progress events stream back via `onBootloaderProgress(callback)` (IPC channel: `bootloader-progress`)

Reference C++ source for the bootloader protocol is in `assets/Source_code/`.

### Key IPC API (`window.electronAPI`)

Defined in `preload.js`, all invoke/listen calls are wrapped here — the renderer never accesses `ipcRenderer` directly:

| Method | Direction | Purpose |
|---|---|---|
| `autoConnectStirling()` | invoke | Connect to VID:12BF PID:010B |
| `onStirlingData(cb)` | listen | Receive parsed PV/RT/Power packets |
| `onConnectionStatus(cb)` | listen | Serial connect/disconnect events |
| `setHeater(value)` | invoke | `:B<value>;` |
| `setHeaterMode(mode)` | invoke | `:C<0\|1>;` |
| `setAux(value)` | invoke | `:X<value>;` |
| `sendCalibration/Zero/Done()` | invoke | M1/Z1/N1 calibration steps |
| `sendBootloader(value)` | invoke | `:T1;` — trigger bootloader |
| `saveCsv(path, rows)` | invoke | Write CSV rows to file |
| `chooseCsvPath()` | invoke | Open save-file dialog |
| `openAdminWindow()` | invoke | Spawn admin.html window |

### Performance Considerations

- Chart updates are throttled; batch data processing is used in the renderer
- Worker thread isolates serial parsing from the UI thread
- GPU acceleration is disabled (`app.disableHardwareAcceleration()`) for stability on Pi
- CSV writes are async-buffered to avoid blocking the render loop

### Build Output

All builds output to `dist/`. Configuration lives in `package.json` (under `"build"`) and `electron-builder.json`. ARM builds require `fpm`.
