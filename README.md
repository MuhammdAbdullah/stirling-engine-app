# Matrix Stirling Engine Monitor

A cross-platform Electron desktop application for real-time control and monitoring of a Stirling thermodynamic engine. Displays live P-V diagrams, pressure/volume/temperature/RPM charts, and provides heater and auxiliary output control.

**Version:** 1.3.2

## Features

- Auto-detects hardware via USB serial (VID: `12BF`, PID: `010B`)
- Live P-V diagram and time-series charts (pressure, volume, temperature, RPM)
- Heater setpoint and ON/OFF control
- Auxiliary output percentage control
- In-app firmware updates via USB HID bootloader
- CSV data logging
- Password-protected admin/debug panel
- Calibration sequence support
- Safety shutdown on app close
- Auto-updater support (Windows NSIS installer)

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/)
- Electron (installed via `npm install`)

## Getting Started

```bash
npm install
npm start
```

For development with DevTools open:

```bash
npm run dev
```

## Build

```bash
npm run build-win          # Windows NSIS installer
npm run build-linux        # Linux x64 (AppImage / DEB / TAR.GZ)
npm run build-linux-arm64  # Raspberry Pi 3/4/5 (ARM64)
npm run build-linux-armv7l # Raspberry Pi 1/2/Zero (ARMv7)
npm run build-mac          # macOS DMG
```

Build output is placed in the `dist/` directory.

CSS source is `assets/css/input.css` → compiled to `assets/css/app.css`. Run `npm run build-css` before building if styles changed.

## Architecture

```
main.js                      ← Electron main process: serial port, IPC, worker management
├── data-worker.js           ← Worker thread: CPU-bound packet parsing (non-blocking)
├── stirling-data-parser.js  ← Packet parsing logic + volume lookup table
├── preload.js               ← contextBridge: exposes safe IPC API to renderer
├── index.html + renderer.js ← Main UI window
└── admin.html + admin.js    ← Admin/debug/firmware panel (password: matrix123)
```

### Packet Protocol

The hardware communicates over serial at **115200 baud, 8N1**:

| Packet | Size | Format | Description |
|--------|------|--------|-------------|
| PV | 7 B | `[0xAD,0xAD] + pressure(2B big-endian signed) + volume_index(1B) + [0xDA,0xDA]` | Pressure-volume data |
| RT | 10 B | `[0xCD,0xCD] + rpm(2B uint16) + temp(4B big-endian float32) + [0xDC,0xDC]` | RPM and temperature |
| Power | 8 B | `[0xA5,0xA5] + power(4B big-endian float32) + [0xA6,0xA6]` | Power measurement |

Volume index (0–50) maps to an actual µL value via a 51-entry lookup table in `stirling-data-parser.js`.

### Command Protocol

Commands are sent as `:COMMAND;` strings over serial:

| Command | Effect |
|---------|--------|
| `:B<20-70>;` | Set heater setpoint (°C) |
| `:C<0\|1>;` | Heater OFF / ON |
| `:X<0-100>;` | Aux output percentage |
| `:D<0\|1>;` | Hardware ready flag |
| `:T1;` | Reboot into bootloader mode |
| `:M1;` `:Z1;` `:N1;` | Calibration sequence (measure, zero, done) |

On app close a safety sequence is sent automatically: `B20 → C0 → X0 → D0`.

### Firmware Update

Sending `:T1;` reboots the hardware into a USB HID bootloader (VID: `12BF`, PID: `00A1`). The admin panel handles the full update sequence: detect → connect → load HEX → erase → program → verify CRC → jump to app. Progress is streamed to the UI in real time.

## Tech Stack

- [Electron](https://www.electronjs.org/) v39
- [Chart.js](https://www.chartjs.org/) v4
- [SerialPort](https://serialport.io/) v12
- [node-hid](https://github.com/node-hid/node-hid) — USB HID for bootloader
- [Tailwind CSS](https://tailwindcss.com/) v4 + [DaisyUI](https://daisyui.com/) v5

## License

MIT
