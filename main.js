// This is the main process file for our Electron app
// It creates and manages the application window

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { SerialPort } = require('serialport');
const { Worker } = require('worker_threads');

// Keep a global reference of the window object
let mainWindow;
let isSafeCloseInProgress = false;
let isSafeQuitInProgress = false;

// Data processing worker thread (runs on separate CPU core for better performance)
let dataWorker = null;

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
        // Renderer process responsive
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

    // Open the DevTools only when we pass --dev or --debug
    if (process.argv.includes('--dev') || process.argv.includes('--debug')) {
        mainWindow.webContents.openDevTools();
    }

    // Send connection status once window is ready to receive messages
    mainWindow.webContents.once('did-finish-load', function() {
        // Wait a moment for renderer to set up listeners, then send current status
        setTimeout(function() {
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
            // Also send it again after a longer delay to ensure it's received
            setTimeout(function() {
                if (isSerialConnected && currentSerialPort) {
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

    // Emitted when the window is about to close - send heater setpoint 20, OFF, and Aux Output 0 for safety
    mainWindow.on('close', function (event) {
        // Send safety commands before window closes
        if (currentSerialPort && currentSerialPort.isOpen && isSerialConnected) {
            if (isSafeCloseInProgress) {
                return;
            }
            isSafeCloseInProgress = true;
            // Prevent window from closing until commands are sent
            event.preventDefault();
            
            try {
                // First send heater setpoint 20
                const setpointBytes = [0x3A, 0x42, 20, 0x3B, 0x0A]; // ':' 'B' 20 ';' '\n'
                currentSerialPort.write(Buffer.from(setpointBytes), function(err) {
                    if (err) {
                        console.warn('[MAIN] Failed to send heater setpoint on window close:', err);
                    } else {
                        console.log('[MAIN] Sent heater setpoint 20 before window close');
                    }
                    
                    // Then send heater OFF for safety using ':C0;'
                    const offBytes = [0x3A, 0x43, 0, 0x3B, 0x0A]; // ':' 'C' 0 ';' '\n'
                    setTimeout(function() {
                        currentSerialPort.write(Buffer.from(offBytes), function(err) {
                            if (err) {
                                console.warn('[MAIN] Failed to send heater OFF (C0) on window close:', err);
                            } else {
                                console.log('[MAIN] Sent heater OFF (C0) before window close');
                            }
                            
                            // Then send Aux Output 0 for safety
                            const auxBytes = [0x3A, 0x58, 0, 0x3B, 0x0A]; // ':' 'X' 0 ';' '\n'
                            setTimeout(function() {
                                currentSerialPort.write(Buffer.from(auxBytes), function(err) {
                                    if (err) {
                                        console.warn('[MAIN] Failed to send Aux Output 0 on window close:', err);
                                    } else {
                                        console.log('[MAIN] Sent Aux Output 0 before window close');
                                    }
                                    
                                    // Finally send hardware ready OFF ':D0;'
                                    const readyBytes = [0x3A, 0x44, 0, 0x3B, 0x0A]; // ':' 'D' 0 ';' '\n'
                                    setTimeout(function() {
                                        currentSerialPort.write(Buffer.from(readyBytes), function(err) {
                                            if (err) {
                                                console.warn('[MAIN] Failed to send hardware ready OFF (D0) on window close:', err);
                                            } else {
                                            console.log('[MAIN] Sent hardware ready OFF (D0) before window close');
                                            }
                                            
                                            // Now close the window after all commands are sent
                                            setTimeout(function() {
                                                isSafeCloseInProgress = false;
                                                mainWindow.destroy();
                                            }, 100);
                                        });
                                    }, 50);
                                });
                            }, 50);
                        });
                    }, 50);
                });
            } catch (e) {
                console.warn('[MAIN] Error sending safety commands on window close:', e);
                isSafeCloseInProgress = false;
                // Close window even if there's an error
                mainWindow.destroy();
            }
        } else {
            // No connection, close normally
            mainWindow.destroy();
        }
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
            // Window not ready, skip status update
            return;
        }
        const payload = Object.assign({ connected: connected }, info || {});
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
        sendConnectionStatus(false, { message: 'Searching for Stirling Engine device...' });
        for (let i = 0; i < ports.length; i++) {
            const p = ports[i];
            const vid = p.vendorId ? String(p.vendorId).toUpperCase() : '';
            const pid = p.productId ? String(p.productId).toUpperCase() : '';
            if (vid === TARGET_VENDOR_ID && pid === TARGET_PRODUCT_ID) {
                sendConnectionStatus(false, { message: `Device found on ${p.path}. Preparing to connect...`, port: p.path, vid: TARGET_VENDOR_ID, pid: TARGET_PRODUCT_ID });
                return p;
            }
        }
        // Device not found this round
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

            // Process data on a separate worker thread for better performance
            port.on('data', function(_data) {
                try {
                    const payload = Array.from(_data);
                    
                    // Send raw data to worker thread for parsing (non-blocking)
                    if (dataWorker) {
                        try {
                            dataWorker.postMessage(payload);
                        } catch (e) {
                            console.warn('[SERIAL] Error sending data to worker:', e && e.message ? e.message : e);
                        }
                    }
                    
                    // Also forward raw data to admin window if needed
                    if (adminWindow && !adminWindow.isDestroyed() && !adminWindow.webContents.isDestroyed()) {
                        try {
                            adminWindow.webContents.send('raw-data', payload);
                        } catch (e) {
                            // Window might be closing, ignore
                        }
                    }
                } catch (e) {
                    // Silently ignore errors when sending data
                    console.warn('[SERIAL] Error processing data:', e && e.message ? e.message : e);
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

// Heater mode ':C<mode>;\n' where 0=off, 1=on
ipcMain.handle('set-heater-mode', async (event, mode) => {
    try {
        const m = Math.max(0, Math.min(1, parseInt(mode || 0)));
        if (!currentSerialPort || !currentSerialPort.isOpen) {
            return { success: false, error: 'Not connected' };
        }
        const bytes = [0x3A, 0x43, m, 0x3B, 0x0A]; // ':' 'C' mode ';' '\n'
        await new Promise((resolve, reject) => {
            currentSerialPort.write(Buffer.from(bytes), (err) => err ? reject(err) : resolve());
        });
        
        if (adminWindow && !adminWindow.isDestroyed()) {
            try {
                adminWindow.webContents.send('sent-command', {
                    type: 'heater-mode',
                    value: m,
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

// Hardware ready ':D<state>;\n' where 0=not ready, 1=ready
ipcMain.handle('set-hardware-ready', async (event, state) => {
    try {
        const s = Math.max(0, Math.min(1, parseInt(state || 0)));
        if (!currentSerialPort || !currentSerialPort.isOpen) {
            return { success: false, error: 'Not connected' };
        }
        const bytes = [0x3A, 0x44, s, 0x3B, 0x0A]; // ':' 'D' state ';' '\n'
        await new Promise((resolve, reject) => {
            currentSerialPort.write(Buffer.from(bytes), (err) => err ? reject(err) : resolve());
        });
        
        if (adminWindow && !adminWindow.isDestroyed()) {
            try {
                adminWindow.webContents.send('sent-command', {
                    type: 'hardware-ready',
                    value: s,
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

ipcMain.handle('save-csv', async (event, payload) => {
    try {
        if (!payload || !payload.filePath || !Array.isArray(payload.rows)) {
            return { success: false, error: 'Invalid CSV data' };
        }
        const filePath = payload.filePath;
        const rows = payload.rows;
        const folder = path.dirname(filePath);
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        fs.writeFileSync(filePath, rows.join('\n'), 'utf8');
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to save CSV file' };
    }
});

ipcMain.handle('choose-csv-path', async () => {
    try {
        const result = await dialog.showSaveDialog({
            title: 'Save Stirling Data',
            defaultPath: path.join(app.getPath('documents'), 'StirlingData.csv'),
            buttonLabel: 'Save',
            filters: [
                { name: 'CSV Files', extensions: ['csv'] }
            ]
        });
        if (result.canceled || !result.filePath) {
            return { success: false };
        }
        return { success: true, filePath: result.filePath };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to open save dialog' };
    }
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

// Initialize data processing worker thread
function startDataWorker() {
    if (dataWorker) {
        return; // Worker already running
    }
    
    try {
        const workerPath = path.join(__dirname, 'data-worker.js');
        dataWorker = new Worker(workerPath);
        
        // Receive parsed data from worker and forward to renderer
        dataWorker.on('message', function(parsedPackets) {
            try {
                // parsedPackets should be an array from worker
                if (!parsedPackets) return;
                
                // Ensure it's an array
                const packets = Array.isArray(parsedPackets) ? parsedPackets : [parsedPackets];
                
                // Forward parsed data to renderer (non-blocking)
                if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
                    try {
                        // Send packets array to renderer
                        mainWindow.webContents.send('stirling-data', packets);
                        // Data forwarded silently
                    } catch (e) {
                        // Window might be closing, ignore
                        console.warn('[MAIN] Error sending to renderer:', e && e.message ? e.message : e);
                    }
                }
            } catch (e) {
                console.warn('[MAIN] Error forwarding parsed data:', e && e.message ? e.message : e);
            }
        });
        
        dataWorker.on('error', function(error) {
            console.error('[MAIN] Data worker error:', error);
        });
        
        dataWorker.on('exit', function(code) {
            if (code !== 0) {
                console.error('[MAIN] Data worker exited with code', code);
            }
            dataWorker = null;
        });
        
        // Data processing worker started
    } catch (e) {
        console.error('[MAIN] Failed to start data worker:', e);
        dataWorker = null;
    }
}

app.whenReady().then(function() {
    // Start data processing worker first
    startDataWorker();
    
    // Start auto-search for hardware
    startAutoSearch();
    
    // Start periodic status updates after a delay to ensure window is ready
    setTimeout(function() {
        startStatusUpdates();
    }, 2000);
});

// Clean up worker when app quits
app.on('before-quit', function(event) {
    // Send heater setpoint 20, OFF, and Aux Output 0 for safety before closing
    if (currentSerialPort && currentSerialPort.isOpen && isSerialConnected) {
        if (isSafeQuitInProgress) {
            return;
        }
        isSafeQuitInProgress = true;
        // Prevent app from quitting until commands are sent
        event.preventDefault();
        
        try {
            // First send heater setpoint 20
            const setpointBytes = [0x3A, 0x42, 20, 0x3B, 0x0A]; // ':' 'B' 20 ';' '\n'
            currentSerialPort.write(Buffer.from(setpointBytes), function(err) {
                if (err) {
                    console.warn('[MAIN] Failed to send heater setpoint on close:', err);
                } else {
                    console.log('[MAIN] Sent heater setpoint 20 before app close');
                }
                
                // Then send heater OFF for safety using ':C0;'
                const offBytes = [0x3A, 0x43, 0, 0x3B, 0x0A]; // ':' 'C' 0 ';' '\n'
                setTimeout(function() {
                    currentSerialPort.write(Buffer.from(offBytes), function(err) {
                        if (err) {
                            console.warn('[MAIN] Failed to send heater OFF (C0) on close:', err);
                        } else {
                            console.log('[MAIN] Sent heater OFF (C0) before app close');
                        }
                        
                        // Then send Aux Output 0 for safety
                        const auxBytes = [0x3A, 0x58, 0, 0x3B, 0x0A]; // ':' 'X' 0 ';' '\n'
                        setTimeout(function() {
                            currentSerialPort.write(Buffer.from(auxBytes), function(err) {
                                if (err) {
                                    console.warn('[MAIN] Failed to send Aux Output 0 on close:', err);
                                } else {
                                    console.log('[MAIN] Sent Aux Output 0 before app close');
                                }
                                
                                // Finally send hardware ready OFF ':D0;'
                                const readyBytes = [0x3A, 0x44, 0, 0x3B, 0x0A]; // ':' 'D' 0 ';' '\n'
                                setTimeout(function() {
                                    currentSerialPort.write(Buffer.from(readyBytes), function(err) {
                                        if (err) {
                                            console.warn('[MAIN] Failed to send hardware ready OFF (D0) on close:', err);
                                        } else {
                                            console.log('[MAIN] Sent hardware ready OFF (D0) before app close');
                                        }
                                        
                                        // Clean up worker and quit app after all commands are sent
                                        if (dataWorker) {
                                            dataWorker.terminate();
                                            dataWorker = null;
                                        }
                                        
                                        setTimeout(function() {
                                            app.exit(0);
                                        }, 100);
                                    });
                                }, 50);
                            });
                        }, 50);
                    });
                }, 50);
            });
        } catch (e) {
            console.warn('[MAIN] Error sending safety commands on close:', e);
            // Clean up and quit even if there's an error
            if (dataWorker) {
                dataWorker.terminate();
                dataWorker = null;
            }
            app.exit(0);
        }
    } else {
        // No connection, quit normally
        if (dataWorker) {
            dataWorker.terminate();
            dataWorker = null;
        }
    }
});
