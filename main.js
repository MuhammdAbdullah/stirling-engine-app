// This is the main process file for our Electron app
// It creates and manages the application window

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');

// Keep a global reference of the window object
let mainWindow;

// Disable hardware acceleration to avoid GPU process crashes on some Windows setups
// This forces Chromium to render using CPU and is a common fix for errors like:
// "GPU process exited unexpectedly" or command buffer failures
app.disableHardwareAcceleration();

// Function to create the main window
function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // Keep this simple and safe: use preload to expose limited APIs
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'assets/icon.png'), // Optional: add an icon
        title: 'Stirling Engine Temperature Monitor'
    });

    // Maximize the window on launch for best visibility
    try { mainWindow.maximize(); } catch (_) {}
    try { mainWindow.setMenuBarVisibility(false); } catch (_) {}

    // Load the HTML file
    mainWindow.loadFile('index.html');

    // Open the DevTools in development mode
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // Emitted when the window is closed
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', function () {
    // On macOS, keep the app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// =============================
// Simple Serial Auto-Connect
// =============================

// Very simple state
let currentSerialPort = null;
let isSerialConnected = false;
let searchIntervalId = null;

// Target device VID/PID (uppercase hex)
const TARGET_VENDOR_ID = '12BF';
const TARGET_PRODUCT_ID = '010B';

// Send connection status to renderer
function sendConnectionStatus(connected, info) {
    if (!mainWindow) return;
    const payload = Object.assign({ connected: connected }, info || {});
    mainWindow.webContents.send('connection-status', payload);
}

// Find the Stirling device by VID/PID
async function findStirlingDevicePort() {
    try {
        const ports = await SerialPort.list();
        // Inform UI we are searching
        console.log('[SERIAL] Searching for Stirling Engine device (VID: 0x' + TARGET_VENDOR_ID + ', PID: 0x' + TARGET_PRODUCT_ID + ')...');
        sendConnectionStatus(false, { message: 'Searching for Stirling Engine device...' });
        for (let i = 0; i < ports.length; i++) {
            const p = ports[i];
            const vid = p.vendorId ? String(p.vendorId).toUpperCase() : '';
            const pid = p.productId ? String(p.productId).toUpperCase() : '';
            if (vid === TARGET_VENDOR_ID && pid === TARGET_PRODUCT_ID) {
                console.log('[SERIAL] Device found on', p.path);
                sendConnectionStatus(false, { message: `Device found on ${p.path}. Preparing to connect...`, port: p.path, vid: TARGET_VENDOR_ID, pid: TARGET_PRODUCT_ID });
                return p;
            }
        }
        // Not found this round
        console.log('[SERIAL] Device not found yet. Still searching...');
        sendConnectionStatus(false, { message: 'Device not found yet. Still searching...' });
        return null;
    } catch (e) {
        console.error('[SERIAL] Error while searching for device:', e && e.message ? e.message : e);
        sendConnectionStatus(false, { error: e && e.message ? e.message : 'Error while searching for device' });
        return null;
    }
}

// Connect to a specific path at 115200
async function connectSerialAtPath(portPath) {
    return new Promise((resolve) => {
        try {
            // Close any existing port first
            if (currentSerialPort && currentSerialPort.isOpen) {
                try { currentSerialPort.close(); } catch (_) {}
                currentSerialPort = null;
            }

            const port = new SerialPort({
                path: portPath,
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                autoOpen: false
            });

            port.on('open', function() {
                console.log('[SERIAL] Connected to', portPath);
                isSerialConnected = true;
                currentSerialPort = port;
                sendConnectionStatus(true, { port: portPath, vid: TARGET_VENDOR_ID, pid: TARGET_PRODUCT_ID, deviceType: 'Stirling Engine' });
                resolve({ success: true, port: portPath });
            });

            port.on('error', function(err) {
                console.error('[SERIAL] Serial error:', err && err.message ? err.message : err);
                isSerialConnected = false;
                sendConnectionStatus(false, { error: err && err.message ? err.message : 'Serial error' });
            });

            port.on('close', function() {
                console.warn('[SERIAL] Port closed');
                isSerialConnected = false;
                sendConnectionStatus(false, { error: 'Port closed' });
            });

            // Optional: read data and forward raw bytes if needed later
            port.on('data', function(_data) {
                // Forward raw data to any open windows (main and admin)
                try {
                    const payload = Array.from(_data);
                    if (mainWindow) {
                        mainWindow.webContents.send('raw-data', payload);
                    }
                    if (adminWindow && !adminWindow.isDestroyed()) {
                        adminWindow.webContents.send('raw-data', payload);
                    }
                } catch (_) {}
            });

            port.open(function(err) {
                if (err) {
                    console.error('[SERIAL] Open failed:', err.message);
                    isSerialConnected = false;
                    sendConnectionStatus(false, { error: err.message });
                    resolve({ success: false, error: err.message });
                    return;
                }
            });
        } catch (e) {
            console.error('[SERIAL] Open threw exception:', e && e.message ? e.message : e);
            isSerialConnected = false;
            sendConnectionStatus(false, { error: e && e.message ? e.message : 'Open failed' });
            resolve({ success: false, error: e.message });
        }
    });
}

// Handle auto-connect request from renderer
ipcMain.handle('auto-connect-stirling', async () => {
    try {
        // If already connected, report status
        if (isSerialConnected && currentSerialPort && currentSerialPort.isOpen) {
            return { success: true, port: currentSerialPort.path };
        }

        const dev = await findStirlingDevicePort();
        if (!dev) {
            console.warn('[SERIAL] Device not found. Check cable and drivers.');
            sendConnectionStatus(false, { error: 'Device not found. Check cable and drivers.' });
            return { success: false, error: 'Device not found' };
        }

        console.log('[SERIAL] Connecting to', dev.path, '...');
        sendConnectionStatus(false, { message: `Connecting to ${dev.path}...`, port: dev.path, vid: TARGET_VENDOR_ID, pid: TARGET_PRODUCT_ID });
        const result = await connectSerialAtPath(dev.path);
        return result;
    } catch (e) {
        console.error('[SERIAL] Auto-connect error:', e && e.message ? e.message : e);
        sendConnectionStatus(false, { error: e && e.message ? e.message : 'Auto-connect error' });
        return { success: false, error: e.message };
    }
});

// Optional: expose manual get-available-ports for UI drop-downs
ipcMain.handle('get-available-ports', async () => {
    try {
        return await SerialPort.list();
    } catch (e) {
        return [];
    }
});

// =============================
// Heater control: send 5-byte command ':B<val>;\n'
// <val> is 0..70 where 0 means off
ipcMain.handle('set-heater', async (event, value) => {
    try {
        const v = Math.max(0, Math.min(70, parseInt(value || 0)));
        if (!currentSerialPort || !currentSerialPort.isOpen) {
            return { success: false, error: 'Not connected' };
        }
        const bytes = [0x3A, 0x42, v, 0x3B, 0x0A]; // ':' 'B' value ';' '\n'
        await new Promise((resolve, reject) => {
            currentSerialPort.write(Buffer.from(bytes), (err) => err ? reject(err) : resolve());
        });
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to send' };
    }
});

// Aux control ':X<val>;\n' 0..100
ipcMain.handle('set-aux', async (event, value) => {
    try {
        const v = Math.max(0, Math.min(100, parseInt(value || 0)));
        if (!currentSerialPort || !currentSerialPort.isOpen) {
            return { success: false, error: 'Not connected' };
        }
        const bytes = [0x3A, 0x58, v, 0x3B, 0x0A]; // ':' 'X' value ';' '\n'
        await new Promise((resolve, reject) => {
            currentSerialPort.write(Buffer.from(bytes), (err) => err ? reject(err) : resolve());
        });
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to send' };
    }
});

// Provide current connection status on demand
ipcMain.handle('get-connection-status', async () => {
    const base = {
        connected: isSerialConnected
    };
    if (isSerialConnected && currentSerialPort) {
        return Object.assign(base, {
            port: currentSerialPort.path,
            vid: TARGET_VENDOR_ID,
            pid: TARGET_PRODUCT_ID,
            deviceType: 'Stirling Engine'
        });
    }
    return Object.assign(base, { message: 'Not connected' });
});

// =============================
// Admin window support
// =============================
let adminWindow = null;

function createAdminWindow() {
    if (adminWindow && !adminWindow.isDestroyed()) {
        adminWindow.focus();
        return;
    }
    adminWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            // Admin window can reuse the same preload or none if purely static
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'Admin'
    });
    adminWindow.loadFile('admin.html');
    adminWindow.on('closed', function () { adminWindow = null; });
}

ipcMain.handle('open-admin-window', async () => {
    try {
        createAdminWindow();
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to open admin window' };
    }
});

// Start periodic search until connected
function startAutoSearch() {
    if (searchIntervalId) return;
    searchIntervalId = setInterval(async function() {
        if (isSerialConnected) {
            return;
        }
        const dev = await findStirlingDevicePort();
        if (dev && !isSerialConnected) {
            console.log('[SERIAL] Attempting connection to', dev.path, '...');
            sendConnectionStatus(false, { message: `Attempting connection to ${dev.path}...`, port: dev.path, vid: TARGET_VENDOR_ID, pid: TARGET_PRODUCT_ID });
            await connectSerialAtPath(dev.path);
        }
    }, 2000);
}

app.whenReady().then(function() {
    startAutoSearch();
});
