# Matrix Stirling Engine Desktop App

An Electron-based control and logging application for the Matrix Stirling Engine.

## Quick Start

```bash
git clone https://github.com/MuhammdAbdullah/stirling-engine-app.git
cd stirling-engine-app
npm install
npm start
```

## Features

- 🔌 **Auto-connect USB serial communication** - Automatically detects and connects to Stirling Engine hardware (VID: `12BF`, PID: `010B`)
- 📊 **Real-time data visualization** - Pressure-Volume (P-V) chart, Pressure vs Time, Volume vs Time, RPM, and temperature displays
- 💾 **CSV data logging** - Record experimental data with start/stop button
- 🎛️ **Hardware controls** - Heater setpoint (20-70°C), heater ON/OFF toggle, aux output (0-100%) with dynamic visual feedback and sweep functionality
- 🔧 **Calibration system** - M (measurement), Z (zero), N (done) calibration commands
- 🛡️ **Safety automation** - Automatic safety commands on connect/disconnect
- 🔍 **Admin/debug window** - Password-protected window for viewing raw/parsed packets

## Requirements

- Node.js 18 or higher
- Windows, macOS, or Linux (x64/ARM64/ARMv7)
- Matrix Stirling Engine hardware with USB serial connection

## Installation

### Windows
```powershell
npm install
npm start
```

### Linux/Mac
```bash
npm install
npm start
```

### Building Installers

```bash
npm run build-win      # Windows NSIS installer
npm run build-linux    # Linux AppImage/DEB/TAR.GZ (x64)
npm run build-mac      # macOS DMG
```

For Raspberry Pi builds, see [docs/RASPBERRY-PI-INSTALL.md](docs/RASPBERRY-PI-INSTALL.md).

## Documentation

📖 **Full documentation available in the [docs/](docs/) folder:**

- [README.md](docs/README.md) - Complete documentation with all features and usage instructions
- [RASPBERRY-PI-INSTALL.md](docs/RASPBERRY-PI-INSTALL.md) - Raspberry Pi installation guide
- [LINUX-INSTALL.md](docs/LINUX-INSTALL.md) - Linux installation instructions
- [BUILD-INSTRUCTIONS-PI.md](docs/BUILD-INSTRUCTIONS-PI.md) - Detailed build instructions

## Project Status

✅ **Production Ready** - All core features implemented and tested.

## License

MIT © 2024 Matrix Stirling Engine Team

---

**Note**: This application includes automatic safety features that ensure hardware is properly shut down when the app closes. Always test safety commands thoroughly before deploying on real equipment.





