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
    // Heater control
    setHeater: (value) => ipcRenderer.invoke('set-heater', value),
    // Aux control (0-100%)
    setAux: (value) => ipcRenderer.invoke('set-aux', value),
    getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),
    
    // Remove listeners to prevent memory leaks
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
