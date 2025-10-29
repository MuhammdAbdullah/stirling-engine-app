// This is the main process file for our Electron app
// It creates and manages the application window

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Keep a global reference of the window object
let mainWindow;

// Function to create the main window
function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets/icon.png'), // Optional: add an icon
        title: 'Stirling Engine Temperature Monitor'
    });

    // Load the HTML file
    mainWindow.loadFile('index.html');

    // Open the DevTools in development mode
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

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
