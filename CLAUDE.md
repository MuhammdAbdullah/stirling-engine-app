# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Matrix Stirling Engine Desktop App — an Electron application for real-time control and monitoring of a Stirling thermodynamic engine. It auto-detects the hardware via USB serial (VID: `12BF`, PID: `010B`), displays live P-V diagrams, and provides heater/aux output control.

## Commands

```bash
npm start                  # Run in production mode
npm run dev                # Run with DevTools open
npm run build-win          # Build Windows NSIS installer
npm run build-linux        # Build Linux x64 AppImage/DEB/TAR.GZ
npm run build-linux-arm64  # Build for Raspberry Pi 3/4/5 (ARM64)
npm run build-linux-armv7l # Build for Raspberry Pi 1/2/Zero (ARMv7)
npm run build-mac          # Build macOS DMG
```

For Raspberry Pi cross-compilation from Windows, see [docs/BUILD-LINUX-ON-WINDOWS.md](docs/BUILD-LINUX-ON-WINDOWS.md) and use `build-linux-wsl.ps1` (PowerShell) or `build-linux-wsl.sh` (WSL bash).

## Architecture

### Process Structure

```
main.js          ← Electron main process: serial port, IPC handlers, worker management
├── data-worker.js        ← Worker thread: CPU-bound packet parsing (non-blocking)
├── stirling-data-parser.js ← Packet parsing logic + volume lookup table
├── preload.js            ← contextBridge: exposes safe IPC API to renderer
├── index.html + renderer.js + styles.css  ← Main UI window
└── admin.html + admin.js ← Password-protected admin/debug panel (password: matrix123)
```

### Data Flow

1. Serial port (115200 baud, 8N1) receives binary packets
2. Raw bytes are sent to `data-worker.js` via Worker thread message passing
3. Worker uses `stirling-data-parser.js` to parse two packet types:
   - **PV packet** (7 bytes): `[0xAD,0xAD] + pressure(2B) + volume_index(1B) + [0xDA,0xDA]` — volume_index maps to actual value via 51-entry lookup table
   - **RT packet** (8 bytes): `[0xCD,0xCD] + rpm(2B) + temp(2B) + [0xDC,0xDC]`
4. Parsed data flows back to main process via IPC → renderer via `contextBridge`
5. Renderer feeds Chart.js (P-V diagram, pressure/time, volume/time, temp+RPM/time)

### Hardware Command Protocol

All commands use the format `:COMMAND;` (colon prefix, semicolon suffix):

| Command | Effect |
|---|---|
| `:B<20-70>;` | Heater setpoint (°C) |
| `:C<0\|1>;` | Heater OFF/ON |
| `:X<0-100>;` | Aux output percentage |
| `:D<0\|1>;` | Hardware ready flag |
| `:M1;` `:Z1;` `:N1;` | Calibration sequence (measure, zero, done) |

On app close, a safety sequence is sent automatically: `B20 → C0 → X0 → D0`.

### Key IPC Channels

Defined in `preload.js` and handled in `main.js`:
- `send-command` — sends a `:command;` string to serial port
- `start-csv` / `stop-csv` — toggle CSV data logging
- `get-port-status` — returns current connection state
- `serial-data` — renderer receives parsed packets (renderer listens)

### Performance Considerations

- Chart updates are throttled; batch data processing is used in the renderer
- Worker thread isolates serial parsing from the UI thread
- GPU acceleration is disabled in `main.js` (`app.disableHardwareAcceleration()`) for stability on Pi
- CSV writes are async-buffered to avoid blocking the render loop

### Build Output

All builds output to `dist/`. Configuration lives in both `package.json` (under `"build"`) and `electron-builder.json`. The ARM builds require `fpm` — see [docs/BUILD-ARM64-PI.md](docs/BUILD-ARM64-PI.md) for the workaround script when fpm errors occur on x86.

### Documentation

Comprehensive guides in [docs/](docs/) covering installation, build instructions, Raspberry Pi deployment, GitHub SSH setup, and release management.
