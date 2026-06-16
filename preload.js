// Preload script for Matrix Stirling Engine
// This script runs in a secure context and exposes safe APIs to the renderer

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Serial port communication
    getAvailablePorts: () => ipcRenderer.invoke('get-available-ports'),
    autoConnectStirling: () => ipcRenderer.invoke('auto-connect-stirling'),
    openAdminWindow: () => ipcRenderer.invoke('open-admin-window'),
    
    // Data handling - receives parsed data from worker thread
    onStirlingData: (callback) => {
        ipcRenderer.on('stirling-data', (event, data) => {
            callback(event, data);
        });
    },
    onRawData: (callback) => {
        ipcRenderer.on('raw-data', callback);
    },
    onConnectionStatus: (callback) => {
        ipcRenderer.on('connection-status', callback);
    },
    onSentCommand: (callback) => {
        ipcRenderer.on('sent-command', callback);
    },
    onNavigateToAdmin: (callback) => {
        ipcRenderer.on('navigate-to-admin', callback);
    },
    // Heater control
    setHeater: (value) => ipcRenderer.invoke('set-heater', value),
    setHeaterMode: (mode) => ipcRenderer.invoke('set-heater-mode', mode),
    setHardwareReady: (value) => ipcRenderer.invoke('set-hardware-ready', value),
    // Aux control (0-100%)
    setAux: (value) => ipcRenderer.invoke('set-aux', value),
    // Calibration - sends data with label M and value 1
    sendCalibration: () => ipcRenderer.invoke('send-calibration'),
    // Zero calibration - sends data with label Z and value 1
    sendZeroCalibration: () => ipcRenderer.invoke('send-zero-calibration'),
    // Calibration done - sends data with label N and value 1
    sendCalibrationDone: () => ipcRenderer.invoke('send-calibration-done'),
    // Bootloader trigger ':T1;' — sent to the connected Stirling Engine to reboot into bootloader mode
    sendBootloader: (value) => ipcRenderer.invoke('send-bootloader', value),
    // Check if bootloader USB HID device is present without connecting
    checkBootloaderDevice: (vid, pid) => ipcRenderer.invoke('check-bootloader-device', vid, pid),
    // Connect to the bootloader device (re-enumerated as USB HID VID:12BF PID:00A1) — user-initiated
    connectToBootloaderUSB: (vid, pid) => ipcRenderer.invoke('connect-to-bootloader-usb', vid, pid),
    // Disconnect from bootloader
    disconnectFromPort: () => ipcRenderer.invoke('disconnect-from-port'),
    // Bootloader operations
    bootloaderReadInfo: () => ipcRenderer.invoke('bootloader-read-info'),
    bootloaderEraseFlash: () => ipcRenderer.invoke('bootloader-erase-flash'),
    bootloaderProgramFlash: () => ipcRenderer.invoke('bootloader-program-flash'),
    bootloaderReadCRC: () => ipcRenderer.invoke('bootloader-read-crc'),
    bootloaderJumpToApp: () => ipcRenderer.invoke('bootloader-jump-to-app'),
    // Load Intel HEX file for flashing
    loadHexFile: (filePath) => ipcRenderer.invoke('load-hex-file', filePath),
    // Show file open dialog
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    // Bootloader progress updates
    onBootloaderProgress: (callback) => {
        ipcRenderer.on('bootloader-progress', (event, data) => callback(data));
    },
    getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),

    // CSV saving
    saveCsv: (filePath, rows) => ipcRenderer.invoke('save-csv', { filePath, rows }),
    chooseCsvPath: () => ipcRenderer.invoke('choose-csv-path'),
    
    // App version
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // Auto-updater
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (event, data) => callback(data));
    },

    // Remove listeners to prevent memory leaks
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
