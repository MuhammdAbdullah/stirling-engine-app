# Matrix Stirling Engine Desktop App

An Electron-based control and logging application for the Matrix Stirling Engine.  
The app connects to the engine over USB serial, visualises pressure/volume data, logs CSV files, and automatically issues safety commands when hardware connects or the app closes.

---

## Key Features

- **Live hardware telemetry**: plots pressure/volume charts, RPM, and temperature.
- **CSV recorder**: start/stop logging with a single button (button pulses red when idle, green when saving).
- **Hardware controls**:
  - Heater toggle (`:C1;` / `:C0;`) plus setpoint slider (`:B<value>;`).
  - Aux output slider (`:X<value>;`).
- **Safety automation**: on connect sends `:D1;`, ensures heater is off, aux zeroed, and setpoint synced; on shutdown sends `:B20;`, `:C0;`, `:X0;`, `:D0;`.
- **Admin/debug window** with raw/parsed packet views.

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
| `npm run build-linux` | Build AppImage/DEB/TAR.GZ |
| `npm run build-mac` | Build DMG |

Built artifacts land in `dist/`.

---

## Using the App

1. **Connect hardware** via USB. The status banner turns green (`SYSTEM ONLINE`) once connected; the app sends `:D1;`, `:C0;`, `:B20;`, `:X0;`.
2. **Heater control**:
   - Toggle button becomes `● Heater ON`/`○ Heater OFF` and sends `:C1;` or `:C0;`.
   - Slider sends `:B<setpoint>;` immediately and any time you change it.
3. **Aux output** slider sends `:X<value>;` (0–100%).
4. **CSV logging**:
   - Click the pulsing button. When saving it glows green (`: idle -> red`).
   - After choosing a path, data rows append until you click again to stop.
5. **Shutdown**: when you close the window or exit, the app waits to send `:B20;` → `:C0;` → `:X0;` → `:D0;` before quitting.

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

| Command | Purpose |
|---------|---------|
| `:B<value>;` | Heater setpoint in °C (20–70). |
| `:C<state>;` | Heater mode (`1`=ON, `0`=OFF). |
| `:D<state>;` | Hardware readiness (`1`=ready, `0`=not ready). |
| `:X<value>;` | Aux output percentage (0–100). |

Packets from hardware are parsed in `stirling-data-parser.js` and processed in `renderer.js`.

---

## Building Installers

Electron Builder is preconfigured. Examples:

```powershell
# Windows NSIS installer
npm run build-win

# macOS DMG
npm run build-mac

# Linux AppImage/DEB/TAR.GZ
npm run build-linux
```

See the half dozen helper scripts in the repo (`build-on-linux.sh`, `verify-app.sh`, etc.) if you’re packaging on different machines.

---

## Troubleshooting Tips

- **“Not connected”**: ensure USB cable is attached, driver installed, and the correct VID/PID (`12BF:010B`). Use `check-connection.sh` scripts for diagnostics.
- **No CSV output**: confirm you clicked start (button should pulse green) and that hardware is sending both PV and RT packets.
- **App hangs on close**: it waits for `:B20;`, `:C0;`, `:X0;`, `:D0;` to transmit. If the serial port is unplugged mid-session, the safety sequence times out and exits.
- **Admin window**: press the “Admin” button to view raw/parsed packets; useful for debugging protocol issues.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Follow existing coding style (vanilla JS, verbose for readability).
3. Run `npm test` (if added) and `npm run build` before opening a PR.

---

## License

MIT © 2024 Matrix Stirling Engine Team  
Feel free to adapt the code for your hardware, but test safety commands thoroughly before deploying on real equipment.
