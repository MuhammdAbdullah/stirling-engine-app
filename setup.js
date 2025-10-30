// Setup script to download Chart.js locally
// This ensures the app works without internet connection

const https = require('https');
const fs = require('fs');
const path = require('path');

// Chart.js CDN URL
const chartJsUrl = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js';
const outputPath = path.join(__dirname, 'lib', 'chart.min.js');

// Create lib directory if it doesn't exist
const libDir = path.join(__dirname, 'lib');
if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
}

console.log('Downloading Chart.js locally...');

// Download Chart.js
const file = fs.createWriteStream(outputPath);
https.get(chartJsUrl, function(response) {
    response.pipe(file);
    
    file.on('finish', function() {
        file.close();
        console.log('✅ Chart.js downloaded successfully!');
        console.log('📁 Saved to: ' + outputPath);
        console.log('🚀 You can now run: npm start');
    });
    
}).on('error', function(err) {
    console.error('❌ Error downloading Chart.js:', err.message);
    console.log('💡 You can manually download Chart.js from:');
    console.log('   https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js');
    console.log('   And save it as: lib/chart.min.js');
});

