// Simple test script to verify the setup
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Matrix Stirling Engine Setup...\n');

// Check if required files exist
const requiredFiles = [
    'main.js',
    'index.html', 
    'renderer.js',
    'styles.css',
    'package.json',
    'lib/chart.min.js'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} - Found`);
    } else {
        console.log(`❌ ${file} - Missing`);
        allFilesExist = false;
    }
});

// Check if node_modules exists
if (fs.existsSync('node_modules')) {
    console.log('✅ node_modules - Found');
} else {
    console.log('❌ node_modules - Missing (run npm install)');
    allFilesExist = false;
}

// Check package.json dependencies
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasElectron = (packageJson.dependencies && packageJson.dependencies.electron) || 
                       (packageJson.devDependencies && packageJson.devDependencies.electron);
    const hasChartJs = packageJson.dependencies && packageJson.dependencies['chart.js'];
    
    if (hasElectron) {
        console.log('✅ Electron dependency - Found');
    } else {
        console.log('❌ Electron dependency - Missing');
        allFilesExist = false;
    }
    
    if (hasChartJs) {
        console.log('✅ Chart.js dependency - Found');
    } else {
        console.log('❌ Chart.js dependency - Missing');
        allFilesExist = false;
    }
} catch (error) {
    console.log('❌ package.json - Error reading file');
    allFilesExist = false;
}

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
    console.log('🎉 Setup is complete! You can now run:');
    console.log('   npm start        - Start the app');
    console.log('   npm run dev      - Start in development mode');
    console.log('   npm run build-win - Build for Windows');
} else {
    console.log('⚠️  Setup incomplete. Please check the missing files above.');
    console.log('   Run: npm install');
    console.log('   Run: node setup.js');
}

console.log('\n🚀 Happy coding!');
