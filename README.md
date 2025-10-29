# Stirling Engine Temperature Monitor

A simple Electron.js application for monitoring Stirling Engine temperature data with real-time Chart.js visualization.

## Features

- 🔥 Real-time temperature monitoring simulation
- 📊 Beautiful Chart.js line chart visualization
- 🎛️ Start/Stop/Clear controls
- 📱 Responsive design that works on different screen sizes
- 🎨 Modern, clean user interface

## Project Structure

```
E:\Thermo\Striling Engine\
├── main.js          # Main Electron process
├── index.html       # Main HTML file
├── renderer.js      # Renderer process with Chart.js
├── styles.css       # CSS styling
├── package.json     # Project dependencies
└── README.md        # This file
```

## Setup Instructions

### Prerequisites

Make sure you have Node.js installed on your computer:
- Download from: https://nodejs.org/
- Choose the LTS (Long Term Support) version

### Installation

1. **Open Command Prompt or PowerShell**
   - Press `Win + R`, type `cmd` or `powershell`, and press Enter

2. **Navigate to the project folder**
   ```bash
   cd "E:\Thermo\Striling Engine"
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```
   This will install Electron and Chart.js automatically.

### Running the Application

1. **Start the application**
   ```bash
   npm start
   ```

2. **For development mode (with developer tools)**
   ```bash
   npm run dev
   ```

## How to Use

1. **Start Monitoring**: Click the "Start Monitoring" button to begin simulating temperature data
2. **View Chart**: Watch the real-time temperature chart update every 2 seconds
3. **Stop Monitoring**: Click "Stop Monitoring" to pause data collection
4. **Clear Data**: Click "Clear Data" to reset the chart and start fresh

## Understanding the Code

### main.js
- Creates the main Electron window
- Sets up the application lifecycle
- Loads the HTML file

### index.html
- Contains the user interface structure
- Links to CSS and JavaScript files
- Includes Chart.js from CDN

### renderer.js
- Handles all user interactions
- Creates and updates the Chart.js chart
- Simulates temperature data (you can replace this with real sensor data)

### styles.css
- Provides modern, responsive styling
- Makes the app look professional and user-friendly

## Customizing for Real Data

To connect to real temperature sensors, replace the simulation code in `renderer.js`:

1. Find the `startMonitoring()` function
2. Replace the simulation code with your actual sensor reading code
3. Update the `addDataPoint()` function calls with real temperature values

## Troubleshooting

**If the app won't start:**
- Make sure you ran `npm install` first
- Check that Node.js is installed correctly
- Try running `npm start` from the correct directory

**If the chart doesn't appear:**
- Check your internet connection (Chart.js loads from CDN)
- Open the developer tools (F12) to see any error messages

**If buttons don't work:**
- Make sure all files are in the correct location
- Check that there are no JavaScript errors in the console

## Next Steps

- Add more chart types (bar charts, pie charts)
- Implement data export functionality
- Add temperature alerts and notifications
- Connect to real hardware sensors
- Add data logging to files

## Support

This is a beginner-friendly project. If you encounter any issues:
1. Check the troubleshooting section above
2. Make sure all files are exactly as provided
3. Verify that Node.js and npm are working correctly

Happy coding! 🚀
