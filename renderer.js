// This is the renderer process file
// It handles the user interface and Chart.js integration

// Wait for the page to load before running our code
document.addEventListener('DOMContentLoaded', function() {
    
    // Get references to HTML elements
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const clearButton = document.getElementById('clearButton');
    const statusText = document.getElementById('statusText');
    const dataCount = document.getElementById('dataCount');
    const currentTemp = document.getElementById('currentTemp');
    const chartCanvas = document.getElementById('temperatureChart');
    
    // Variables to store our data and chart
    let temperatureData = [];
    let timeLabels = [];
    let chart = null;
    let monitoringInterval = null;
    let dataPointCounter = 0;
    
    // Initialize the chart when the page loads
    initializeChart();
    
    // Set up button event listeners
    startButton.addEventListener('click', startMonitoring);
    stopButton.addEventListener('click', stopMonitoring);
    clearButton.addEventListener('click', clearData);
    
    // Function to create and configure the chart
    function initializeChart() {
        const ctx = chartCanvas.getContext('2d');
        
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Temperature (°C)',
                    data: temperatureData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Temperature (°C)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#007bff',
                        borderWidth: 1
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }
    
    // Function to start monitoring (simulates temperature data)
    function startMonitoring() {
        statusText.textContent = 'Monitoring...';
        statusText.style.color = '#28a745';
        
        startButton.disabled = true;
        stopButton.disabled = false;
        
        // Generate temperature data every 2 seconds
        monitoringInterval = setInterval(function() {
            // Simulate temperature readings (realistic Stirling engine range)
            const baseTemp = 80; // Base temperature in Celsius
            const variation = (Math.random() - 0.5) * 20; // ±10°C variation
            const trend = Math.sin(dataPointCounter * 0.1) * 5; // Slow oscillation
            const newTemperature = baseTemp + variation + trend;
            
            // Add new data point
            addDataPoint(newTemperature);
            
        }, 2000); // Update every 2 seconds
    }
    
    // Function to stop monitoring
    function stopMonitoring() {
        statusText.textContent = 'Stopped';
        statusText.style.color = '#dc3545';
        
        startButton.disabled = false;
        stopButton.disabled = true;
        
        if (monitoringInterval) {
            clearInterval(monitoringInterval);
            monitoringInterval = null;
        }
    }
    
    // Function to add a new data point to the chart
    function addDataPoint(temperature) {
        // Add temperature to our data array
        temperatureData.push(temperature);
        
        // Create time label
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        timeLabels.push(timeString);
        
        // Keep only the last 50 data points to prevent the chart from getting too crowded
        if (temperatureData.length > 50) {
            temperatureData.shift();
            timeLabels.shift();
        }
        
        // Update the chart
        chart.update('none'); // 'none' means no animation for smoother updates
        
        // Update the UI
        dataPointCounter++;
        dataCount.textContent = dataPointCounter;
        currentTemp.textContent = temperature.toFixed(1) + '°C';
        
        // Change color based on temperature
        if (temperature > 90) {
            currentTemp.style.color = '#dc3545'; // Red for hot
        } else if (temperature < 70) {
            currentTemp.style.color = '#007bff'; // Blue for cool
        } else {
            currentTemp.style.color = '#28a745'; // Green for normal
        }
    }
    
    // Function to clear all data
    function clearData() {
        // Clear the data arrays
        temperatureData = [];
        timeLabels = [];
        dataPointCounter = 0;
        
        // Update the chart
        chart.update();
        
        // Update the UI
        dataCount.textContent = '0';
        currentTemp.textContent = '--°C';
        currentTemp.style.color = '#6c757d';
        
        // Stop monitoring if it's running
        if (monitoringInterval) {
            stopMonitoring();
        }
        
        statusText.textContent = 'Ready';
        statusText.style.color = '#6c757d';
    }
    
    // Function to generate sample data for demonstration
    function generateSampleData() {
        const sampleTemps = [75, 78, 82, 85, 88, 90, 87, 84, 81, 79, 76, 74, 77, 80, 83, 86, 89, 91, 88, 85];
        const sampleTimes = [];
        
        for (let i = 0; i < sampleTemps.length; i++) {
            const time = new Date();
            time.setSeconds(time.getSeconds() - (sampleTemps.length - i) * 2);
            sampleTimes.push(time.toLocaleTimeString());
        }
        
        temperatureData = sampleTemps;
        timeLabels = sampleTimes;
        dataPointCounter = sampleTemps.length;
        
        chart.update();
        dataCount.textContent = dataPointCounter;
        currentTemp.textContent = sampleTemps[sampleTemps.length - 1].toFixed(1) + '°C';
    }
    
    // Uncomment the line below to load sample data when the page loads
    // generateSampleData();
    
});
