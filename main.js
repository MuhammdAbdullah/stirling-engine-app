// This is the main process file for our Electron app
// It creates and manages the application window

const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { SerialPort } = require('serialport');
const { Worker } = require('worker_threads');
const HID = require('node-hid');

// Suppress Chromium-level noise (e.g. DevTools protocol method-not-found errors)
app.commandLine.appendSwitch('log-level', '3');

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
    // Get the primary display (the main screen)
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Calculate window size: use 95% of screen size for better fit
    // But ensure minimum size of 800x600
    const windowWidth = Math.max(800, Math.floor(screenWidth * 0.95));
    const windowHeight = Math.max(600, Math.floor(screenHeight * 0.95));
    
    // Create the browser window with screen-appropriate size
    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
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

    // Make fullscreen on launch for best visibility
    // On Windows: Maximize (Full Window)
    // On Linux/Others: Full Screen
    if (process.platform === 'win32') {
        try { mainWindow.maximize(); } catch (_) {}
    } else {
        try { mainWindow.setFullScreen(true); } catch (_) {}
    }
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

// Target device VID/PID (normal Stirling Engine hardware)
const TARGET_VENDOR_ID = '12BF';
const TARGET_PRODUCT_ID = '010B';

// Bootloader mode VID/PID (device re-enumerates after :T1; trigger)
const BOOTLOADER_VENDOR_ID = '12BF';
const BOOTLOADER_PRODUCT_ID = '00A1';

// USB HID bootloader device state
let usbHidDevice = null;
let bootloaderRxBuffer = Buffer.alloc(0);
let bootloaderResponsePromise = null;
let bootloaderResponseData = null;

// Bootloader protocol constants (matching C code)
const SOH = 0x01;
const EOT = 0x04;
const DLE = 0x10;
const READ_BOOT_INFO = 0x01;
const ERASE_FLASH = 0x02;
const PROGRAM_FLASH = 0x03;
const READ_CRC = 0x04;
const JMP_TO_APP = 0x05;

// Bootloader hex file state
let bootloaderHexRecords = [];
let bootloaderExpectedCRC = 0;
let bootloaderFlashStartAddress = 0;
let bootloaderFlashLength = 0;
const BOOT_SECTOR_BEGIN = 0x7FC000;

// CRC16 table (matching C code table-driven algorithm)
const crcTable = [
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
    0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef
];

function calculateBootloaderCRC(data) {
    let crc = 0;
    for (let idx = 0; idx < data.length; idx++) {
        const byte = data[idx];
        let i = ((crc >> 12) ^ (byte >> 4)) & 0x0F;
        crc = (crcTable[i] ^ (crc << 4)) & 0xFFFF;
        i = ((crc >> 12) ^ (byte & 0x0F)) & 0x0F;
        crc = (crcTable[i] ^ (crc << 4)) & 0xFFFF;
    }
    return crc & 0xFFFF;
}

function buildBootloaderFrame(cmd, data = Buffer.alloc(0)) {
    const payload = Buffer.concat([Buffer.from([cmd]), data]);
    const crc = calculateBootloaderCRC(payload);
    const payloadWithCrc = Buffer.concat([payload, Buffer.from([crc & 0xFF, (crc >> 8) & 0xFF])]);
    const frame = Buffer.alloc(2 + payloadWithCrc.length * 2);
    let offset = 0;
    frame[offset++] = SOH;
    for (let i = 0; i < payloadWithCrc.length; i++) {
        const byte = payloadWithCrc[i];
        if (byte === SOH || byte === EOT || byte === DLE) frame[offset++] = DLE;
        frame[offset++] = byte;
    }
    frame[offset++] = EOT;
    return frame.slice(0, offset);
}

function processBootloaderResponse(data) {
    let trimmedLength = data.length;
    while (trimmedLength > 0 && data[trimmedLength - 1] === 0x00) trimmedLength--;
    if (trimmedLength > 0 && trimmedLength < data.length) data = data.slice(0, trimmedLength);
    bootloaderRxBuffer = data;

    while (bootloaderRxBuffer.length > 0) {
        let eotIndex = -1;
        let escape = false;
        for (let i = 0; i < bootloaderRxBuffer.length; i++) {
            const byte = bootloaderRxBuffer[i];
            if (byte === DLE && !escape) { escape = true; continue; }
            if (byte === EOT && !escape) { eotIndex = i; break; }
            escape = false;
        }
        if (eotIndex < 0) break;

        let frameStart = bootloaderRxBuffer[0] === SOH ? 1 : 0;
        if (eotIndex - frameStart < 3) { bootloaderRxBuffer = bootloaderRxBuffer.slice(eotIndex + 1); continue; }

        const decodedData = [];
        escape = false;
        for (let i = frameStart; i < eotIndex; i++) {
            const byte = bootloaderRxBuffer[i];
            if (byte === DLE && !escape) { escape = true; continue; }
            if (byte === SOH && !escape) { decodedData.length = 0; escape = false; continue; }
            decodedData.push(byte);
            escape = false;
        }

        if (decodedData.length < 3) { bootloaderRxBuffer = bootloaderRxBuffer.slice(eotIndex + 1); continue; }

        const cmd = decodedData[0];
        const frameData = decodedData.slice(1, decodedData.length - 2);
        const crcReceived = decodedData[decodedData.length - 2] | (decodedData[decodedData.length - 1] << 8);
        const crcPayload = Buffer.from([cmd, ...frameData]);
        const crcCalculated = calculateBootloaderCRC(crcPayload);

        if (crcCalculated === crcReceived) {
            const responseData = Buffer.from(frameData);
            bootloaderResponseData = { cmd, data: responseData, success: true, responseData };
            if (bootloaderResponsePromise && bootloaderResponsePromise.resolve && bootloaderResponsePromise.expectedCmd === cmd) {
                if (bootloaderResponsePromise.timeoutId) clearTimeout(bootloaderResponsePromise.timeoutId);
                bootloaderResponsePromise.resolve(bootloaderResponseData);
                bootloaderResponsePromise = null;
            }
        } else {
            bootloaderResponseData = { cmd, data: null, success: false, error: 'Invalid CRC' };
            if (bootloaderResponsePromise && bootloaderResponsePromise.resolve) {
                if (bootloaderResponsePromise.timeoutId) clearTimeout(bootloaderResponsePromise.timeoutId);
                bootloaderResponsePromise.resolve(bootloaderResponseData);
                bootloaderResponsePromise = null;
            }
        }
        bootloaderRxBuffer = bootloaderRxBuffer.slice(eotIndex + 1);
    }
}

async function sendBootloaderCommand(cmd, data = Buffer.alloc(0), retries = 3, delayMs = 500) {
    if (!usbHidDevice) throw new Error('Not connected to bootloader USB HID device');
    const frame = buildBootloaderFrame(cmd, data);
    const USB_BUFFER_SIZE = 64;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            let bytesRemaining = frame.length;
            let frameOffset = 0;
            while (bytesRemaining > 0) {
                const hidPacket = Buffer.alloc(USB_BUFFER_SIZE + 1, 0xFF);
                hidPacket[0] = 0;
                const bytesToCopy = Math.min(bytesRemaining, USB_BUFFER_SIZE);
                frame.copy(hidPacket, 1, frameOffset, frameOffset + bytesToCopy);
                usbHidDevice.write(Array.from(hidPacket));
                frameOffset += USB_BUFFER_SIZE;
                bytesRemaining -= USB_BUFFER_SIZE;
            }

            if (cmd === PROGRAM_FLASH) return { success: true };

            bootloaderResponseData = null;
            bootloaderResponsePromise = { resolve: null, reject: null, expectedCmd: cmd };
            const responsePromise = new Promise((resolve, reject) => {
                bootloaderResponsePromise.resolve = resolve;
                bootloaderResponsePromise.reject = reject;
                const timeoutMs = delayMs + 3000;
                const timeoutId = setTimeout(() => {
                    if (bootloaderResponsePromise && bootloaderResponsePromise.expectedCmd === cmd) {
                        bootloaderResponsePromise = null;
                        reject(new Error('Timeout waiting for response'));
                    }
                }, timeoutMs);
                if (bootloaderResponsePromise) bootloaderResponsePromise.timeoutId = timeoutId;
            });

            const response = await responsePromise;
            if (response && response.success) return { success: true, responseData: response.data };
            return { success: false, error: response ? response.error : 'Response error' };
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}

function parseHexFile(hexContent) {
    const lines = hexContent.split('\n').filter(line => line.trim().length > 0);
    const records = [];
    for (const line of lines) {
        if (line[0] !== ':') continue;
        const hexData = line.substr(1).trim();
        const matches = hexData.match(/.{1,2}/g);
        if (!matches) continue;
        const recordBytes = Buffer.from(matches.map(b => parseInt(b, 16)));
        if (recordBytes.length < 5) continue;
        const byteCount = recordBytes[0];
        const address = (recordBytes[1] << 8) | recordBytes[2];
        const recordType = recordBytes[3];
        if (recordType === 0x01) break;
        const dataBytes = byteCount > 0 ? recordBytes.slice(4, 4 + byteCount) : Buffer.alloc(0);
        records.push({ address, rawRecord: recordBytes, data: dataBytes, type: recordType });
    }
    return records;
}

function calculateFlashCRCFromHexFile(hexContent) {
    const FLASH_SIZE = 5 * 1024 * 1024;
    const virtualFlash = Buffer.alloc(FLASH_SIZE);
    for (let i = 0; i < FLASH_SIZE; i++) virtualFlash[i] = (i + 1) % 4 === 0 ? 0x00 : 0xFF;

    const lines = hexContent.split('\n').filter(line => line.trim().length > 0);
    let extLinAddress = 0, extSegAddress = 0, minAddress = 0xFFFFFFFF, maxAddress = 0;

    for (const line of lines) {
        if (line[0] !== ':') continue;
        const hexData = line.substr(1);
        const bytes = [];
        for (let i = 0; i < hexData.length - 1; i += 2) {
            const s = hexData.substr(i, 2);
            if (/[0-9A-Fa-f]{2}/.test(s)) bytes.push(parseInt(s, 16));
        }
        if (bytes.length < 5) continue;
        const recDataLen = bytes[0], recAddress = (bytes[1] << 8) | bytes[2];
        const recType = bytes[3], data = bytes.slice(4, 4 + recDataLen);

        if (recType === 0x00) {
            let progAddress = (recAddress + extLinAddress + extSegAddress) & 0xFFFFFFFF;
            if (progAddress < BOOT_SECTOR_BEGIN) {
                if (maxAddress < progAddress + recDataLen) maxAddress = progAddress + recDataLen;
                if (minAddress > progAddress) minAddress = progAddress;
                for (let i = 0; i < data.length && (progAddress + i) < FLASH_SIZE; i++) virtualFlash[progAddress + i] = data[i];
            }
        } else if (recType === 0x02) { extSegAddress = ((data[0] << 16) & 0x00FF0000) | ((data[1] << 8) & 0x0000FF00); extLinAddress = 0; }
        else if (recType === 0x04) { extLinAddress = ((data[0] << 24) & 0xFF000000) | ((data[1] << 16) & 0x00FF0000); extSegAddress = 0; }
        else if (recType === 0x01) { extSegAddress = 0; extLinAddress = 0; break; }
    }

    minAddress -= minAddress % 4;
    maxAddress += maxAddress % 4;
    const progLen = maxAddress - minAddress;
    const startAddress = Math.floor(minAddress / 2);
    const crc = calculateBootloaderCRC(virtualFlash.slice(minAddress, minAddress + progLen));

    bootloaderFlashStartAddress = startAddress;
    bootloaderFlashLength = progLen;
    bootloaderExpectedCRC = crc;

    return { startAddress, progLen, crc };
}

function sendBootloaderProgressToAllWindows(progressData) {
    try {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('bootloader-progress', progressData);
    } catch (_) {}
}

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
                    
                    // Forward raw data to main window for calibration parsing
                    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
                        try {
                            mainWindow.webContents.send('raw-data', payload);
                        } catch (e) {
                            // Window might be closing, ignore
                        }
                    }
                    
                    // (raw-data already sent to mainWindow above — no separate admin window)
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
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('sent-command', {
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
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('sent-command', {
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
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('sent-command', {
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
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('sent-command', {
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

// Helper to send calibration commands over serial (labels M, Z, N)
async function sendCalibrationSerialCommand(labelByte) {
    try {
        if (!currentSerialPort || !currentSerialPort.isOpen) {
            return { success: false, error: 'Not connected' };
        }
        const bytes = [0x3A, labelByte, 0x01, 0x3B, 0x0A]; // ':' label 1 ';' '\n'
        await new Promise((resolve, reject) => {
            currentSerialPort.write(Buffer.from(bytes), (err) => err ? reject(err) : resolve());
        });
        
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('sent-command', {
                    type: 'calibration',
                    labelByte: labelByte,
                    bytes: bytes,
                    timestamp: new Date()
                });
            } catch (_) {}
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to send' };
    }
}

function sendCalibrationPacketToRenderer(labelChar) {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
        return false;
    }
    const packet = {
        label: labelChar,
        value: 1,
        pressureReadings: [],
        volumeReadings: [],
        rpm: 0,
        heaterTemperature: 0,
        timestamp: new Date()
    };
    try {
        mainWindow.webContents.send('stirling-data', [packet]);
        return true;
    } catch (e) {
        return false;
    }
}

// Send calibration data with label M and value 1
ipcMain.handle('send-calibration', async () => {
    const serialResult = await sendCalibrationSerialCommand(0x4D); // 'M'
    if (!serialResult.success) {
        return serialResult;
    }
    if (!sendCalibrationPacketToRenderer('M')) {
        return { success: false, error: 'Window not available' };
    }
    return { success: true };
});

// Send zero calibration data with label Z and value 1
ipcMain.handle('send-zero-calibration', async () => {
    const serialResult = await sendCalibrationSerialCommand(0x5A); // 'Z'
    if (!serialResult.success) {
        return serialResult;
    }
    if (!sendCalibrationPacketToRenderer('Z')) {
        return { success: false, error: 'Window not available' };
    }
    return { success: true };
});

// Send calibration done data with label N and value 1
ipcMain.handle('send-calibration-done', async () => {
    const serialResult = await sendCalibrationSerialCommand(0x4E); // 'N'
    if (!serialResult.success) {
        return serialResult;
    }
    if (!sendCalibrationPacketToRenderer('N')) {
        return { success: false, error: 'Window not available' };
    }
    return { success: true };
});

// Trigger bootloader ':T1;\n' — sent to the currently connected Stirling Engine
// Device will re-enumerate as bootloader (VID:12BF PID:00A1) after receiving this
ipcMain.handle('send-bootloader', async () => {
    try {
        if (!currentSerialPort || !currentSerialPort.isOpen) {
            return { success: false, error: 'Not connected' };
        }
        const bytes = [0x3A, 0x54, 0x01, 0x3B, 0x0A]; // ':' 'T' 1 ';' '\n'
        await new Promise((resolve, reject) => {
            currentSerialPort.write(Buffer.from(bytes), (err) => err ? reject(err) : resolve());
        });
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                mainWindow.webContents.send('sent-command', {
                    type: 'bootloader-trigger',
                    labelByte: 0x54,
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

// Check if bootloader USB HID device is present
ipcMain.handle('check-bootloader-device', (event, vid, pid) => {
    try {
        const vendorId = parseInt(String(vid).replace(/^0x/i, ''), 16);
        const productId = parseInt(String(pid).replace(/^0x/i, ''), 16);
        if (isNaN(vendorId) || isNaN(productId)) return false;
        const devices = HID.devices();
        return devices.some(d => d.vendorId === vendorId && d.productId === productId);
    } catch (e) { return false; }
});

// Connect to bootloader USB HID device (device re-enumerates after :T1; trigger)
ipcMain.handle('connect-to-bootloader-usb', async (event, vid, pid) => {
    try {
        let vendorId = typeof vid === 'string' ? parseInt(vid.replace(/^0x/i, ''), 16) : parseInt(vid);
        let productId = typeof pid === 'string' ? parseInt(pid.replace(/^0x/i, ''), 16) : parseInt(pid);
        if (isNaN(vendorId) || isNaN(productId)) return { success: false, error: 'Invalid VID or PID format' };

        if (usbHidDevice) { try { usbHidDevice.close(); } catch (_) {} usbHidDevice = null; }

        const MAX_RETRIES = 10, RETRY_INTERVAL_MS = 500;
        let deviceInfo = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const devices = HID.devices();
            deviceInfo = devices.find(d => d.vendorId === vendorId && d.productId === productId);
            if (deviceInfo) break;
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, RETRY_INTERVAL_MS));
        }

        if (!deviceInfo) {
            return { success: false, error: `Bootloader device not found (VID:0X${vendorId.toString(16).toUpperCase().padStart(4, '0')} PID:0X${productId.toString(16).toUpperCase().padStart(4, '0')})` };
        }

        try {
            usbHidDevice = new HID.HID(vendorId, productId);
            usbHidDevice.on('data', (data) => {
                if (data.length > 1) processBootloaderResponse(data.slice(1));
            });
            usbHidDevice.on('error', (error) => {
                console.log('[USB HID] Device error:', error.message);
                usbHidDevice = null;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('connection-status', { connected: false, isBootloader: true });
                }
            });
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('connection-status', { connected: true, isBootloader: true, port: `USB HID (VID:0x${vendorId.toString(16).toUpperCase()} PID:0x${productId.toString(16).toUpperCase()})` });
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: `Failed to open USB HID device: ${error.message}` };
        }
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to connect' };
    }
});

// Disconnect from bootloader
ipcMain.handle('disconnect-from-port', async () => {
    try {
        if (usbHidDevice) { try { usbHidDevice.close(); } catch (_) {} usbHidDevice = null; }
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to disconnect' };
    }
});

// Read bootloader version info
ipcMain.handle('bootloader-read-info', async () => {
    try {
        await sendBootloaderCommand(READ_BOOT_INFO, Buffer.alloc(0), 3, 200);
        return { success: true, majorVersion: 1, minorVersion: 0 };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Erase flash
ipcMain.handle('bootloader-erase-flash', async () => {
    try {
        sendBootloaderProgressToAllWindows({ step: 'erase', progress: 0, label: 'Erasing flash...' });
        const result = await sendBootloaderCommand(ERASE_FLASH, Buffer.alloc(0), 3, 5000);
        if (!result.success) { sendBootloaderProgressToAllWindows({ step: 'erase', progress: 0, label: 'Erase failed!' }); return { success: false, error: result.error || 'Erase failed' }; }
        sendBootloaderProgressToAllWindows({ step: 'erase', progress: 100, label: 'Erase completed!' });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Program flash from loaded hex records
ipcMain.handle('bootloader-program-flash', async () => {
    try {
        if (bootloaderHexRecords.length === 0) return { success: false, error: 'No hex file loaded' };
        sendBootloaderProgressToAllWindows({ step: 'program', progress: 0, label: 'Starting programming...' });

        const RECORDS_PER_COMMAND = 10;
        const totalBatches = Math.ceil(bootloaderHexRecords.length / RECORDS_PER_COMMAND);

        for (let i = 0; i < bootloaderHexRecords.length; i += RECORDS_PER_COMMAND) {
            const batch = bootloaderHexRecords.slice(i, i + RECORDS_PER_COMMAND);
            const batchNumber = Math.floor(i / RECORDS_PER_COMMAND) + 1;
            const progressPercent = Math.round((batchNumber / totalBatches) * 100);
            sendBootloaderProgressToAllWindows({ step: 'program', progress: progressPercent, label: `Programming ${batchNumber}/${totalBatches}...` });

            const commandData = Buffer.alloc(1000);
            let offset = 0;
            for (const record of batch) {
                if (record.rawRecord) { record.rawRecord.copy(commandData, offset); offset += record.rawRecord.length; }
            }
            await sendBootloaderCommand(PROGRAM_FLASH, commandData.slice(0, offset), 1, 0);
            if (i + RECORDS_PER_COMMAND < bootloaderHexRecords.length) await new Promise(r => setTimeout(r, 2));
        }
        sendBootloaderProgressToAllWindows({ step: 'program', progress: 100, label: 'Programming completed!' });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Read CRC from device and compare against expected
ipcMain.handle('bootloader-read-crc', async () => {
    try {
        sendBootloaderProgressToAllWindows({ step: 'verify', progress: 0, label: 'Verifying flash...' });
        const crcCommandData = Buffer.alloc(10);
        crcCommandData[0] = bootloaderFlashStartAddress & 0xFF; crcCommandData[1] = (bootloaderFlashStartAddress >> 8) & 0xFF;
        crcCommandData[2] = (bootloaderFlashStartAddress >> 16) & 0xFF; crcCommandData[3] = (bootloaderFlashStartAddress >> 24) & 0xFF;
        crcCommandData[4] = bootloaderFlashLength & 0xFF; crcCommandData[5] = (bootloaderFlashLength >> 8) & 0xFF;
        crcCommandData[6] = (bootloaderFlashLength >> 16) & 0xFF; crcCommandData[7] = (bootloaderFlashLength >> 24) & 0xFF;
        crcCommandData[8] = bootloaderExpectedCRC & 0xFF; crcCommandData[9] = (bootloaderExpectedCRC >> 8) & 0xFF;

        const result = await sendBootloaderCommand(READ_CRC, crcCommandData, 3, 2000);
        if (!result.success) return { success: false, error: result.error || 'Failed to read CRC' };

        let crcMatch = false;
        if (result.responseData && result.responseData.length >= 2) {
            const crcReceived = result.responseData[0] | (result.responseData[1] << 8);
            crcMatch = crcReceived === bootloaderExpectedCRC;
            sendBootloaderProgressToAllWindows({ step: 'verify', progress: 100, label: crcMatch ? 'Verification successful!' : 'Verification failed - CRC mismatch' });
        }
        return { success: true, crcMatch };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Jump to application (run firmware)
ipcMain.handle('bootloader-jump-to-app', async () => {
    try {
        await sendBootloaderCommand(JMP_TO_APP, Buffer.alloc(0), 1, 10);
        usbHidDevice = null;
        return { success: true };
    } catch (error) {
        if (error.message && (error.message.includes('Cannot write') || error.message.includes('not connected') || error.message.includes('HID write failed'))) {
            usbHidDevice = null;
            return { success: true };
        }
        return { success: false, error: error.message };
    }
});

// Load Intel HEX file and parse it for programming
ipcMain.handle('load-hex-file', async (event, filePath) => {
    try {
        const hexContent = fs.readFileSync(filePath, 'utf8');
        bootloaderHexRecords = parseHexFile(hexContent);
        calculateFlashCRCFromHexFile(hexContent);
        return { success: true, recordCount: bootloaderHexRecords.length };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Show open file dialog
ipcMain.handle('show-open-dialog', async (event, options) => {
    try {
        const callerWindow = BrowserWindow.fromWebContents(event.sender);
        return await dialog.showOpenDialog(callerWindow || mainWindow, options);
    } catch (error) {
        return { canceled: true, error: error.message };
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
// Admin panel — navigates within the main window (no separate BrowserWindow)
// =============================
ipcMain.handle('open-admin-window', async () => {
    try {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('navigate-to-admin');
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e && e.message ? e.message : 'Failed to open admin panel' };
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
