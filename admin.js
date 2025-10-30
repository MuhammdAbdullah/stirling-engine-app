// Admin Window Script
document.addEventListener('DOMContentLoaded', function() {
    // Get references to HTML elements
    const clearAllBtn = document.getElementById('clearAllBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const clearDebugBtn = document.getElementById('clearDebugBtn');
    
    // Status overview elements
    const adminSystemStatus = document.getElementById('adminSystemStatus');
    const adminPacketCount = document.getElementById('adminPacketCount');
    const adminDataRate = document.getElementById('adminDataRate');
    const adminLastUpdate = document.getElementById('adminLastUpdate');
    
    // Debug elements
    const rawDataDisplay = document.getElementById('rawDataDisplay');
    const parsedDataDisplay = document.getElementById('parsedDataDisplay');
    const processedDataDisplay = document.getElementById('processedDataDisplay');
    const connectionInfoDisplay = document.getElementById('connectionInfoDisplay');
    const statsDisplay = document.getElementById('statsDisplay');
    
    // Data storage
    let rawDataBuffer = [];
    let parsedDataBuffer = [];
    let processedDataBuffer = [];
    let connectionLog = [];
    let dataStats = {
        totalPackets: 0,
        totalBytes: 0,
        lastPacketTime: null,
        timestamps: [],
        previousPacketTime: null,
        averagePacketSize: 0,
        dataRate: 0
    };

    // Parser and RX buffer
    let stirlingParser = null;
    if (typeof StirlingDataParser !== 'undefined') {
        try { stirlingParser = new StirlingDataParser(); } catch (e) {}
    }
    let rxBuffer = new Uint8Array(0);
    
    // Initialize
    setupEventListeners();
    setupDebugTabs();
    setupIpcListeners();
    syncInitialStatus();
    
    // Set up event listeners
    function setupEventListeners() {
        clearAllBtn.addEventListener('click', clearAllData);
        exportDataBtn.addEventListener('click', exportData);
        refreshBtn.addEventListener('click', refreshData);
        clearDebugBtn.addEventListener('click', clearDebugData);
    }
    
    function setupDebugTabs() {
        const tabs = document.querySelectorAll('.debug-tab');
        const contents = document.querySelectorAll('.debug-tab-content');
        function tabIdFor(name) {
            if (name === 'raw') return 'rawDataTab';
            if (name === 'parsed') return 'parsedDataTab';
            if (name === 'processed') return 'processedDataTab';
            if (name === 'connection') return 'connectionTab';
            if (name === 'stats') return 'statsTab';
            return name + 'Tab';
        }
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const targetTab = tab.getAttribute('data-tab');
                const targetId = tabIdFor(targetTab);
                const targetEl = document.getElementById(targetId);
                if (targetEl) { targetEl.classList.add('active'); }

                // Refresh displays when switching back to a tab
                try { updateAllDisplays(); } catch (_) {}
            });
        });
    }

    function setupIpcListeners() {
        try {
            if (window.electronAPI && window.electronAPI.onRawData) {
                window.electronAPI.onRawData(function(event, data) {
                    try {
                        console.log('[ADMIN] raw-data event received');
                        var arr = Array.isArray(data) ? data : (data instanceof Uint8Array ? Array.from(data) : Array.from(new Uint8Array(data)));
                        addRawData(arr);
                        // Mark system online when data flows
                        updateSystemStatus({ connected: true });
                        // Append to buffer and try to parse complete frames
                        appendToBufferAndParse(arr);
                        updateDataStats(arr.length);
                    } catch (e) {
                        console.error('[ADMIN] raw-data handling error:', e);
                        // ignore
                    }
                });
            }
            if (window.electronAPI && window.electronAPI.onConnectionStatus) {
                window.electronAPI.onConnectionStatus(function(event, status) {
                    console.log('[ADMIN] connection-status:', status);
                    updateSystemStatus(status);
                    addConnectionInfo(status);
                });
            }
        } catch (e) {
            // ignore
        }
    }

    function syncInitialStatus() {
        try {
            if (window.electronAPI && window.electronAPI.getConnectionStatus) {
                window.electronAPI.getConnectionStatus().then(function(status){
                    updateSystemStatus(status);
                    addConnectionInfo(status);
                }).catch(function(){})
            }
        } catch (e) {}
    }

    function appendToBufferAndParse(byteArray) {
        // Concatenate existing buffer with new data
        var incoming = new Uint8Array(byteArray);
        var combined = new Uint8Array(rxBuffer.length + incoming.length);
        combined.set(rxBuffer, 0);
        combined.set(incoming, rxBuffer.length);
        rxBuffer = combined;

        // Look for 7-byte PV frames (AD AD ... DA DA) and 8-byte RT frames (CD CD ... DC DC)
        while (rxBuffer.length >= 7) {
            // find header for either PV or RT
            var start = -1;
            for (var i = 0; i <= rxBuffer.length - 2; i++) {
                var a = rxBuffer[i], b = rxBuffer[i + 1];
                if ((a === 0xAD && b === 0xAD) || (a === 0xCD && b === 0xCD)) { start = i; break; }
            }
            if (start < 0) {
                // keep last byte only
                rxBuffer = rxBuffer.slice(rxBuffer.length - 1);
                break;
            }
            // Attempt PV (7-byte)
            var handled = false;
            if (rxBuffer.length >= start + 7) {
                var pv = rxBuffer.slice(start, start + 7);
                if (pv[0] === 0xAD && pv[1] === 0xAD && pv[5] === 0xDA && pv[6] === 0xDA) {
                    try {
                        var parsedPV = (stirlingParser && typeof stirlingParser.parsePVPacket === 'function') ? stirlingParser.parsePVPacket(Array.from(pv)) : simpleParsePV(pv);
                        if (parsedPV) { addParsedData(parsedPV); addProcessedData(parsedPV); }
                    } catch (e) {}
                    rxBuffer = rxBuffer.slice(start + 7);
                    handled = true;
                }
            }
            if (handled) { continue; }
            // Attempt RT (8-byte)
            if (rxBuffer.length >= start + 8) {
                var rt = rxBuffer.slice(start, start + 8);
                if (rt[0] === 0xCD && rt[1] === 0xCD && rt[6] === 0xDC && rt[7] === 0xDC) {
                    try {
                        var parsedRT = (stirlingParser && typeof stirlingParser.parseRTPacket === 'function') ? stirlingParser.parseRTPacket(Array.from(rt)) : simpleParseRT(rt);
                        if (parsedRT) { addParsedData(parsedRT); addProcessedData(parsedRT); }
                    } catch (e) {}
                    rxBuffer = rxBuffer.slice(start + 8);
                    handled = true;
                }
            }
            if (handled) { continue; }
            // Not valid: skip one byte
            rxBuffer = rxBuffer.slice(start + 1);
        }
    }

    function simpleParsePV(frame) {
        // Minimal parser matching 7-byte PV layout
        var packet = Array.from(frame);
        var res = {
            header: [packet[0], packet[1]],
            pressureReadings: [],
            volumeReadings: [],
            rpm: 0,
            heaterTemperature: 0,
            footer: [packet[5], packet[6]],
            rawData: packet,
            timestamp: new Date()
        };
        // Pressure (2 bytes big-endian signed) at 2-3
        var raw = (packet[2] << 8) | packet[3];
        var pressure = raw >= 0x8000 ? raw - 0x10000 : raw;
        res.pressureReadings.push(pressure);
        // Volume index at 4
        var volumeIndex = packet[4];
        var volumeValue = (stirlingParser && typeof stirlingParser.getVolumeValue === 'function') ? stirlingParser.getVolumeValue(volumeIndex) : volumeIndex;
        res.volumeReadings.push(volumeValue);
        return res;
    }

    function simpleParseRT(frame) {
        // Minimal parser matching 8-byte RPM/Temp layout
        var packet = Array.from(frame);
        var res = {
            header: [packet[0], packet[1]],
            pressureReadings: [],
            volumeReadings: [],
            rpm: (packet[2] << 8) | packet[3],
            heaterTemperature: (packet[4] << 8) | packet[5],
            footer: [packet[6], packet[7]],
            rawData: packet,
            timestamp: new Date()
        };
        return res;
    }
    
    function clearAllData() {
        rawDataBuffer = [];
        parsedDataBuffer = [];
        processedDataBuffer = [];
        connectionLog = [];
        dataStats = {
            totalPackets: 0,
            totalBytes: 0,
            lastPacketTime: null,
            averagePacketSize: 0,
            dataRate: 0
        };
        
        updateAllDisplays();
        console.log('All admin data cleared');
    }
    
    function exportData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            rawData: rawDataBuffer,
            parsedData: parsedDataBuffer,
            processedData: processedDataBuffer,
            connectionLog: connectionLog,
            statistics: dataStats
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stirling-engine-data-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function refreshData() {
        updateAllDisplays();
        console.log('Admin data refreshed');
    }
    
    function clearDebugData() {
        rawDataDisplay.textContent = 'Debug data cleared...';
        parsedDataDisplay.textContent = 'Debug data cleared...';
        processedDataDisplay.textContent = 'Debug data cleared...';
        connectionInfoDisplay.textContent = 'Debug data cleared...';
        statsDisplay.textContent = 'Debug data cleared...';
    }
    
    function updateAllDisplays() {
        rawDataDisplay.textContent = rawDataBuffer.length > 0 ? rawDataBuffer.join('\n') : 'No raw data yet...';
        parsedDataDisplay.textContent = parsedDataBuffer.length > 0 ? parsedDataBuffer.join('\n\n') : 'No parsed data yet...';
        processedDataDisplay.textContent = processedDataBuffer.length > 0 ? processedDataBuffer.join('\n\n') : 'No processed data yet...';
        connectionInfoDisplay.textContent = connectionLog.length > 0 ? connectionLog.join('\n\n') : 'No connection info yet...';
        
        const statsText = `Total Packets: ${dataStats.totalPackets}
Total Bytes: ${dataStats.totalBytes}
Average Packet Size: ${dataStats.averagePacketSize.toFixed(2)} bytes
Data Rate: ${dataStats.dataRate.toFixed(2)} packets/sec
Last Packet: ${dataStats.lastPacketTime ? dataStats.lastPacketTime.toLocaleTimeString() : 'None'}`;
        statsDisplay.textContent = statsText;
    }
    
    // Functions to receive data from main window
    let pendingUIUpdate = false;
    let lastUIUpdateMs = 0;

    function scheduleUIUpdate() {
        const now = Date.now();
        if (now - lastUIUpdateMs > 100) {
            lastUIUpdateMs = now;
            updateAllDisplays();
            pendingUIUpdate = false;
        } else if (!pendingUIUpdate) {
            pendingUIUpdate = true;
            setTimeout(function(){
                lastUIUpdateMs = Date.now();
                updateAllDisplays();
                pendingUIUpdate = false;
            }, 100);
        }
    }

    function addRawData(data) {
        const timestamp = new Date().toLocaleTimeString();
        const hexString = Array.isArray(data) ? 
            data.map(b => b.toString(16).padStart(2, '0')).join(' ') :
            data.toString('hex');
        
        rawDataBuffer.push(`[${timestamp}] ${hexString}`);
        
        // Keep only last 100 entries
        if (rawDataBuffer.length > 100) {
            rawDataBuffer.shift();
        }
        scheduleUIUpdate();
    }
    
    function addParsedData(parsedData) {
        const timestamp = new Date().toLocaleTimeString();
        const dataString = stirlingParser ? stirlingParser.formatForDisplay(parsedData) : JSON.stringify(parsedData, null, 2);
        
        parsedDataBuffer.push(`[${timestamp}] ${dataString}`);
        
        // Keep only last 20 entries
        if (parsedDataBuffer.length > 20) {
            parsedDataBuffer.shift();
        }
        
        parsedDataDisplay.textContent = parsedDataBuffer.join('\n\n');
        parsedDataDisplay.scrollTop = parsedDataDisplay.scrollHeight;
    }
    
    function addProcessedData(parsedData) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Create detailed processed data breakdown
        let processedString = `[${timestamp}] PROCESSED DATA BREAKDOWN
========================================

📊 PACKET STRUCTURE:
  Header: 0x${parsedData.header[0].toString(16).padStart(2, '0')} 0x${parsedData.header[1].toString(16).padStart(2, '0')}
  Footer: 0x${parsedData.footer[0].toString(16).padStart(2, '0')} 0x${parsedData.footer[1].toString(16).padStart(2, '0')}
  Packet Size: ${parsedData.rawData ? parsedData.rawData.length : 0} bytes

🔧 PRESSURE READINGS (${parsedData.pressureReadings.length}):
`;
        
        parsedData.pressureReadings.forEach((pressure, index) => {
            processedString += `  Pressure ${index + 1}: ${pressure} (0x${pressure.toString(16).padStart(4, '0')})\n`;
        });
        
        processedString += `\n📏 VOLUME READINGS (${parsedData.volumeReadings.length}):
`;
        
        parsedData.volumeReadings.forEach((volume, index) => {
            processedString += `  Volume ${index + 1}: ${volume.toFixed(2)} (converted from index)\n`;
        });
        
        processedString += `\n📈 CALCULATED VALUES:
  Average Pressure: ${parsedData.pressureReadings.length > 0 ? (parsedData.pressureReadings.reduce((a, b) => a + b, 0) / parsedData.pressureReadings.length).toFixed(2) : 'N/A'}
  Average Volume: ${parsedData.volumeReadings.length > 0 ? (parsedData.volumeReadings.reduce((a, b) => a + b, 0) / parsedData.volumeReadings.length).toFixed(2) : 'N/A'}
  Max Pressure: ${parsedData.pressureReadings.length > 0 ? Math.max(...parsedData.pressureReadings) : 'N/A'}
  Min Pressure: ${parsedData.pressureReadings.length > 0 ? Math.min(...parsedData.pressureReadings) : 'N/A'}
  Max Volume: ${parsedData.volumeReadings.length > 0 ? Math.max(...parsedData.volumeReadings).toFixed(2) : 'N/A'}
  Min Volume: ${parsedData.volumeReadings.length > 0 ? Math.min(...parsedData.volumeReadings).toFixed(2) : 'N/A'}

🎯 DATA VALIDATION:
  Header Valid: ${parsedData.header[0] === 0xAD && parsedData.header[1] === 0xAD ? '✅ YES' : '❌ NO'}
  Footer Valid: ${parsedData.footer[0] === 0xDA && parsedData.footer[1] === 0xDA ? '✅ YES' : '❌ NO'}
  Pressure Count: ${parsedData.pressureReadings.length}
  Volume Count: ${parsedData.volumeReadings.length}

⏰ TIMESTAMP: ${parsedData.timestamp.toLocaleString()}  (sec: ${typeof parsedData.timeSeconds === 'number' ? parsedData.timeSeconds : 'n/a'}, ms: ${typeof parsedData.timeMilliseconds === 'number' ? parsedData.timeMilliseconds : 'n/a'})
========================================\n`;
        
        processedDataBuffer.push(processedString);
        
        // Keep only last 10 entries
        if (processedDataBuffer.length > 10) {
            processedDataBuffer.shift();
        }
        
        processedDataDisplay.textContent = processedDataBuffer.join('\n\n');
        processedDataDisplay.scrollTop = processedDataDisplay.scrollHeight;
    }
    
    function addConnectionInfo(info) {
        const timestamp = new Date().toLocaleTimeString();
        const infoString = `[${timestamp}] ${JSON.stringify(info, null, 2)}`;
        
        connectionLog.push(infoString);
        
        // Keep only last 30 entries
        if (connectionLog.length > 30) {
            connectionLog.shift();
        }
        
        connectionInfoDisplay.textContent = connectionLog.join('\n\n');
        connectionInfoDisplay.scrollTop = connectionInfoDisplay.scrollHeight;
    }
    
    function updateDataStats(packetSize) {
        dataStats.totalPackets++;
        dataStats.totalBytes += packetSize;
        var now = Date.now();
        dataStats.lastPacketTime = new Date(now);
        dataStats.averagePacketSize = dataStats.totalBytes / dataStats.totalPackets;

        // Rolling 1-second window for data rate
        dataStats.timestamps.push(now);
        while (dataStats.timestamps.length && now - dataStats.timestamps[0] > 1000) {
            dataStats.timestamps.shift();
        }
        const windowMs = dataStats.timestamps.length > 1 ? (dataStats.timestamps[dataStats.timestamps.length - 1] - dataStats.timestamps[0]) : 1;
        dataStats.dataRate = (dataStats.timestamps.length * 1000) / windowMs;

        // Update status overview
        adminPacketCount.textContent = dataStats.totalPackets;
        adminDataRate.textContent = `${dataStats.dataRate ? dataStats.dataRate.toFixed(1) : '0.0'} pps`;
        adminLastUpdate.textContent = dataStats.lastPacketTime ? dataStats.lastPacketTime.toLocaleTimeString() : 'Never';
        scheduleUIUpdate();
    }
    
    function updateSystemStatus(status) {
        if (status.connected) {
            adminSystemStatus.textContent = 'ONLINE';
            adminSystemStatus.style.color = '#28a745';
        } else if (status.error) {
            adminSystemStatus.textContent = 'ERROR';
            adminSystemStatus.style.color = '#dc3545';
        } else {
            adminSystemStatus.textContent = 'CONNECTING';
            adminSystemStatus.style.color = '#ffc107';
        }
    }
    
    // Expose functions to parent window
    window.adminAPI = {
        addRawData,
        addParsedData,
        addProcessedData,
        addConnectionInfo,
        updateDataStats,
        updateSystemStatus
    };
});

