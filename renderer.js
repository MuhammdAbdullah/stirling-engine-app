// This is the renderer process file
// It handles the user interface and Chart.js integration

// Wait for the page to load before running our code
document.addEventListener('DOMContentLoaded', function() {
    
    // Stirling data parser is already included in index.html
    
    // Get references to HTML elements
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const clearButton = document.getElementById('clearButton');
    const adminButton = document.getElementById('adminButton');
    const statusText = document.getElementById('statusText');
    const dataCount = document.getElementById('dataCount');
    const currentTemp = document.getElementById('currentTemp');
    const rpmValueEl = document.getElementById('rpmValue');
    const tempValueEl = document.getElementById('tempValue');
    const heaterSlider = document.getElementById('heaterSlider');
    const heaterValue = document.getElementById('heaterValue');
    const heaterToggle = document.getElementById('heaterToggle');
    const heaterTip = document.getElementById('heaterTip');
    const auxSlider = document.getElementById('auxSlider');
    const auxTip = document.getElementById('auxTip');
    const auxValue = document.getElementById('auxValue');
    const sweepStepEl = document.getElementById('sweepStep');
    const sweepIntervalEl = document.getElementById('sweepInterval');
    const sweepToggle = document.getElementById('sweepToggle');
    const themeSelector = document.getElementById('themeSelector');
    let heaterOn = true;
    let currentTheme = 'light';
    const chartCanvas = document.getElementById('temperatureChart');
    const pvCanvas = document.getElementById('pvChart');
    const pressureTimeCanvas = document.getElementById('pressureTimeChart');
    const volumeTimeCanvas = document.getElementById('volumeTimeChart');
    const pvContainer = document.getElementById('pvContainer');
    const pressureTimeContainer = document.getElementById('pressureTimeContainer');
    const volumeTimeContainer = document.getElementById('volumeTimeContainer');
    
    // System status elements
    const systemStatusBanner = document.getElementById('systemStatusBanner');
    
    // Variables to store our data and chart
    let temperatureData = [];
    let timeLabels = [];
    let chart = null;
    let pvChart = null;
    let pressureChart = null;
    let volumeChart = null;
    let pvPoints = [];
    let pressureTimeLabels = [];
    let pressureTimeValues = [];
    let volumeTimeLabels = [];
    let volumeTimeValues = [];
    let monitoringInterval = null;
    let dataPointCounter = 0;
    let lastPVUpdateMs = 0; // no longer used for auto-hide
    let lastChartDrawMs = 0; // throttle chart redraws to ~20 FPS
    
    // USB Serial Communication variables
    let isConnected = false;
    let currentPort = null;
    let stirlingParser = null;
    
    // Data storage for Stirling Engine
    let pressureData = [];
    let volumeData = [];
    let rpmData = [];
    let heaterTempData = [];
    
    
    // Initialize the chart when the page loads (temperature chart removed)
    if (chartCanvas) {
        initializeChart();
    }
    initializePVChart();
    initializePressureChart();
    initializeVolumeChart();

    // Always show charts
    try { if (pvContainer) pvContainer.style.display = 'block'; } catch (_) {}
    try { if (pressureTimeContainer) pressureTimeContainer.style.display = 'block'; } catch (_) {}
    try { if (volumeTimeContainer) volumeTimeContainer.style.display = 'block'; } catch (_) {}
    
    // Initialize Stirling data parser
    if (typeof StirlingDataParser !== 'undefined') {
        stirlingParser = new StirlingDataParser();
    }
    
    // Set up button event listeners
    if (startButton) startButton.addEventListener('click', startMonitoring);
    if (stopButton) stopButton.addEventListener('click', stopMonitoring);
    if (clearButton) clearButton.addEventListener('click', clearData);

    // Heater UI events
    if (heaterSlider && heaterValue) {
        heaterValue.textContent = heaterSlider.value + '°C';
        updateSliderTip();
        let sliderDebounce = null;
        heaterSlider.addEventListener('input', function() {
            heaterValue.textContent = heaterSlider.value + '°C';
            updateSliderTip();
            if (sliderDebounce) clearTimeout(sliderDebounce);
            sliderDebounce = setTimeout(function(){
                sendHeaterCommand();
            }, 150);
        });
        // Show tip on hover with cursor position
        heaterSlider.addEventListener('mousemove', function(e) {
            var row = heaterSlider.closest('.slider-row');
            if (row) {
                row.classList.add('active');
            }
            updateSliderTipFromEvent(e);
        });
        heaterSlider.addEventListener('mouseleave', function(e) {
            var row = heaterSlider.closest('.slider-row');
            if (row) {
                row.classList.remove('active');
            }
        });
    }
    if (heaterToggle) {
        // reflect initial state
        if (heaterOn) { try { heaterToggle.classList.add('active'); } catch(_){} }
        heaterToggle.addEventListener('click', function() {
            heaterOn = !heaterOn;
            heaterToggle.textContent = heaterOn ? '● Heater ON' : '○ Heater OFF';
            try { heaterToggle.classList.toggle('active', heaterOn); } catch(_){}
            sendHeaterCommand();
        });
        // Set initial text based on state
        heaterToggle.textContent = heaterOn ? '● Heater ON' : '○ Heater OFF';
    }

    function sendHeaterCommand() {
        if (!window.electronAPI || !window.electronAPI.setHeater) return;
        var val = heaterOn ? Math.max(20, Math.min(70, parseInt(heaterSlider ? heaterSlider.value : 0))) : 0;
        window.electronAPI.setHeater(val);
    }

    function updateSliderTip() {
        if (!heaterSlider || !heaterTip) return;
        var min = parseInt(heaterSlider.min || 0);
        var max = parseInt(heaterSlider.max || 100);
        var val = parseInt(heaterSlider.value || 0);
        var percent = (val - min) / (max - min);
        var row = heaterSlider.closest('.slider-row') || heaterSlider.parentElement;
        var rowRect = row.getBoundingClientRect();
        var sliderRect = heaterSlider.getBoundingClientRect();
        var x = (sliderRect.left - rowRect.left) + percent * sliderRect.width;
        heaterTip.style.left = x + 'px';
        heaterTip.textContent = String(val);
    }
    
    function updateSliderTipFromEvent(e) {
        if (!heaterSlider || !heaterTip) return;
        var row = heaterSlider.closest('.slider-row') || heaterSlider.parentElement;
        var rowRect = row.getBoundingClientRect();
        var sliderRect = heaterSlider.getBoundingClientRect();
        var mouseX = e.clientX - sliderRect.left;
        var percent = Math.max(0, Math.min(1, mouseX / sliderRect.width));
        var min = parseInt(heaterSlider.min || 0);
        var max = parseInt(heaterSlider.max || 100);
        var val = Math.round(min + percent * (max - min));
        var x = (sliderRect.left - rowRect.left) + percent * sliderRect.width;
        heaterTip.style.left = x + 'px';
        heaterTip.textContent = String(val);
    }

    // Aux slider events
    if (auxSlider && auxValue) {
        auxValue.textContent = auxSlider.value + '%';
        updateAuxTip();
        let auxDebounce = null;
        auxSlider.addEventListener('input', function(){
            auxValue.textContent = auxSlider.value + '%';
            updateAuxTip();
            if (auxDebounce) clearTimeout(auxDebounce);
            auxDebounce = setTimeout(function(){
                sendAuxCommand();
            }, 150);
        });
        // Show tip on hover with cursor position
        auxSlider.addEventListener('mousemove', function(e) {
            var row = auxSlider.closest('.slider-row');
            if (row) {
                row.classList.add('active');
            }
            updateAuxTipFromEvent(e);
        });
        auxSlider.addEventListener('mouseleave', function(e) {
            var row = auxSlider.closest('.slider-row');
            if (row) {
                row.classList.remove('active');
            }
        });
    }

    function updateAuxTip() {
        if (!auxSlider || !auxTip) return;
        var min = parseInt(auxSlider.min || 0);
        var max = parseInt(auxSlider.max || 100);
        var val = parseInt(auxSlider.value || 0);
        var percent = (val - min) / (max - min);
        var row = auxSlider.closest('.slider-row') || auxSlider.parentElement;
        var rowRect = row.getBoundingClientRect();
        var sliderRect = auxSlider.getBoundingClientRect();
        var x = (sliderRect.left - rowRect.left) + percent * sliderRect.width;
        auxTip.style.left = x + 'px';
        auxTip.textContent = String(val);
    }
    
    function updateAuxTipFromEvent(e) {
        if (!auxSlider || !auxTip) return;
        var row = auxSlider.closest('.slider-row') || auxSlider.parentElement;
        var rowRect = row.getBoundingClientRect();
        var sliderRect = auxSlider.getBoundingClientRect();
        var mouseX = e.clientX - sliderRect.left;
        var percent = Math.max(0, Math.min(1, mouseX / sliderRect.width));
        var min = parseInt(auxSlider.min || 0);
        var max = parseInt(auxSlider.max || 100);
        var val = Math.round(min + percent * (max - min));
        var x = (sliderRect.left - rowRect.left) + percent * sliderRect.width;
        auxTip.style.left = x + 'px';
        auxTip.textContent = String(val);
    }

    // Keep tips positioned on resize
    window.addEventListener('resize', function(){ updateSliderTip(); updateAuxTip(); });

    function sendAuxCommand() {
        if (!window.electronAPI || !window.electronAPI.setAux) return;
        var val = Math.max(0, Math.min(100, parseInt(auxSlider ? auxSlider.value : 0)));
        window.electronAPI.setAux(val);
    }

    // Sweep logic
    let sweepTimer = null;
    let sweepDirection = 1; // 1 up, -1 down
    function handleSweepToggle() {
        if (!sweepToggle) return;
        if (sweepTimer) {
            clearInterval(sweepTimer); sweepTimer = null;
            sweepToggle.textContent = 'Start Sweep';
            sweepToggle.classList.remove('active');
            return;
        }
        const step = Math.max(1, Math.min(20, parseInt(sweepStepEl ? sweepStepEl.value : 5)));
        const interval = Math.max(20, parseInt(sweepIntervalEl ? sweepIntervalEl.value : 200));
        sweepToggle.textContent = 'Stop Sweep';
        sweepToggle.classList.add('active');
        sweepTimer = setInterval(function(){
            if (!auxSlider) return;
            let val = parseInt(auxSlider.value || 0);
            val += step * sweepDirection;
            if (val >= 100) { val = 100; sweepDirection = -1; }
            if (val <= 0) { val = 0; sweepDirection = 1; }
            auxSlider.value = String(val);
            auxValue.textContent = val + '%';
            updateAuxTip();
            sendAuxCommand();
        }, interval);
    }
    if (sweepToggle) { sweepToggle.addEventListener('click', handleSweepToggle); }
    if (adminButton) { adminButton.addEventListener('click', openAdminWindow); }
    
    // Theme selector
    if (themeSelector) {
        themeSelector.addEventListener('change', function(e) {
            currentTheme = e.target.value;
            updateChartTheme(currentTheme);
        });
        // Initialize theme on page load
        setTimeout(function() {
            updateChartTheme(currentTheme);
        }, 100);
    }
    
    // Set up USB serial communication listeners
    setupSerialListeners();

    // Immediately sync current connection status once UI is ready
    if (window.electronAPI && window.electronAPI.getConnectionStatus) {
        window.electronAPI.getConnectionStatus().then(function(status){
            try { console.log('[UI] initial connection-status:', status); } catch (e) {}
            updateConnectionStatus(status);
        }).catch(function(e){
            try { console.error('[UI] getConnectionStatus error:', e && e.message ? e.message : e); } catch (e2) {}
        });
    }

    // Periodically refresh connection status for a short time in case we missed events
    (function(){
        var attempts = 0;
        var maxAttempts = 20; // ~20 seconds
        var timerId = setInterval(function(){
            attempts += 1;
            if (isConnected || !window.electronAPI || !window.electronAPI.getConnectionStatus) {
                clearInterval(timerId);
                return;
            }
            window.electronAPI.getConnectionStatus().then(function(status){
                try { console.log('[UI] polled connection-status:', status); } catch (e) {}
                updateConnectionStatus(status);
            }).catch(function(_){});
            if (attempts >= maxAttempts) {
                clearInterval(timerId);
            }
        }, 1000);
    })();
    
    // Function to update chart theme
    function updateChartTheme(theme) {
        var gridColor, textColor, bgColor;
        if (theme === 'dark') {
            gridColor = 'rgba(255, 255, 255, 0.2)';
            textColor = '#ffffff';
            bgColor = '#1a1a1a';
        } else {
            gridColor = 'rgba(0, 0, 0, 0.1)';
            textColor = '#333333';
            bgColor = '#f8f9fa';
        }
        
        if (pvChart) {
            pvChart.options.scales.x.grid.color = gridColor;
            pvChart.options.scales.y.grid.color = gridColor;
            pvChart.options.scales.x.ticks.color = textColor;
            pvChart.options.scales.y.ticks.color = textColor;
            pvChart.options.scales.x.title.color = textColor;
            pvChart.options.scales.y.title.color = textColor;
            pvChart.options.plugins.legend.labels.color = textColor;
            pvChart.update('none');
        }
        
        if (pressureChart) {
            pressureChart.options.scales.y.grid.color = gridColor;
            pressureChart.options.scales.y.ticks.color = textColor;
            pressureChart.options.scales.y.title.color = textColor;
            pressureChart.options.plugins.legend.labels.color = textColor;
            pressureChart.update('none');
        }
        
        if (volumeChart) {
            volumeChart.options.scales.y.grid.color = gridColor;
            volumeChart.options.scales.y.ticks.color = textColor;
            volumeChart.options.scales.y.title.color = textColor;
            volumeChart.options.plugins.legend.labels.color = textColor;
            volumeChart.update('none');
        }
        
        var chartContainers = document.querySelectorAll('.chart-container');
        for (var i = 0; i < chartContainers.length; i++) {
            chartContainers[i].style.background = bgColor;
            chartContainers[i].style.borderColor = theme === 'dark' ? '#444' : '#e9ecef';
        }
        
        var workDisplay = document.getElementById('workDisplay');
        if (workDisplay) {
            workDisplay.style.color = textColor;
        }
    }
    
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
                maintainAspectRatio: true,
                aspectRatio: 1,
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

    // Create Pressure-Volume (P–V) chart
    function initializePVChart() {
        const ctx = pvCanvas.getContext('2d');
        const fillPVPlugin = {
            id: 'fillPV',
            afterDatasetsDraw: (chart) => {
                try {
                    if (chart !== pvChart) return;
                    if (!pvPoints || pvPoints.length < 3) return;
                    const xScale = chart.scales.x;
                    const yScale = chart.scales.y;
                    const c = chart.ctx;
                    c.save();
                    c.fillStyle = 'rgba(220, 53, 69, 0.10)';
                    c.beginPath();
                    for (let i = 0; i < pvPoints.length; i++) {
                        const px = xScale.getPixelForValue(pvPoints[i].x);
                        const py = yScale.getPixelForValue(pvPoints[i].y);
                        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
                    }
                    c.closePath();
                    c.fill();
                    c.restore();
                } catch (e) { /* ignore */ }
            }
        };
        pvChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Pressure vs Volume',
                    data: [], // points: {x: volume, y: pressure}
                    showLine: true,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.15)',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                scales: {
                    x: {
                        title: { display: true, text: 'Volume (m³)', font: { size: 14, weight: 'bold' } },
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    },
                    y: {
                        title: { display: true, text: 'Pressure', font: { size: 14, weight: 'bold' } },
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { font: { size: 14, weight: 'bold' } }
                    }
                }
            },
            plugins: [fillPVPlugin]
        });
    }

    // Pressure vs Time chart
    function initializePressureChart() {
        const ctx = pressureTimeCanvas.getContext('2d');
        pressureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: pressureTimeLabels,
                datasets: [{
                    label: 'Pressure vs Time',
                    data: pressureTimeValues,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.15)',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: false }, ticks: { display: false }, grid: { display: false } },
                    y: { title: { display: true, text: 'Pressure' }, grid: { color: 'rgba(0,0,0,0.1)' } }
                },
                plugins: { legend: { display: true, position: 'top' } }
            }
        });
    }

    // Volume vs Time chart
    function initializeVolumeChart() {
        const ctx = volumeTimeCanvas.getContext('2d');
        volumeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: volumeTimeLabels,
                datasets: [{
                    label: 'Volume vs Time',
                    data: volumeTimeValues,
                    borderColor: '#20c997',
                    backgroundColor: 'rgba(32, 201, 151, 0.15)',
                    borderWidth: 2,
                    pointRadius: 2,
                    tension: 0.2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: false }, ticks: { display: false }, grid: { display: false } },
                    y: { title: { display: true, text: 'Volume' }, grid: { color: 'rgba(0,0,0,0.1)' } }
                },
                plugins: { legend: { display: true, position: 'top' } }
            }
        });
    }

    // Update P–V chart with a parsed packet
    function updatePVChart(parsed) {
        if (!pvChart || !parsed) return;
        if (!parsed.pressureReadings || parsed.pressureReadings.length === 0 || !parsed.volumeReadings || parsed.volumeReadings.length === 0) {
            return; // only handle PV packets
        }
        lastPVUpdateMs = Date.now();
        var n = Math.min(parsed.pressureReadings.length, parsed.volumeReadings.length);
        for (var i = 0; i < n; i++) {
            var volumeM3 = parsed.volumeReadings[i] * 1e-9; // convert mm^3 to m^3
            pvPoints.push({ x: volumeM3, y: parsed.pressureReadings[i] });
        }
        // Keep only last 1000 points
        if (pvPoints.length > 1000) {
            pvPoints = pvPoints.slice(pvPoints.length - 1000);
        }
        // Throttle redraws to avoid UI backlog at high data rates
        pvChart.data.datasets[0].data = pvPoints;
        var nowMs = Date.now();
        if (nowMs - lastChartDrawMs > 50) { // ~20 FPS max
            lastChartDrawMs = nowMs;
            pvChart.update('none');
            if (pressureChart) pressureChart.update('none');
            if (volumeChart) volumeChart.update('none');
        }

        // Compute work via polygon area (shoelace) in data units
        try {
            const work = computePolygonArea(pvPoints);
            var wd = document.getElementById('workDisplay');
            if (wd) { wd.textContent = 'Work (P×V units): ' + work.toFixed(2); }
        } catch (_) {}

        // Time series updates (one reading per PV packet) - hide x-axis labels
        pressureTimeLabels.push('');
        volumeTimeLabels.push('');
        if (parsed.pressureReadings.length > 0) {
            pressureTimeValues.push(parsed.pressureReadings[0]);
        }
        if (parsed.volumeReadings.length > 0) {
            volumeTimeValues.push(parsed.volumeReadings[0]);
        }
        // Keep last 150 samples
        if (pressureTimeLabels.length > 150) { pressureTimeLabels.shift(); pressureTimeValues.shift(); }
        if (volumeTimeLabels.length > 150) { volumeTimeLabels.shift(); volumeTimeValues.shift(); }
        // Chart updates handled by throttled block above
    }

    function computePolygonArea(points) {
        if (!points || points.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y - points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    }
    
    // Function to start monitoring (simulates temperature data)
    function startMonitoring() {
        statusText.textContent = 'Monitoring...';
        statusText.style.color = '#28a745';
        
        if (startButton) startButton.disabled = true;
        if (stopButton) stopButton.disabled = false;
        
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
        
        if (startButton) startButton.disabled = false;
        if (stopButton) stopButton.disabled = true;
        
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
        
        // Update the chart if present
        if (chart) {
            chart.update('none'); // 'none' means no animation for smoother updates
        }
        
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
        
        // Update the chart if present
        if (chart) {
            chart.update();
        }
        
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
    
    // USB Serial Communication Functions
    function setupSerialListeners() {
        // Listen for Stirling data from main process
        if (window.electronAPI) {
            window.electronAPI.onStirlingData((event, data) => {
                handleStirlingData(data);
            });
            
            
            window.electronAPI.onConnectionStatus((event, status) => {
                try { 
                    console.log('[UI] connection-status event received:', status);
                    console.log('[UI] status.connected =', status.connected);
                } catch (e) {
                    console.error('[UI] Error in connection-status handler:', e);
                }
                var dbg = document.getElementById('debugStatus');
                if (dbg) { dbg.textContent = 'ON'; }
                updateConnectionStatus(status);
            });

            // Also listen for raw data and parse here for PV chart
            if (window.electronAPI.onRawData && typeof StirlingDataParser !== 'undefined') {
                var parser = new StirlingDataParser();
                window.electronAPI.onRawData(function(event, bytes) {
                    try {
                        var dataArr = Array.isArray(bytes) ? bytes : (bytes instanceof Uint8Array ? Array.from(bytes) : Array.from(new Uint8Array(bytes)));
                        var parsedPackets = parser.processData(dataArr);
                        for (var i = 0; i < parsedPackets.length; i++) {
                            var pkt = parsedPackets[i];
                            if (pkt) {
                                if (Array.isArray(pkt.pressureReadings) && pkt.pressureReadings.length > 0 && Array.isArray(pkt.volumeReadings) && pkt.volumeReadings.length > 0) {
                                    updatePVChart(pkt);
                                }
                                if (typeof pkt.rpm === 'number' && rpmValueEl) {
                                    rpmValueEl.textContent = String(pkt.rpm);
                                }
                                if (typeof pkt.heaterTemperature === 'number' && tempValueEl) {
                                    tempValueEl.textContent = String(pkt.heaterTemperature);
                                }
                            }
                        }
                    } catch (_) {}
                });
            }
        }
    }
    
    function handleStirlingData(parsedDataArray) {
        // Process each parsed data packet
        parsedDataArray.forEach(parsedData => {
            // Avoid heavy console logging at high data rates
            
            // Update system status to show data is flowing
            updateSystemStatusWithData();
            
            // Update data arrays
            if (parsedData.pressureReadings.length > 0) {
                const avgPressure = parsedData.pressureReadings.reduce((a, b) => a + b, 0) / parsedData.pressureReadings.length;
                pressureData.push(avgPressure);
            }
            
            if (parsedData.volumeReadings.length > 0) {
                const avgVolume = parsedData.volumeReadings.reduce((a, b) => a + b, 0) / parsedData.volumeReadings.length;
                volumeData.push(avgVolume);
                console.log('Volume readings:', parsedData.volumeReadings.map(v => v.toFixed(2)));
            }
            
            if (parsedData.rpm > 0) {
                rpmData.push(parsedData.rpm);
            }
            
            if (parsedData.heaterTemperature > 0) {
                heaterTempData.push(parsedData.heaterTemperature);
            }
            
            // Keep only last 50 data points
            if (pressureData.length > 50) {
                pressureData.shift();
                volumeData.shift();
                rpmData.shift();
                heaterTempData.shift();
            }
            
            // Update UI with latest data
            updateDataDisplay(parsedData);
        });
    }
    
    function updateDataDisplay(parsedData) {
        // Update status text
        statusText.textContent = 'Receiving Data';
        statusText.style.color = '#28a745';
        
        // Update data count
        dataPointCounter++;
        dataCount.textContent = dataPointCounter;
        
        // Temperature UI is no longer updated since graph was removed
    }
    
    function updateConnectionStatus(status) {
        isConnected = status.connected;
        
        
        // Update system status banner
        updateSystemStatus(status);
        
        if (status.connected) {
            const deviceInfo = status.deviceType ? ` (${status.deviceType})` : '';
            const portInfo = status.port ? ` on ${status.port}` : '';
            statusText.textContent = `Connected${deviceInfo}${portInfo}`;
            statusText.style.color = '#28a745';
            if (startButton) startButton.disabled = false;
            if (stopButton) stopButton.disabled = true;
            
            if (status.vid && status.pid) {
                console.log(`✅ Connected to device: VID=0x${status.vid}, PID=0x${status.pid}`);
            }
        } else {
            // Prefer detailed message if provided
            if (status.message) {
                statusText.textContent = status.message;
            } else {
                statusText.textContent = 'Auto-connecting to Stirling Engine...';
            }
            statusText.style.color = '#ffc107';
            if (startButton) startButton.disabled = true;
            if (stopButton) stopButton.disabled = true;
            
            if (status.error) {
                console.error('Connection error:', status.error);
                statusText.textContent = 'Auto-connect failed - ' + status.error;
                statusText.style.color = '#dc3545';
            }
        }
    }
    
    function updateSystemStatus(status) {
        if (!systemStatusBanner) {
            console.error('[UI] systemStatusBanner element not found!');
            return;
        }
        
        try {
            const statusTextEl = systemStatusBanner.querySelector('.status-text');
            if (!statusTextEl) {
                console.error('[UI] .status-text element not found in banner!');
                return;
            }
            
            if (status.connected) {
                // System is ONLINE
                console.log('[UI] Updating status to ONLINE');
                systemStatusBanner.className = 'system-status-banner online';
                statusTextEl.textContent = 'SYSTEM ONLINE';
                
                // Centered banner shows only the main text
            } else if (status.error) {
                // System is OFFLINE with error
                console.log('[UI] Updating status to OFFLINE (error:', status.error, ')');
                systemStatusBanner.className = 'system-status-banner offline';
                statusTextEl.textContent = 'SYSTEM OFFLINE';
            } else {
                // System is CONNECTING/SEARCHING
                // Show OFFLINE until device is actually connected (no 'connecting' text)
                console.log('[UI] Updating status to OFFLINE (connecting)');
                systemStatusBanner.className = 'system-status-banner offline';
                statusTextEl.textContent = 'SYSTEM OFFLINE';
            }
        } catch (e) {
            console.error('[UI] Error updating system status:', e);
        }
    }
    
    function updateSystemStatusWithData() {
        // No secondary text in the centered style
    }
    
    // Auto-connect function (called automatically by main process)
    async function attemptAutoConnect() {
        try {
            console.log('Attempting auto-connect to Stirling Engine device...');
            const result = await window.electronAPI.autoConnectStirling();
            
            if (result.success) {
                console.log('Successfully auto-connected to Stirling Engine on:', result.port);
                currentPort = result.port;
            } else {
                console.log('Auto-connect failed:', result.error);
                // The main process will keep trying automatically
            }
        } catch (error) {
            console.error('Error during auto-connect:', error);
            // The main process will keep trying automatically
        }
    }
    
    // Auto-connect to Stirling Engine device when page loads
    setTimeout(() => {
        attemptAutoConnect();
    }, 1000);
    
    // Admin Functions
    function openAdminWindow() {
        var passwordModal = document.getElementById('passwordModal');
        var passwordInput = document.getElementById('passwordInput');
        var passwordError = document.getElementById('passwordError');
        
        if (passwordModal) {
            passwordModal.classList.add('show');
            passwordInput.value = '';
            passwordError.style.display = 'none';
            passwordInput.focus();
        }
    }
    
    // Password modal handlers
    var passwordModal = document.getElementById('passwordModal');
    var passwordInput = document.getElementById('passwordInput');
    var passwordSubmitBtn = document.getElementById('passwordSubmitBtn');
    var passwordCancelBtn = document.getElementById('passwordCancelBtn');
    var passwordError = document.getElementById('passwordError');
    
    if (passwordSubmitBtn) {
        passwordSubmitBtn.addEventListener('click', function() {
            if (passwordInput.value === 'matrix123') {
                passwordModal.classList.remove('show');
                if (window.electronAPI) {
                    window.electronAPI.openAdminWindow();
                }
            } else {
                passwordError.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }
    
    if (passwordCancelBtn) {
        passwordCancelBtn.addEventListener('click', function() {
            passwordModal.classList.remove('show');
            passwordInput.value = '';
            passwordError.style.display = 'none';
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                passwordSubmitBtn.click();
            } else if (e.key === 'Escape') {
                passwordCancelBtn.click();
            }
        });
    }
    
    
});
