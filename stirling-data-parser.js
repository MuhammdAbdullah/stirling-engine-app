// Stirling Engine Data Parser
// Handles two packet types from USB COM port
// 1) 7-byte PV packet: [0xAD,0xAD] + pressure(2 bytes, big-endian signed) + volume(1 byte index) + [0xDA,0xDA]
// 2) 8-byte RT packet: [0xCD,0xCD] + rpm(2 bytes, big-endian) + temperature(2 bytes, big-endian) + [0xDC,0xDC]

class StirlingDataParser {
    constructor() {
        // Supported packet identifiers
        this.PV_PACKET_SIZE = 7;
        this.RT_PACKET_SIZE = 8;
        this.PV_HEADER = [0xAD, 0xAD];
        this.PV_FOOTER = [0xDA, 0xDA];
        this.RT_HEADER = [0xCD, 0xCD];
        this.RT_FOOTER = [0xDC, 0xDC];
        this.buffer = [];
        
        // Volume lookup table (0-50 index to actual volume values)
        this.volumeLookupTable = [
            46664.21589, 46662.28759, 46656.53311, 46647.04319, 46633.96749, 46617.51223, 46597.93692, 46575.55027, 46550.70534, 46523.79393, 46495.24047, 46465.49525, 46435.02737, 46404.31734, 46373.84947, 46344.10425, 46315.55078, 46288.63938, 46263.79444, 46241.40779, 46221.83248, 46205.37722, 46192.30153, 46182.81161, 46177.05712, 46175.12882, 46177.05712, 46182.81161, 46192.30153, 46205.37722, 46221.83248, 46241.40779, 46263.79444, 46288.63938, 46315.55078, 46344.10425, 46373.84947, 46404.31734, 46435.02737, 46465.49525, 46495.24047, 46523.79393, 46550.70534, 46575.55027, 46597.93692, 46617.51223, 46633.96749, 46647.04319, 46656.53311, 46662.28759, 46664.21589
        ];
    }

    // Convert volume index (0-50) to actual volume value using lookup table
    getVolumeValue(volumeIndex) {
        if (volumeIndex >= 0 && volumeIndex < this.volumeLookupTable.length) {
            return this.volumeLookupTable[volumeIndex];
        } else {
            console.warn(`Volume index ${volumeIndex} is out of range (0-${this.volumeLookupTable.length - 1})`);
            return 0; // Return 0 for invalid indices
        }
    }

    // Get volume index from actual volume value (reverse lookup)
    getVolumeIndex(volumeValue) {
        const index = this.volumeLookupTable.findIndex(value => Math.abs(value - volumeValue) < 0.0001);
        return index >= 0 ? index : -1; // Return -1 if not found
    }

    // Add incoming data to buffer and process complete packets
    processData(data) {
        // Convert data to array of bytes
        const dataArray = Array.isArray(data) ? data : Array.from(data);
        
        // Add to buffer
        this.buffer = this.buffer.concat(dataArray);
        
        const results = [];
        
        // Process complete packets (both types)
        while (this.buffer.length >= this.PV_PACKET_SIZE) {
            // Find the first occurrence of any supported header
            let i = 0;
            let headerType = null; // 'PV' or 'RT'
            let start = -1;
            for (; i <= this.buffer.length - 2; i++) {
                const a = this.buffer[i];
                const b = this.buffer[i + 1];
                if (a === this.PV_HEADER[0] && b === this.PV_HEADER[1]) { headerType = 'PV'; start = i; break; }
                if (a === this.RT_HEADER[0] && b === this.RT_HEADER[1]) { headerType = 'RT'; start = i; break; }
            }
            if (start === -1) {
                // No header found; keep only the last byte to avoid unbounded growth
                this.buffer = this.buffer.slice(-1);
                break;
            }

            // Not enough bytes yet for the detected packet
            const needed = headerType === 'PV' ? this.PV_PACKET_SIZE : this.RT_PACKET_SIZE;
            if (this.buffer.length < start + needed) {
                this.buffer = this.buffer.slice(start);
                break;
            }

            // Candidate packet slice
            const packet = this.buffer.slice(start, start + needed);
            if (headerType === 'PV') {
                if (packet[5] === this.PV_FOOTER[0] && packet[6] === this.PV_FOOTER[1]) {
                    results.push(this.parsePVPacket(packet));
                    this.buffer = this.buffer.slice(start + needed);
                    continue;
                } else {
                    // Bad footer; skip this header
                    this.buffer = this.buffer.slice(start + 1);
                    continue;
                }
            } else if (headerType === 'RT') {
                if (packet[6] === this.RT_FOOTER[0] && packet[7] === this.RT_FOOTER[1]) {
                    results.push(this.parseRTPacket(packet));
                    this.buffer = this.buffer.slice(start + needed);
                    continue;
                } else {
                    this.buffer = this.buffer.slice(start + 1);
                    continue;
                }
            }
        }
        
        return results;
    }

    // Parse a complete 7-byte PV packet
    parsePVPacket(packet) {
        const result = {
            header: [packet[0], packet[1]], // 0xAD, 0xAD
            pressureReadings: [],
            volumeReadings: [],
            rpm: 0,
            heaterTemperature: 0,
            footer: [packet[5], packet[6]], // 0xDA, 0xDA
            rawData: packet,
            timestamp: new Date()
        };

        // Pressure (bytes 2-3), big-endian signed
        const rawPressure = (packet[2] << 8) | packet[3];
        const pressure = rawPressure >= 0x8000 ? rawPressure - 0x10000 : rawPressure;
        result.pressureReadings.push(pressure);

        // Volume (byte 4) as index → convert to value if table available
        const volumeIndex = packet[4];
        const volumeValue = this.getVolumeValue(volumeIndex);
        result.volumeReadings.push(volumeValue);

        // Add timestamp helpers (seconds and milliseconds)
        result.timeSeconds = Math.floor(result.timestamp.getTime() / 1000);
        result.timeMilliseconds = result.timestamp.getMilliseconds();

        return result;
    }

    // Parse a complete 8-byte RPM/Temperature packet
    parseRTPacket(packet) {
        const result = {
            header: [packet[0], packet[1]], // 0xCD, 0xCD
            pressureReadings: [],
            volumeReadings: [],
            rpm: 0,
            heaterTemperature: 0,
            footer: [packet[6], packet[7]], // 0xDC, 0xDC
            rawData: packet,
            timestamp: new Date()
        };

        // RPM (bytes 2..3), Temperature (bytes 4..5) big-endian
        result.rpm = (packet[2] << 8) | packet[3];
        result.heaterTemperature = (packet[4] << 8) | packet[5];

        return result;
    }

    // Get a summary of the parsed data for display
    getDataSummary(parsedData) {
        const summary = {
            timestamp: parsedData.timestamp.toLocaleTimeString(),
            pressureCount: parsedData.pressureReadings.length,
            volumeCount: parsedData.volumeReadings.length,
            averagePressure: 0,
            averageVolume: 0,
            maxPressure: 0,
            minPressure: 0,
            maxVolume: 0,
            minVolume: 0,
            rpm: parsedData.rpm,
            heaterTemperature: parsedData.heaterTemperature
        };

        // Calculate pressure statistics
        if (parsedData.pressureReadings.length > 0) {
            summary.averagePressure = parsedData.pressureReadings.reduce((a, b) => a + b, 0) / parsedData.pressureReadings.length;
            summary.maxPressure = Math.max(...parsedData.pressureReadings);
            summary.minPressure = Math.min(...parsedData.pressureReadings);
        }

        // Calculate volume statistics
        if (parsedData.volumeReadings.length > 0) {
            summary.averageVolume = parsedData.volumeReadings.reduce((a, b) => a + b, 0) / parsedData.volumeReadings.length;
            summary.maxVolume = Math.max(...parsedData.volumeReadings);
            summary.minVolume = Math.min(...parsedData.volumeReadings);
        }

        return summary;
    }

    // Format data for display in the UI
    formatForDisplay(parsedData) {
        const summary = this.getDataSummary(parsedData);
        
        let displayText = `Stirling Engine Data - ${summary.timestamp}\n`;
        displayText += `================================\n\n`;
        
        displayText += `Pressure Readings (${summary.pressureCount}):\n`;
        displayText += `  Average: ${summary.averagePressure.toFixed(2)}\n`;
        displayText += `  Range: ${summary.minPressure} - ${summary.maxPressure}\n`;
        displayText += `  Values: ${parsedData.pressureReadings.join(', ')}\n\n`;
        
        displayText += `Volume Readings (${summary.volumeCount}):\n`;
        displayText += `  Average: ${summary.averageVolume.toFixed(2)}\n`;
        displayText += `  Range: ${summary.minVolume.toFixed(2)} - ${summary.maxVolume.toFixed(2)}\n`;
        displayText += `  Values: ${parsedData.volumeReadings.map(v => v.toFixed(2)).join(', ')}\n\n`;
        
        displayText += `Engine RPM: ${summary.rpm}\n`;
        displayText += `Heater Temperature: ${summary.heaterTemperature}°C\n\n`;
        
        displayText += `Raw Data (Hex):\n`;
        displayText += `  ${parsedData.rawData.map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`;
        
        return displayText;
    }

    // Clear the internal buffer
    clearBuffer() {
        this.buffer = [];
    }

    // Get current buffer status
    getBufferStatus() {
        return {
            bufferLength: this.buffer.length,
            hasPartialPacket: this.buffer.length > 0,
            expectedPacketSize: this.packetSize
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StirlingDataParser;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.StirlingDataParser = StirlingDataParser;
}
