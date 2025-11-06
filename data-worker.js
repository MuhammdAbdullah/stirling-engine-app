// Worker thread: parses incoming serial data on a separate CPU core
// This runs on a different CPU core, so it doesn't block the UI thread
const { parentPort } = require('worker_threads');
const StirlingDataParser = require('./stirling-data-parser');

const parser = new StirlingDataParser();

// Receive raw chunks (Buffer or Uint8Array) from main process
parentPort.on('message', (msg) => {
  try {
    // Handle commands
    if (msg && typeof msg === 'object' && msg.__cmd === 'clear') {
      parser.clearBuffer();
      return;
    }
    
    // Process data chunks
    // Ensure we have a byte array
    const chunkArray = Array.isArray(msg) ? msg : Array.from(msg);
    const results = parser.processData(chunkArray);
    
    // Send parsed results back to main process (non-blocking)
    if (results && results.length > 0) {
      parentPort.postMessage(results);
    }
  } catch (e) {
    // Send error back to main process
    parentPort.postMessage({ __worker_error: e && e.message ? e.message : String(e) });
  }
});

// Handle errors
parentPort.on('error', (error) => {
  console.error('[WORKER] Error:', error);
});

// Worker thread ready



