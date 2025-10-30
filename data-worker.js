// Worker thread: parses incoming serial data on a separate CPU core
const { parentPort } = require('worker_threads');
const StirlingDataParser = require('./stirling-data-parser');

const parser = new StirlingDataParser();

// Receive raw chunks (Buffer or Uint8Array) from main process
parentPort.on('message', (msg) => {
  try {
    // Ensure we have a byte array
    const chunkArray = Array.isArray(msg) ? msg : Array.from(msg);
    const results = parser.processData(chunkArray);
    if (results && results.length > 0) {
      parentPort.postMessage(results);
    }
  } catch (e) {
    parentPort.postMessage({ __worker_error: e && e.message ? e.message : String(e) });
  }
});

// Optional: allow clearing buffer if requested
parentPort.on('message', (msg) => {
  if (msg && msg.__cmd === 'clear') {
    parser.clearBuffer();
  }
});



