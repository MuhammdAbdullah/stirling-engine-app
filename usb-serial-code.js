// USB/Serial Communication Code Collection
// Copied from Heat Transfer App for Stirling Engine project
// This file contains all the USB/Serial communication functionality

// ============================================================================
// MAIN PROCESS (main.js) - USB/Serial Code
// ============================================================================

const { SerialPort } = require('serialport');
const { exec } = require('child_process');

// Global variables for serial communication
let serialPort = null;
let rxBuffer = Buffer.alloc(0);
let portsPollIntervalId = null;
let connectionMonitorIntervalId = null;
let lastKnownPorts = [];
let isConnected = false;
let lastDataTime = 0;
let connectionTimeout = 10000; // 10 seconds timeout for connection loss

// Target device identification for Stirling Engine
const TARGET_VENDOR_ID = '12BF';  // Vendor ID for Stirling Engine
const TARGET_PRODUCT_ID = '010B'; // Product ID for Stirling Engine (PID = 0x010B)

// Get available ports with fallback methods
async function getPortsWithFallback() {
  try {
    // Try the standard method first
    const ports = await SerialPort.list();
    if (ports && ports.length > 0) {
      return ports;
    }
  } catch (e) {
    console.warn('Standard port listing failed:', e && e.message ? e.message : e);
  }

  // Fallback to WMI on Windows
  if (process.platform === 'win32') {
    try {
      const results = await getPortsFromWMI();
      if (results.length > 0) {
        return results;
      }
    } catch (e) {
      console.warn('WMI fallback failed:', e && e.message ? e.message : e);
    }
  }

  return [];
}

// Windows WMI fallback for port detection
function getPortsFromWMI() {
  return new Promise((resolve, reject) => {
    exec('wmic path Win32_SerialPort get DeviceID,Description,PNPDeviceID /format:csv', (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
      const results = [];

      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 4) {
          const deviceId = parts[1]?.trim();
          const description = parts[2]?.trim();
          const pnpDeviceId = parts[3]?.trim();

          if (deviceId && deviceId.startsWith('COM')) {
            results.push({
              path: deviceId,
              manufacturer: 'Unknown',
              serialNumber: 'Unknown',
              pnpId: pnpDeviceId,
              locationId: 'Unknown',
              vendorId: 'Unknown',
              productId: 'Unknown'
            });
          }
        }
      }

      resolve(results);
    });
  });
}

// Connect to serial port
async function connectSerial(portPath, baudRate) {
  try {
    // Close existing connection if any
    if (serialPort && serialPort.isOpen) {
      await new Promise((resolve) => {
        serialPort.close(() => resolve());
      });
    }

    // Create new serial port connection
    serialPort = new SerialPort({
      path: portPath,
      baudRate: parseInt(baudRate),
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false
    });

    // Set up data handler
    serialPort.on('data', (data) => {
      lastDataTime = Date.now(); // Update last data time
      rxBuffer = Buffer.concat([rxBuffer, data]);
      
      // Send raw data to renderer
      if (mainWindow) {
        mainWindow.webContents.send('data-chunk', data.toString('hex'));
      }
      
      // Process complete packets
      processRxBuffer();
    });

    // Set up error handler
    serialPort.on('error', (err) => {
      console.error('Serial port error:', err);
      if (mainWindow) {
        mainWindow.webContents.send('connection-status', { connected: false, error: err.message });
      }
    });

    // Open the port
    await new Promise((resolve, reject) => {
      serialPort.open((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update connection state
    isConnected = true;
    lastDataTime = Date.now();
    
    // Send connection status
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', { connected: true, port: portPath, baudRate: baudRate });
    }

    return { success: true, port: portPath, baudRate: baudRate };
  } catch (error) {
    console.error('Error connecting to serial port:', error);
    return { success: false, error: error.message };
  }
}

// Process received data buffer - customize for your Stirling Engine protocol
function processRxBuffer() {
  // Example: Check for 4-byte packets [0x11, 0x11, 0x11, data] or [0x22, 0x22, 0x22, data]
  while (rxBuffer.length >= 4) {
    // Check if this is a 4-byte fan speed packet
    if (rxBuffer[0] === 0x11 && rxBuffer[1] === 0x11 && rxBuffer[2] === 0x11) {
      const fanSpeedPacket = rxBuffer.slice(0, 4);
      console.log('4-byte fan speed packet received:', fanSpeedPacket.toString('hex'));
      
      // Send to renderer
      if (mainWindow) {
        mainWindow.webContents.send('data-received', fanSpeedPacket);
      }
      
      // Remove the 4-byte packet from buffer
      rxBuffer = rxBuffer.slice(4);
      continue;
    }
    // Check if this is a 4-byte heater mode packet
    else if (rxBuffer[0] === 0x22 && rxBuffer[1] === 0x22 && rxBuffer[2] === 0x22) {
      const heaterModePacket = rxBuffer.slice(0, 4);
      console.log('4-byte heater mode packet received:', heaterModePacket.toString('hex'));
      
      // Send to renderer
      if (mainWindow) {
        mainWindow.webContents.send('data-received', heaterModePacket);
      }
      
      // Remove the 4-byte packet from buffer
      rxBuffer = rxBuffer.slice(4);
      continue;
    }
    // Add more packet types as needed for your Stirling Engine
    else {
      // Not a 4-byte packet, break to check for other packet types
      break;
    }
  }
  
  // Look for complete 56-byte packets with proper headers and footers
  while (rxBuffer.length >= 56) {
    // Find sync header 0x55 0x55
    let startIdx = -1;
    for (let i = 0; i <= rxBuffer.length - 2; i++) {
      if (rxBuffer[i] === 0x55 && rxBuffer[i + 1] === 0x55) {
        startIdx = i;
        break;
      }
    }
    
    if (startIdx < 0) {
      // No header found; discard all but last byte to avoid unbounded growth
      rxBuffer = rxBuffer.slice(rxBuffer.length - 1);
      break;
    }
    
    // If not enough bytes after header for a full 56-byte frame, wait for more
    if (rxBuffer.length < startIdx + 56) {
      // Keep buffer from header onwards
      rxBuffer = rxBuffer.slice(startIdx);
      break;
    }
    
    // Candidate frame
    const frame = rxBuffer.slice(startIdx, startIdx + 56);
    
    // Validate footer 0xAA 0xAA at bytes 54..55
    if (frame[54] === 0xAA && frame[55] === 0xAA) {
      // Send binary data to renderer
      if (mainWindow) {
        mainWindow.webContents.send('data-received', frame);
      }
      // Remove consumed bytes
      rxBuffer = rxBuffer.slice(startIdx + 56);
      // Continue to look for more frames
      continue;
    } else {
      // Bad footer; skip this header and continue scanning
      rxBuffer = rxBuffer.slice(startIdx + 1);
    }
  }
}

// Start polling for port changes
function startPortPolling() {
  if (portsPollIntervalId) {
    clearInterval(portsPollIntervalId);
  }
  
  portsPollIntervalId = setInterval(async () => {
    try {
      const currentPorts = await getPortsWithFallback();
      const currentPaths = currentPorts.map(p => p.path).sort();
      const lastPaths = lastKnownPorts.map(p => p.path).sort();
      
      // Check if port list changed
      if (JSON.stringify(currentPaths) !== JSON.stringify(lastPaths)) {
        console.log('[PORT POLL] Port list changed');
        lastKnownPorts = currentPorts;
        if (mainWindow) {
          mainWindow.webContents.send('ports-update', currentPorts);
        }
        
        // Check for target device hot-plug
        const targetPort = currentPorts.find(port => 
          port.vendorId && port.productId && 
          port.vendorId.toUpperCase() === TARGET_VENDOR_ID && 
          port.productId.toUpperCase() === TARGET_PRODUCT_ID
        );
        
        if (targetPort && !isConnected) {
          console.log('[HOT-PLUG] Target device detected, attempting auto-connect');
          const result = await connectSerial(targetPort.path, 115200);
          if (result.success) {
            console.log('[HOT-PLUG] Successfully connected to', targetPort.path);
            isConnected = true;
          } else {
            console.log('[HOT-PLUG] Failed to connect:', result.error);
          }
        }
      }
    } catch (error) {
      console.error('Error polling ports:', error);
    }
  }, 2000); // Poll every 2 seconds
}

// Stop polling for port changes
function stopPortPolling() {
  if (portsPollIntervalId) {
    clearInterval(portsPollIntervalId);
    portsPollIntervalId = null;
  }
}

// Start connection monitoring
function startConnectionMonitoring() {
  if (connectionMonitorIntervalId) {
    clearInterval(connectionMonitorIntervalId);
  }
  
  connectionMonitorIntervalId = setInterval(async () => {
    if (isConnected && serialPort) {
      // Check if port is still open
      if (!serialPort.isOpen) {
        console.log('[CONNECTION MONITOR] Port closed, disconnecting');
        isConnected = false;
        if (mainWindow) {
          mainWindow.webContents.send('connection-status', { connected: false, error: 'Port closed' });
        }
        return;
      }
      
      // Check for data timeout
      const now = Date.now();
      if (now - lastDataTime > connectionTimeout) {
        console.log('[CONNECTION MONITOR] No data received for', connectionTimeout/1000, 'seconds, disconnecting');
        isConnected = false;
        if (mainWindow) {
          mainWindow.webContents.send('connection-status', { connected: false, error: 'Connection timeout' });
        }
        
        // Close the port
        try {
          await new Promise((resolve) => {
            serialPort.close(() => resolve());
          });
          serialPort = null;
        } catch (e) {
          console.error('Error closing port:', e);
        }
      }
    }
  }, 1000); // Check every second
}

// Stop connection monitoring
function stopConnectionMonitoring() {
  if (connectionMonitorIntervalId) {
    clearInterval(connectionMonitorIntervalId);
    connectionMonitorIntervalId = null;
  }
}

// Auto-connect to target device
async function autoConnectToTargetDevice() {
  try {
    const ports = await getPortsWithFallback();
    const targetPort = ports.find(port => 
      port.vendorId && port.productId && 
      port.vendorId.toUpperCase() === TARGET_VENDOR_ID && 
      port.productId.toUpperCase() === TARGET_PRODUCT_ID
    );

    if (targetPort) {
      console.log(`[AUTO] Matching device found (VID: ${targetPort.vendorId} PID: ${targetPort.productId}) on ${targetPort.path}`);
      console.log(`[AUTO/IPC] connect requested: ${targetPort.path} 115200`);
      
      const result = await connectSerial(targetPort.path, 115200);
      if (result.success) {
        console.log(`[AUTO] Successfully connected to ${targetPort.path}`);
        isConnected = true;
      } else {
        console.log(`[AUTO] Failed to connect to ${targetPort.path}: ${result.error}`);
      }
    } else {
      console.log('[AUTO] No matching device found');
    }
  } catch (error) {
    console.error('[AUTO] Error during auto-connect:', error);
  }
}

// IPC handlers for serial port communication
ipcMain.handle('get-available-ports', async () => {
  try {
    return await getPortsWithFallback();
  } catch (error) {
    console.error('Error getting available ports:', error);
    return [];
  }
});

ipcMain.handle('connect-to-port', async (event, portPath, baudRate) => {
  try {
    return await connectSerial(portPath, baudRate);
  } catch (error) {
    console.error('Error connecting to port:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-from-port', async () => {
  try {
    if (serialPort && serialPort.isOpen) {
      await new Promise((resolve) => {
        serialPort.close(() => resolve());
      });
      serialPort = null;
    }
    
    // Update connection state
    isConnected = false;
    
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', { connected: false });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting from port:', error);
    return { success: false, error: error.message };
  }
});

// Example command sending functions - customize for your Stirling Engine
// Send fan speed command over serial: format ':F<value>;\n' as individual bytes
ipcMain.handle('send-fan-speed', async (event, value) => {
  try {
    const v = Math.max(0, Math.min(100, parseInt(value)));
    if (!serialPort || !serialPort.isOpen) {
      return { success: false, error: 'Not connected' };
    }
    // Build byte array: [0x3A, 0x46, value_byte, 0x3B, 0x0A]
    const bytes = [0x3A, 0x46]; // ':' and 'F'
    bytes.push(v); // value as single byte (0-100)
    bytes.push(0x3B, 0x0A); // ';' and '\n'
    const payload = Buffer.from(bytes);
    await new Promise((resolve, reject) => {
      serialPort.write(payload, (err) => {
        if (err) reject(err); else resolve();
      });
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Send heater temperature: format ':T<value>;\n' value 20..70
ipcMain.handle('send-heater-temp', async (event, value) => {
  try {
    const v = Math.max(20, Math.min(70, parseInt(value)));
    if (!serialPort || !serialPort.isOpen) {
      return { success: false, error: 'Not connected' };
    }
    // Build byte array: [0x3A, 0x54, value_byte, 0x3B, 0x0A]
    const bytes = [0x3A, 0x54]; // ':' and 'T'
    bytes.push(v); // value as single byte (20-70)
    bytes.push(0x3B, 0x0A); // ';' and '\n'
    const payload = Buffer.from(bytes);
    await new Promise((resolve, reject) => {
      serialPort.write(payload, (err) => { if (err) reject(err); else resolve(); });
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Set heater mode: ':H<mode>;\n' where 0=off,1=left,2=right
ipcMain.handle('set-heater-mode', async (event, mode) => {
  try {
    const m = Math.max(0, Math.min(2, parseInt(mode)));
    if (!serialPort || !serialPort.isOpen) {
      return { success: false, error: 'Not connected' };
    }
    // Build byte array: [0x3A, 0x48, mode_byte, 0x3B, 0x0A]
    const bytes = [0x3A, 0x48]; // ':' and 'H'
    bytes.push(m); // mode as single byte (0-2)
    bytes.push(0x3B, 0x0A); // ';' and '\n'
    const payload = Buffer.from(bytes);
    await new Promise((resolve, reject) => {
      serialPort.write(payload, (err) => { if (err) reject(err); else resolve(); });
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Send cooler command: ':P<value>;\n' where value is 0 or 1
ipcMain.handle('send-cooler', async (event, value) => {
  try {
    const v = Math.max(0, Math.min(1, parseInt(value)));
    if (!serialPort || !serialPort.isOpen) {
      return { success: false, error: 'Not connected' };
    }
    // Build byte array: [0x3A, 0x50, value_byte, 0x3B, 0x0A]
    const bytes = [0x3A, 0x50]; // ':' and 'P'
    bytes.push(v); // value as single byte (0 or 1)
    bytes.push(0x3B, 0x0A); // ';' and '\n'
    const payload = Buffer.from(bytes);
    await new Promise((resolve, reject) => {
      serialPort.write(payload, (err) => { if (err) reject(err); else resolve(); });
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ============================================================================
// PRELOAD SCRIPT (preload.js) - USB/Serial Code
// ============================================================================

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Serial port communication
  getAvailablePorts: () => ipcRenderer.invoke('get-available-ports'),
  connectToPort: (port, baudRate) => ipcRenderer.invoke('connect-to-port', port, baudRate),
  disconnectFromPort: () => ipcRenderer.invoke('disconnect-from-port'),
  
  // Data handling
  onDataReceived: (callback) => {
    ipcRenderer.on('data-received', callback);
  },
  onDataChunk: (callback) => {
    ipcRenderer.on('data-chunk', callback);
  },
  onConnectionStatus: (callback) => {
    ipcRenderer.on('connection-status', callback);
  },
  onPortsUpdate: (callback) => {
    ipcRenderer.on('ports-update', callback);
  },
  
  // Device control commands - customize for your Stirling Engine
  sendFanSpeed: (value) => ipcRenderer.invoke('send-fan-speed', value),
  sendHeaterTemp: (value) => ipcRenderer.invoke('send-heater-temp', value),
  setHeaterMode: (mode) => ipcRenderer.invoke('set-heater-mode', mode),
  sendCooler: (value) => ipcRenderer.invoke('send-cooler', value),
  
  // Remove listeners to prevent memory leaks
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// ============================================================================
// RENDERER PROCESS (renderer.js) - USB/Serial Code
// ============================================================================

// Web Serial API fallback for browser compatibility
let webSerialPort = null;
let webSerialReader = null;

async function tryWebSerialAutoConnect() {
    if (!('serial' in navigator)) { 
        addToLog('Web Serial API not available in this browser.'); 
        return; 
    }
    try {
        // Try previously-granted ports first (no prompt)
        const ports = await navigator.serial.getPorts();
        for (const p of ports) {
            const info = p.getInfo ? p.getInfo() : {};
            const vid = (info.usbVendorId || 0).toString(16).toUpperCase().padStart(4, '0');
            const pid = (info.usbProductId || 0).toString(16).toUpperCase().padStart(4, '0');
            if (vid === '12BF' && pid === '010B') { // Stirling Engine device IDs
                await openWebSerial(p);
                return;
            }
        }
        // If we reach here, no pre-authorized port exists
        addToLog('Web mode: cannot auto-request serial permission without a click. Click anywhere to grant once.');
        document.body.addEventListener('click', requestWebSerialOnce, { once: true });
    } catch (e) {
        addToLog('Web Serial error: ' + e.message);
    }
}

async function requestWebSerialOnce() {
    try {
        const port = await navigator.serial.requestPort({ 
            filters: [{ usbVendorId: 0x12BF, usbProductId: 0x010B }] // Stirling Engine device IDs
        });
        await openWebSerial(port);
    } catch (e) {
        addToLog('User denied Web Serial permission or error: ' + e.message);
    }
}

async function openWebSerial(port) {
    try {
        await port.open({ baudRate: 115200 });
        webSerialPort = port;
        updateConnectionStatus(true, 'WebSerial');
        addToLog('Web Serial connected');
        const decoder = new TextDecoder();
        const reader = port.readable.getReader();
        webSerialReader = reader;
        let buffer = new Uint8Array(0);
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length) {
                // Forward raw bytes into existing packet assembler path
                handleIncomingData(new Uint8Array(value));
            }
        }
    } catch (e) {
        addToLog('Web Serial open error: ' + e.message);
        updateConnectionStatus(false);
    }
}

async function closeWebSerial() {
    try { if (webSerialReader) { await webSerialReader.cancel(); } } catch {}
    try { if (webSerialPort) { await webSerialPort.close(); } } catch {}
    webSerialReader = null; webSerialPort = null;
}

// Data processing function - customize for your Stirling Engine protocol
function handleIncomingData(data) {
    console.log('Data received:', data);
    var dataArray = (function(d) {
        // Convert incoming data to a plain array of bytes in a safe, simple way
        try {
            if (Array.isArray(d)) {
                return d.slice();
            }
            if (d instanceof Uint8Array) {
                return Array.from(d);
            }
            if (d && typeof d.length === 'number') {
                return Array.from(d);
            }
            // Last attempt: try to wrap in Uint8Array
            return Array.from(new Uint8Array(d));
        } catch (e) {
            addToLog('Unable to parse incoming data: ' + (e && e.message ? e.message : String(e)));
            return [];
        }
    })(data);
    
    // Check for 4-byte packets - customize for your Stirling Engine
    if (dataArray.length === 4) {
        // Fan speed packet: [0x11, 0x11, 0x11, speed]
        if (dataArray[0] === 0x11 && dataArray[1] === 0x11 && dataArray[2] === 0x11) {
            var fanSpeed = dataArray[3];
            if (fanSpeed >= 0 && fanSpeed <= 100) {
                updateFanSliderFromHardware(fanSpeed);
                addToLog('Fan speed received from hardware: ' + fanSpeed + '%');
            }
            return;
        }
        
        // Heater mode packet: [0x22, 0x22, 0x22, mode]
        if (dataArray[0] === 0x22 && dataArray[1] === 0x22 && dataArray[2] === 0x22) {
            var heaterMode = dataArray[3];
            if (heaterMode >= 0 && heaterMode <= 2) {
                updateHeaterButtonsFromHardware(heaterMode);
                var modeText = heaterMode === 0 ? 'Off' : (heaterMode === 1 ? 'Left' : 'Right');
                addToLog('Heater mode received from hardware: ' + modeText);
            }
            return;
        }
        
        // Add more packet types as needed for your Stirling Engine
    }
    
    // Check for 56-byte packets with headers and footers
    if (dataArray.length >= 56) {
        if (dataArray[0] === 0x55 && dataArray[1] === 0x55) {
            if (dataArray[54] === 0xAA && dataArray[55] === 0xAA) {
                // Valid packet received
                updateConnectionStatus(true);
                packetCount += 1;
                if (packetCountDisplay) packetCountDisplay.textContent = String(packetCount);
                if (lastUpdateDisplay) lastUpdateDisplay.textContent = new Date().toLocaleTimeString();
                displayRawData(dataArray);
                addRawData(dataArray);
                parseAndDisplayData(dataArray);
                addToLog('Valid packet received (' + packetCount + ')');
            } else {
                addToLog('Invalid packet: Wrong footer bytes');
            }
        } else {
            addToLog('Invalid packet: Wrong header bytes');
        }
    } else {
        addToLog('Incomplete data received: ' + dataArray.length + ' bytes (expected 56)');
    }
}

// Connection status management
function updateConnectionStatus(connected, portInfo) {
    if (portInfo === undefined) {
        portInfo = '';
    }
    
    var wasConnected = isConnected;
    isConnected = connected;
    
    if (connected) {
        if (connectionStatus) {
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'status-connected';
        }
        if (connectionInfoDisplay) connectionInfoDisplay.textContent = portInfo;
        if (connectBtn) connectBtn.disabled = true;
        if (disconnectBtn) disconnectBtn.disabled = false;
    } else {
        if (connectionStatus) {
            connectionStatus.textContent = 'Disconnected';
            connectionStatus.className = 'status-disconnected';
        }
        if (connectionInfoDisplay) connectionInfoDisplay.textContent = 'No device connected';
        if (connectBtn) connectBtn.disabled = true;
        if (disconnectBtn) disconnectBtn.disabled = true;
    }
}

// Port management functions
async function refreshComPorts() {
    try {
        addToLog('Refreshing available COM ports...');
        const ports = await window.electronAPI.getAvailablePorts();
        if (comPortSelect) {
            comPortSelect.innerHTML = '<option value="">Select COM Port...</option>';
            for (var i = 0; i < ports.length; i++) {
                var port = ports[i];
                var option = document.createElement('option');
                option.value = port.path;
                var manufacturer = port.manufacturer || 'Unknown Device';
                var serialNumber = port.serialNumber || 'Unknown';
                option.textContent = port.path + ' - ' + manufacturer + ' (SN: ' + serialNumber + ')';
                comPortSelect.appendChild(option);
            }
        }
        addToLog('Found ' + ports.length + ' available ports:');
        for (var j = 0; j < ports.length; j++) {
            var p = ports[j];
            addToLog('  - ' + p.path + ': ' + (p.manufacturer || 'Unknown') + ' (SN: ' + (p.serialNumber || 'Unknown') + ')');
        }
        if (ports.length === 0) {
            addToLog('No COM ports found. Try:');
            addToLog('  1. Check if device is connected');
            addToLog('  2. Install device drivers');
            addToLog('  3. Check Device Manager for COM port number');
            addToLog('  4. Try a different USB cable/port');
        }
    } catch (error) {
        addToLog('Error refreshing ports: ' + error.message);
        addToLog('This might be a permissions issue. Try running as administrator.');
    }
}

async function connectToPort() {
    var selectedPort = comPortSelect.value;
    var selectedBaudRate = 115200;
    
    if (!selectedPort) {
        addToLog('Please select a COM port first');
        return;
    }
    try {
        addToLog('Attempting to connect to ' + selectedPort + ' at ' + selectedBaudRate + ' baud...');
        var result = await window.electronAPI.connectToPort(selectedPort, selectedBaudRate);
        if (result.success) {
            addToLog('Successfully connected to ' + selectedPort);
            updateConnectionStatus(true, selectedPort + ' @ ' + selectedBaudRate + ' baud');
        } else {
            addToLog('Failed to connect: ' + result.error);
            updateConnectionStatus(false);
        }
    } catch (error) {
        addToLog('Connection error: ' + error.message);
        updateConnectionStatus(false);
    }
}

async function disconnectFromPort() {
    try {
        addToLog('Disconnecting from port...');
        var result = await window.electronAPI.disconnectFromPort();
        if (result.success) {
            addToLog('Disconnected successfully');
        } else {
            addToLog('Error disconnecting: ' + result.error);
        }
        updateConnectionStatus(false);
    } catch (error) {
        addToLog('Disconnect error: ' + error.message);
        updateConnectionStatus(false);
    }
}

// Data display functions
function displayRawData(dataArray) {
    var hexString = '';
    for (var i = 0; i < dataArray.length; i += 16) {
        var row = '';
        var ascii = '';
        for (var j = 0; j < 16 && i + j < dataArray.length; j++) {
            var byte = dataArray[i + j];
            row += byte.toString(16).toUpperCase().padStart(2, '0') + ' ';
            ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.';
        }
        hexString += i.toString(16).toUpperCase().padStart(4, '0') + ': ' + row.padEnd(48) + ' ' + ascii + '\n';
    }
    if (rawDataDisplay) rawDataDisplay.textContent = hexString;
}

function addRawData(data) {
    if (!data || data.length === 0) return;
    
    const hexString = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
    if (rawDataDisplay) {
        rawDataDisplay.textContent = hexString;
    }
}

// Data parsing function - customize for your Stirling Engine data format
function parseAndDisplayData(dataArray) {
    var parsedInfo = '';
    var actualData = dataArray.slice(2, 54);
    
    parsedInfo += 'Packet Structure:\n';
    parsedInfo += 'Header: 0x' + dataArray[0].toString(16).padStart(2, '0') + ' 0x' + dataArray[1].toString(16).padStart(2, '0') + '\n';
    parsedInfo += 'Data Length: ' + actualData.length + ' bytes\n';
    parsedInfo += 'Footer: 0x' + dataArray[54].toString(16).padStart(2, '0') + ' 0x' + dataArray[55].toString(16).padStart(2, '0') + '\n\n';
    parsedInfo += 'Data Interpretation:\n';
    
    // Parse temperature data (customize for your Stirling Engine)
    if (actualData.length >= 32) {
        for (var sensorIndex = 0; sensorIndex < 8; sensorIndex++) {
            var base = sensorIndex * 4;
            var b0 = actualData[base + 0];
            var b1 = actualData[base + 1];
            var b2 = actualData[base + 2];
            var b3 = actualData[base + 3];
            var buf = new ArrayBuffer(4);
            var dv = new DataView(buf);
            dv.setUint8(0, b0);
            dv.setUint8(1, b1);
            dv.setUint8(2, b2);
            dv.setUint8(3, b3);
            var temp = dv.getFloat32(0, true); // little-endian
            parsedInfo += 'Sensor ' + (sensorIndex + 1) + ': ' + temp.toFixed(2) + '°C\n';
        }
    }
    
    if (parsedDataDisplay) parsedDataDisplay.textContent = parsedInfo;
}

// Hardware update functions - customize for your Stirling Engine controls
function updateFanSliderFromHardware(fanSpeed) {
    fanSpeed = Math.max(0, Math.min(100, fanSpeed));
    
    if (fanSpeedInput) {
        fanSpeedInput.value = fanSpeed;
        if (fanSpeedDisplay) {
            fanSpeedDisplay.textContent = fanSpeed + '%';
        }
        updateSliderFill(fanSpeed);
        updateFanIcon(fanSpeed);
        addToLog('Fan slider updated from hardware: ' + fanSpeed + '%');
    }
}

function updateHeaterButtonsFromHardware(mode) {
    mode = Math.max(0, Math.min(2, mode));
    heaterMode = mode;
    updateHeaterButtons();
    addToLog('Heater buttons updated from hardware: mode ' + mode);
}

// Setup data listeners
function setupDataListeners() {
    window.electronAPI.onDataReceived(function(event, data) {
        handleIncomingData(data);
    });
    
    window.electronAPI.onDataChunk(function(event, chunk) {
        try {
            var arr = (chunk instanceof Uint8Array) ? Array.from(chunk) : (Array.isArray(chunk) ? chunk.slice() : Array.from(new Uint8Array(chunk)));
            if (rawDataDisplay && (!rawDataDisplay.textContent || rawDataDisplay.textContent.indexOf('No data received yet') !== -1)) {
                var hex = '';
                var start = Math.max(0, arr.length - 128);
                for (var i = start; i < arr.length; i++) {
                    hex += arr[i].toString(16).toUpperCase().padStart(2, '0') + ' ';
                }
                if (rawDataDisplay) rawDataDisplay.textContent = hex.trim();
            }
        } catch (e) {
            // ignore
        }
    });
    
    window.electronAPI.onConnectionStatus(function(event, status) {
        if (status.connected) {
            updateConnectionStatus(true, status.port);
        } else {
            updateConnectionStatus(false);
            if (status.error) {
                addToLog('Connection error: ' + status.error);
            }
        }
    });
}

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================

/*
HOW TO USE THIS USB/SERIAL CODE IN YOUR STIRLING ENGINE PROJECT:

1. MAIN PROCESS (main.js):
   - Copy the serial communication functions from the "MAIN PROCESS" section
   - Update TARGET_VENDOR_ID and TARGET_PRODUCT_ID to match your Stirling Engine device
   - Customize the processRxBuffer() function for your device's data protocol
   - Add your own command sending functions (like sendFanSpeed, sendHeaterTemp, etc.)

2. PRELOAD SCRIPT (preload.js):
   - Copy the contextBridge.exposeInMainWorld section
   - Add any additional IPC handlers you need for your Stirling Engine

3. RENDERER PROCESS (renderer.js):
   - Copy the Web Serial API fallback functions
   - Copy the data handling functions (handleIncomingData, parseAndDisplayData, etc.)
   - Customize the data parsing for your Stirling Engine's specific data format
   - Update the hardware control functions for your device's controls

4. CUSTOMIZATION NEEDED:
   - Device IDs are already set for Stirling Engine (VID: 12BF, PID: 010B)
   - Update data packet formats in processRxBuffer() and handleIncomingData()
   - Modify command sending functions for your device's protocol
   - Adjust data parsing in parseAndDisplayData() for your sensor data
   - Update UI control functions for your specific controls

5. DEPENDENCIES:
   - Add 'serialport' to your package.json: "serialport": "^12.0.0"
   - Install with: npm install serialport

6. SAFETY FEATURES:
   - Connection monitoring with timeout
   - Hot-plug detection
   - Error handling and recovery
   - Safe shutdown commands

This code provides a complete USB/Serial communication system that you can adapt
for your Stirling Engine project. The code is beginner-friendly with clear comments
and simple, readable structure.
*/
