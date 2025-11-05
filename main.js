// This is the main process file for our Electron app
// It creates and manages the application window

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { SerialPort } = require('serialport');

// Keep a global reference of the window object
let mainWindow;

// =============================
// Global Error Handlers - Prevent JavaScript error dialogs
// =============================

// Catch unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
    // Don't show error dialog, just log it
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't show error dialog, just log it
    // The app will continue running
});

// Catch Electron's uncaught exceptions in renderer
app.on('browser-window-created', (event, window) => {
    window.webContents.on('crashed', () => {
        console.error('Renderer process crashed');
    });
    window.webContents.on('unresponsive', () => {
        console.warn('Renderer process became unresponsive');
    });
    window.webContents.on('responsive', () => {
        console.log('Renderer process is responsive again');
    });
});

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
        icon: path.join(__dirname, 'assets/android-chrome-512x512.png'), // App icon (use PNG for Linux compatibility)
        title: 'Matrix Stirling Engine'
    });

    // Maximize the window on launch for best visibility
    try { mainWindow.maximize(); } catch (_) {}
    try { mainWindow.setMenuBarVisibility(false); } catch (_) {}

    // Load the HTML file
    mainWindow.loadFile('index.html');

    // Open the DevTools in development mode or for debugging
    if (process.argv.includes('--dev') || process.argv.includes('--debug')) {
        mainWindow.webContents.openDevTools();
    }
    
    // Always enable console logging for debugging (you can disable this later)
    // For now, let's enable DevTools to see what's happening
    mainWindow.webContents.openDevTools();

    // Send connection status once window is ready to receive messages
    mainWindow.webContents.once('did-finish-load', function() {
        console.log('[MAIN] Window finished loading, sending initial connection status');
        // Wait a moment for renderer to set up listeners, then send current status
        setTimeout(function() {
            if (isSerialConnected && currentSerialPort) {
                console.log('[MAIN] Sending initial connected status');
                sendConnectionStatus(true, {
                    port: currentSerialPort.path,
                    vid: TARGET_VENDOR_ID,
                    pid: TARGET_PRODUCT_ID,
                    deviceType: 'Stirling Engine'
                });
            } else {
                console.log('[MAIN] Sending initial disconnected status');
                sendConnectionStatus(false, { message: 'Searching for device...' });
            }
            // Also send it again after a longer delay to ensure it's received
            setTimeout(function() {
                if (isSerialConnected && currentSerialPort) {
                    console.log('[MAIN] Sending delayed connected status');
                    sendConnectionStatus(true, {
                        port: currentSerialPort.path,
                        vid: TARGET_VENDOR_ID,
                        pid: TARGET_PRODUCT_ID,
                        deviceType: 'Stirling Engine'
                    });
                }
            }, 2000);
        }, 1000);
    });

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
    try {
        if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
            console.log('[SERIAL] Cannot send connection status - window not ready');
            return;
        }
        const payload = Object.assign({ connected: connected }, info || {});
        console.log('[SERIAL] Sending connection-status:', payload);
        mainWindow.webContents.send('connection-status', payload);
    } catch (e) {
        console.error('[SERIAL] Error sending connection status:', e && e.message ? e.message : e);
    }
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
            // Close any existing port first and wait a bit
            if (currentSerialPort) {
                try {
                    if (currentSerialPort.isOpen) {
                        currentSerialPort.close();
                    }
                } catch (e) {
                    console.warn('[SERIAL] Error closing existing port:', e);
                }
                currentSerialPort = null;
                isSerialConnected = false;
                // Wait a moment for port to be released
                setTimeout(function() {
                    attemptConnection(portPath, resolve);
                }, 500);
            } else {
                attemptConnection(portPath, resolve);
            }
        } catch (e) {
            console.error('[SERIAL] Connect setup error:', e && e.message ? e.message : e);
            isSerialConnected = false;
            isConnecting = false;
            sendConnectionStatus(false, { error: e && e.message ? e.message : 'Connection setup failed' });
            resolve({ success: false, error: e && e.message ? e.message : 'Connection setup failed' });
        }
    });
}

function attemptConnection(portPath, resolve) {
    try {

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
                isConnecting = false; // Clear connecting flag on success
                currentSerialPort = port;
                // Send connection status immediately
                sendConnectionStatus(true, { port: portPath, vid: TARGET_VENDOR_ID, pid: TARGET_PRODUCT_ID, deviceType: 'Stirling Engine' });
                // Also send it again after a short delay to ensure window is ready
                setTimeout(function() {
                    sendConnectionStatus(true, { port: portPath, vid: TARGET_VENDOR_ID, pid: TARGET_PRODUCT_ID, deviceType: 'Stirling Engine' });
                }, 1000);
                resolve({ success: true, port: portPath });
            });

            port.on('error', function(err) {
                console.error('[SERIAL] Serial error:', err && err.message ? err.message : err);
                isSerialConnected = false;
                currentSerialPort = null;
                sendConnectionStatus(false, { error: err && err.message ? err.message : 'Serial error' });
                // Make sure promise resolves even on error
                if (!port.isOpen) {
                    resolve({ success: false, error: err && err.message ? err.message : 'Serial error' });
                }
            });

            port.on('close', function() {
                console.warn('[SERIAL] Port closed');
                isSerialConnected = false;
                if (currentSerialPort === port) {
                    currentSerialPort = null;
                }
                sendConnectionStatus(false, { error: 'Port closed' });
            });

            // Optional: read data and forward raw bytes if needed later
            port.on('data', function(_data) {
                // Forward raw data to any open windows (main and admin)
                try {
                    const payload = Array.from(_data);
                    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
                        try {
                            mainWindow.webContents.send('raw-data', payload);
                        } catch (e) {
                            // Window might be closing, ignore
                        }
                    }
                    if (adminWindow && !adminWindow.isDestroyed() && !adminWindow.webContents.isDestroyed()) {
                        try {
                            adminWindow.webContents.send('raw-data', payload);
                        } catch (e) {
                            // Window might be closing, ignore
                        }
                    }
                } catch (e) {
                    // Silently ignore errors when sending data
                    console.warn('[SERIAL] Error sending data to renderer:', e && e.message ? e.message : e);
                }
            });

            port.open(function(err) {
                if (err) {
                    console.error('[SERIAL] Open failed:', err && err.message ? err.message : err);
                    isSerialConnected = false;
                    isConnecting = false; // Clear connecting flag on error
                    currentSerialPort = null;
                    
                    // Check if it's a lock error - wait longer before retry
                    const errorMsg = err && err.message ? err.message : '';
                    if (errorMsg.includes('lock') || errorMsg.includes('temporarily unavailable')) {
                        console.log('[SERIAL] Port is locked, will retry after delay');
                        sendConnectionStatus(false, { error: 'Port busy, retrying...' });
                        // Wait longer before next attempt
                        setTimeout(function() {
                            isConnecting = false;
                        }, 5000);
                    } else {
                        sendConnectionStatus(false, { error: errorMsg || 'Open failed' });
                    }
                    
                    resolve({ success: false, error: errorMsg || 'Open failed' });
                    return;
                }
                // If open succeeds, the 'open' event handler will resolve the promise
            });
        } catch (e) {
            console.error('[SERIAL] Open threw exception:', e && e.message ? e.message : e);
            isSerialConnected = false;
            isConnecting = false;
            currentSerialPort = null;
            sendConnectionStatus(false, { error: e && e.message ? e.message : 'Open failed' });
            resolve({ success: false, error: e && e.message ? e.message : 'Open failed' });
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
        
        // Send command data to admin window if it exists
        if (adminWindow && !adminWindow.isDestroyed()) {
            try {
                adminWindow.webContents.send('sent-command', {
                    type: 'heater',
                    value: v,
                    bytes: bytes,
                    timestamp: new Date()
                });
            } catch (_) {}
        }
        
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
        
        // Send command data to admin window if it exists
        if (adminWindow && !adminWindow.isDestroyed()) {
            try {
                adminWindow.webContents.send('sent-command', {
                    type: 'aux',
                    value: v,
                    bytes: bytes,
                    timestamp: new Date()
                });
            } catch (_) {}
        }
        
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
        icon: path.join(__dirname, 'assets/android-chrome-512x512.png'),
        title: 'Matrix Stirling Engine - Admin'
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
let isConnecting = false; // Prevent multiple simultaneous connection attempts

function startAutoSearch() {
    if (searchIntervalId) return;
    searchIntervalId = setInterval(async function() {
        if (isSerialConnected || isConnecting) {
            return;
        }
        const dev = await findStirlingDevicePort();
        if (dev && !isSerialConnected && !isConnecting) {
            isConnecting = true;
            console.log('[SERIAL] Attempting connection to', dev.path, '...');
            sendConnectionStatus(false, { message: `Attempting connection to ${dev.path}...`, port: dev.path, vid: TARGET_VENDOR_ID, pid: TARGET_PRODUCT_ID });
            try {
                await connectSerialAtPath(dev.path);
            } catch (e) {
                console.error('[SERIAL] Connection attempt error:', e);
            } finally {
                // Reset connecting flag after a delay to allow retry
                setTimeout(function() {
                    if (!isSerialConnected) {
                        isConnecting = false;
                    }
                }, 3000);
            }
        }
    }, 3000); // Increased interval to 3 seconds to reduce conflicts
}

// Periodically send connection status to ensure UI stays updated
let statusUpdateInterval = null;

function startStatusUpdates() {
    if (statusUpdateInterval) return;
    statusUpdateInterval = setInterval(function() {
        if (isSerialConnected && currentSerialPort) {
            sendConnectionStatus(true, {
                port: currentSerialPort.path,
                vid: TARGET_VENDOR_ID,
                pid: TARGET_PRODUCT_ID,
                deviceType: 'Stirling Engine'
            });
        } else {
            sendConnectionStatus(false, { message: 'Searching for device...' });
        }
    }, 3000); // Send status every 3 seconds
}

app.whenReady().then(function() {
    startAutoSearch();
    // Start periodic status updates after a delay to ensure window is ready
    setTimeout(function() {
        startStatusUpdates();
    }, 2000);
});
