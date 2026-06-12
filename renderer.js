// This is the renderer process file
// It handles the user interface and Chart.js integration

// Ensure Chart.js is available before proceeding
if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded! Waiting...');
    // Wait for Chart.js
    let attempts = 0;
    const checkChart = setInterval(function () {
        attempts++;
        if (typeof Chart !== 'undefined') {
            clearInterval(checkChart);
            initializeApp();
        } else if (attempts > 50) {
            clearInterval(checkChart);
            console.error('Chart.js failed to load after 5 seconds!');
            alert('Error: Chart.js library failed to load. Please refresh the page.');
        }
    }, 100);
} else {
    // Chart.js is already available
    initializeApp();
}

function initializeApp() {
    // Check if DOM is already loaded
    if (document.readyState === 'loading') {
        // DOM is still loading, wait for it
        document.addEventListener('DOMContentLoaded', function () {
            initializeUI();
        });
    } else {
        // DOM is already loaded, initialize immediately
        initializeUI();
    }
}

function initializeUI() {
    // Wait for the page to load before running our code
    // DOMContentLoaded already handled in initializeApp

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
    const powerValueEl = document.getElementById('powerValue');
    const heaterElapsedTimeEl = document.getElementById('heaterElapsedTime');
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
    const csvToggleButton = document.getElementById('csvToggle');
    const calibrationButton = document.getElementById('calibrationButton');
    const calibrationModal = document.getElementById('calibrationModal');
    const calibrationValue = document.getElementById('calibrationValue');
    const zeroButton = document.getElementById('zeroButton');
    const doneButton = document.getElementById('doneButton');
    const themeSelector = document.getElementById('themeSelector');
    const workValueEl = document.getElementById('workValue');
    const workUnitSelect = document.getElementById('workUnit');
    let heaterOn = false;
    let currentTheme = 'dark';
    const chartCanvas = document.getElementById('temperatureChart');
    const pvCanvas = document.getElementById('pvChart');
    const pressureTimeCanvas = document.getElementById('pressureTimeChart');
    const volumeTimeCanvas = document.getElementById('volumeTimeChart');
    const tempRpmTimeCanvas = document.getElementById('tempRpmTimeChart');
    const pvContainer = document.getElementById('pvContainer');
    const pressureTimeContainer = document.getElementById('pressureTimeContainer');
    const volumeTimeContainer = document.getElementById('volumeTimeContainer');
    const tempRpmTimeContainer = document.getElementById('tempRpmTimeContainer');
    const timeSeriesModeSelect = document.getElementById('timeSeriesMode');

    // System status elements
    const systemStatusBanner = document.getElementById('systemStatusBanner');

    // Function to auto-resize input boxes based on their content
    function autoResizeInput(inputElement) {
        if (!inputElement) return;
        
        // Create a temporary span to measure text width
        const measureSpan = document.createElement('span');
        measureSpan.style.position = 'absolute';
        measureSpan.style.visibility = 'hidden';
        measureSpan.style.whiteSpace = 'nowrap';
        measureSpan.style.fontSize = window.getComputedStyle(inputElement).fontSize;
        measureSpan.style.fontFamily = window.getComputedStyle(inputElement).fontFamily;
        measureSpan.style.fontWeight = window.getComputedStyle(inputElement).fontWeight;
        document.body.appendChild(measureSpan);
        
        function updateWidth() {
            const value = inputElement.value || inputElement.placeholder || '0';
            measureSpan.textContent = value;
            const minWidth = parseFloat(window.getComputedStyle(inputElement).minWidth) || 64;
            const measuredWidth = measureSpan.offsetWidth;
            const padding = 20; // Extra padding for comfort
            const newWidth = Math.max(minWidth, measuredWidth + padding);
            inputElement.style.width = newWidth + 'px';
        }
        
        // Update width on input, change, and focus events
        inputElement.addEventListener('input', updateWidth);
        inputElement.addEventListener('change', updateWidth);
        inputElement.addEventListener('focus', updateWidth);
        
        // Initial width update
        updateWidth();
    }
    
    // Apply auto-resize to sweep inputs
    if (sweepStepEl) {
        autoResizeInput(sweepStepEl);
    }
    if (sweepIntervalEl) {
        autoResizeInput(sweepIntervalEl);
    }

    // Variables to store our data and chart
    let temperatureData = [];
    let timeLabels = [];
    let chart = null;
    let pvChart = null;
    let pressureChart = null;
    let volumeChart = null;
    let timeSeriesChart = null;
    let pvPoints = [];

    // Chart update throttling for better performance
    let chartUpdatePending = false;
    let pendingChartUpdate = null;
    let pressureTimeLabels = [];
    let pressureTimeValues = [];
    let volumeTimeLabels = [];
    let volumeTimeValues = [];

    // New time-series chart (4th graph): Time on X, Temperature or RPM on Y
    let timeSeriesLabels = [];
    let timeSeriesTempValues = [];
    let timeSeriesRpmValues = [];
    let timeSeriesMode = 'temperature'; // 'temperature' or 'rpm'
    let timeSeriesStartTimeMs = null;
    let lastTimeSeriesDrawMs = 0;
    let timeSeriesLastSampleMs = 0; // only add a new point every 2 seconds
    let timeSeriesPausedUntilMs = null; // when switching modes, wait before plotting
    let monitoringInterval = null;
    let dataPointCounter = 0;
    let lastPVUpdateMs = 0; // time of last PV data redraw
    let lastChartDrawMs = 0; // throttle chart redraws to ~20 FPS

    // Batch data packets for better performance
    let pendingDataPackets = [];
    let dataBatchInterval = null;

    // USB Serial Communication variables
    let isConnected = false;
    let heaterInitializedOnConnection = false;
    let currentPort = null;
    let stirlingParser = null;

    // Track calibration modal visibility and buffer incoming 0xAB packets
    let isCalibrationModalOpen = false;
    let calibrationDataBuffer = [];
    let shouldResetGraphsOnReconnect = false;

    // Track last valid RPM, Temperature and Power values (don't show 0)
    let lastValidRPM = null;
    let lastValidTemperature = null;
    let lastValidPower = null;
    let lastRpmTimestamp = null; // Track when last RPM value was received
    let rpmTimeoutInterval = null; // Timer to check for RPM timeout

    // Work display state (base unit: Joules)
    let currentWorkJoules = 0;
    let hasWorkValue = false;
    let currentWorkUnit = 'J';

    // Data storage for Stirling Engine
    let pressureData = [];
    let volumeData = [];
    let rpmData = [];
    let heaterTempData = [];
    let isCsvSaving = false;
    let csvRows = [];
    let csvFilePath = '';
    let lastCsvTemperature = '';
    let lastCsvRpm = '';
    let lastCsvPressure = '';
    let lastCsvVolume = '';

    // Heater cycle timer:
    // - Starts from 0 when heater turns ON
    // - Keeps counting even if heater turns OFF
    // - Resets to 0 next time heater turns ON
    let heaterCycleStartTimeMs = null;
    let lastHeaterElapsedMs = 0;

    function updateHeaterElapsedDisplay(seconds) {
        if (!heaterElapsedTimeEl) {
            return;
        }
        var safeSeconds = Number(seconds);
        if (!isFinite(safeSeconds) || safeSeconds < 0) {
            safeSeconds = 0;
        }
        // Show only one decimal place on the screen for easier reading
        heaterElapsedTimeEl.textContent = safeSeconds.toFixed(1);
    }

    function resetHeaterCycleTimer() {
        heaterCycleStartTimeMs = Date.now();
        lastHeaterElapsedMs = 0;
        updateHeaterElapsedDisplay(0);
    }

    // Asynchronous CSV logging queue
    let csvPacketQueue = [];
    let csvProcessingInterval = null;
    let csvPacketsProcessed = 0;

    function toMm3(valueInM3) {
        return valueInM3 * 1000000000;
    }

    function formatMm3(value) {
        if (value === null || value === undefined) {
            return '--';
        }
        var numberValue = Number(value);
        if (!isFinite(numberValue)) {
            return '--';
        }
        var rounded = Math.round(numberValue);
        return rounded.toLocaleString();
    }


    // Initialize the chart when the page loads (temperature chart removed)
    if (chartCanvas) {
        initializeChart();
    }
    initializePVChart();
    initializePressureChart();
    initializeVolumeChart();
    initializeTimeSeriesChart();

    // Always show charts
    try { if (pvContainer) pvContainer.style.display = 'block'; } catch (_) { }
    try { if (pressureTimeContainer) pressureTimeContainer.style.display = 'block'; } catch (_) { }
    try { if (volumeTimeContainer) volumeTimeContainer.style.display = 'block'; } catch (_) { }
    try { if (tempRpmTimeContainer) tempRpmTimeContainer.style.display = 'block'; } catch (_) { }

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
        // Set slider to 20 when app opens
        heaterSlider.value = 20;
        heaterValue.value = 20;
        updateSliderTip();
        updateHeaterSliderFill(20);
        let sliderDebounce = null;
        heaterSlider.addEventListener('input', function () {
            heaterValue.value = heaterSlider.value;
            updateSliderTip();
            updateHeaterSliderFill(heaterSlider.value);
            if (sliderDebounce) clearTimeout(sliderDebounce);
            sliderDebounce = setTimeout(function () {
                sendHeaterSetpoint();
            }, 150);
        });
        // Function to update heater value from input
        function updateHeaterFromInput() {
            var val = parseInt(heaterValue.value);
            if (isNaN(val)) {
                val = 20;
            }
            val = Math.max(20, Math.min(70, val));
            heaterValue.value = val;
            heaterSlider.value = val;
            updateSliderTip();
            updateHeaterSliderFill(val);
            if (sliderDebounce) clearTimeout(sliderDebounce);
            sliderDebounce = setTimeout(function () {
                sendHeaterSetpoint();
            }, 150);
        }
        
        // Allow user to type in the value input - only update on blur or Enter key
        heaterValue.addEventListener('blur', updateHeaterFromInput);
        heaterValue.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                updateHeaterFromInput();
                heaterValue.blur(); // Remove focus after Enter
            }
        });
        // Show tip on hover with cursor position
        heaterSlider.addEventListener('mousemove', function (e) {
            var row = heaterSlider.closest('.slider-row');
            if (row) {
                row.classList.add('active');
            }
            updateSliderTipFromEvent(e);
        });
        heaterSlider.addEventListener('mouseleave', function (e) {
            var row = heaterSlider.closest('.slider-row');
            if (row) {
                row.classList.remove('active');
            }
        });
    }
    if (heaterToggle) {
        // reflect initial state
        if (heaterOn) { try { heaterToggle.classList.add('active'); } catch (_) { } }
        heaterToggle.addEventListener('click', function () {
            var wasHeaterOn = heaterOn;
            heaterOn = !heaterOn;
            heaterToggle.textContent = heaterOn ? '● Heater ON' : '○ Heater OFF';
            try { heaterToggle.classList.toggle('active', heaterOn); } catch (_) { }
            sendHeaterMode();
            if (heaterOn) {
                sendHeaterSetpoint();
                // When user turns heater ON from the UI, start a new heater cycle timer
                if (!wasHeaterOn) {
                    resetHeaterCycleTimer();
                }
            }
        });
        // Set initial text based on state
        heaterToggle.textContent = heaterOn ? '● Heater ON' : '○ Heater OFF';
    }

    function sendHeaterSetpoint() {
        if (!window.electronAPI || !window.electronAPI.setHeater) return;
        var raw = parseInt(heaterSlider ? heaterSlider.value : 20);
        var val = Math.max(20, Math.min(70, isNaN(raw) ? 20 : raw));
        window.electronAPI.setHeater(val);
    }

    function sendHeaterMode() {
        if (!window.electronAPI || !window.electronAPI.setHeaterMode) return;
        window.electronAPI.setHeaterMode(heaterOn ? 1 : 0);
    }

    function applyHeaterSliderHardwareValue(rawValue) {
        if (!heaterSlider || !heaterValue) {
            return;
        }
        var val = parseInt(rawValue);
        if (!isFinite(val)) {
            val = 20;
        }
        val = Math.max(20, Math.min(70, val));
        heaterSlider.value = String(val);
        heaterValue.value = val;
        updateSliderTip();
        updateHeaterSliderFill(val);
    }

    function applyHeaterHardwareValue(rawValue) {
        var wasHeaterOn = heaterOn;
        heaterOn = rawValue ? true : false;
        if (heaterToggle) {
            heaterToggle.textContent = heaterOn ? '● Heater ON' : '○ Heater OFF';
            try {
                heaterToggle.classList.toggle('active', heaterOn);
            } catch (_) { }
        }
        // If hardware reports a transition from OFF to ON, reset the heater cycle timer
        if (!wasHeaterOn && heaterOn) {
            resetHeaterCycleTimer();
        }
    }

    function updateSliderTip() {
        if (!heaterSlider || !heaterTip) return;
        var min = parseInt(heaterSlider.min || 20);
        var max = parseInt(heaterSlider.max || 70);
        var val = parseInt(heaterSlider.value || 20);
        var percent = (val - min) / (max - min);
        var wrapper = heaterSlider.closest('.heater-slider-wrapper');
        if (wrapper) {
            var wrapperRect = wrapper.getBoundingClientRect();
            var x = percent * wrapperRect.width;
            heaterTip.style.left = x + 'px';
        } else {
            // Fallback to old method
            var row = heaterSlider.closest('.slider-row') || heaterSlider.parentElement;
            var rowRect = row.getBoundingClientRect();
            var sliderRect = heaterSlider.getBoundingClientRect();
            var x = (sliderRect.left - rowRect.left) + percent * sliderRect.width;
            heaterTip.style.left = x + 'px';
        }
        heaterTip.textContent = String(val);
    }

    function updateSliderTipFromEvent(e) {
        if (!heaterSlider || !heaterTip) return;
        var wrapper = heaterSlider.closest('.heater-slider-wrapper');
        if (wrapper) {
            var wrapperRect = wrapper.getBoundingClientRect();
            var mouseX = e.clientX - wrapperRect.left;
            var percent = Math.max(0, Math.min(1, mouseX / wrapperRect.width));
            var min = parseInt(heaterSlider.min || 20);
            var max = parseInt(heaterSlider.max || 70);
            var val = Math.round(min + percent * (max - min));
            var x = percent * wrapperRect.width;
            heaterTip.style.left = x + 'px';
            heaterTip.textContent = String(val);
        } else {
            // Fallback to old method
            var row = heaterSlider.closest('.slider-row') || heaterSlider.parentElement;
            var rowRect = row.getBoundingClientRect();
            var sliderRect = heaterSlider.getBoundingClientRect();
            var mouseX = e.clientX - sliderRect.left;
            var percent = Math.max(0, Math.min(1, mouseX / sliderRect.width));
            var min = parseInt(heaterSlider.min || 20);
            var max = parseInt(heaterSlider.max || 70);
            var val = Math.round(min + percent * (max - min));
            var x = (sliderRect.left - rowRect.left) + percent * sliderRect.width;
            heaterTip.style.left = x + 'px';
            heaterTip.textContent = String(val);
        }
    }

    // Aux slider events
    if (auxSlider && auxValue) {
        // Set slider to 0 when app opens
        auxSlider.value = 0;
        auxValue.value = 0;
        updateAuxTip();
        updateAuxSliderFill(0);
        let auxDebounce = null;
        auxSlider.addEventListener('input', function () {
            auxValue.value = auxSlider.value;
            updateAuxTip();
            updateAuxSliderFill(auxSlider.value);
            if (auxDebounce) clearTimeout(auxDebounce);
            auxDebounce = setTimeout(function () {
                sendAuxCommand();
            }, 150);
        });
        // Allow user to type in the value input
        auxValue.addEventListener('input', function () {
            var val = parseInt(auxValue.value);
            if (isNaN(val)) return;
            val = Math.max(0, Math.min(100, val));
            auxValue.value = val;
            auxSlider.value = val;
            updateAuxTip();
            updateAuxSliderFill(val);
            if (auxDebounce) clearTimeout(auxDebounce);
            auxDebounce = setTimeout(function () {
                sendAuxCommand();
            }, 150);
        });
        auxValue.addEventListener('blur', function () {
            var val = parseInt(auxValue.value);
            if (isNaN(val)) {
                val = 0;
            }
            val = Math.max(0, Math.min(100, val));
            auxValue.value = val;
            auxSlider.value = val;
            updateAuxTip();
            updateAuxSliderFill(val);
        });
        // Show tip on hover with cursor position
        auxSlider.addEventListener('mousemove', function (e) {
            var row = auxSlider.closest('.slider-row');
            if (row) {
                row.classList.add('active');
            }
            updateAuxTipFromEvent(e);
        });
        auxSlider.addEventListener('mouseleave', function (e) {
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
        var wrapper = auxSlider.closest('.slider-wrapper');
        if (wrapper) {
            var wrapperRect = wrapper.getBoundingClientRect();
            var x = percent * wrapperRect.width;
            auxTip.style.left = x + 'px';
        } else {
            // Fallback to old method
            var row = auxSlider.closest('.slider-row') || auxSlider.parentElement;
            var rowRect = row.getBoundingClientRect();
            var sliderRect = auxSlider.getBoundingClientRect();
            var x = (sliderRect.left - rowRect.left) + percent * sliderRect.width;
            auxTip.style.left = x + 'px';
        }
        auxTip.textContent = String(val);
    }

    function updateHeaterSliderFill(value) {
        var heaterFill = document.getElementById('heaterSliderFill');
        if (!heaterSlider || !heaterFill) return;
        var min = parseInt(heaterSlider.min || 20);
        var max = parseInt(heaterSlider.max || 70);
        var val = parseInt(value || 20);

        // Calculate percentage (0 to 1)
        var percent = (val - min) / (max - min);
        // Clamp between 0 and 1
        percent = Math.max(0, Math.min(1, percent));

        var percentageStr = (percent * 100) + '%';
        heaterFill.style.setProperty('--fill-percent', percentageStr);
    }

    function updateAuxSliderFill(value) {
        var auxFill = document.getElementById('auxSliderFill');
        if (!auxSlider || !auxFill) return;
        var min = parseInt(auxSlider.min || 0);
        var max = parseInt(auxSlider.max || 100);
        var val = parseInt(value || 0);

        // Calculate percentage (0 to 1)
        var percent = (val - min) / (max - min);
        // Clamp between 0 and 1
        percent = Math.max(0, Math.min(1, percent));

        var percentageStr = (percent * 100) + '%';
        auxFill.style.setProperty('--fill-percent', percentageStr);
    }

    function updateAuxTipFromEvent(e) {
        if (!auxSlider || !auxTip) return;
        var wrapper = auxSlider.closest('.slider-wrapper');
        if (wrapper) {
            var wrapperRect = wrapper.getBoundingClientRect();
            var mouseX = e.clientX - wrapperRect.left;
            var percent = Math.max(0, Math.min(1, mouseX / wrapperRect.width));
            var min = parseInt(auxSlider.min || 0);
            var max = parseInt(auxSlider.max || 100);
            var val = Math.round(min + percent * (max - min));
            var x = percent * wrapperRect.width;
            auxTip.style.left = x + 'px';
            auxTip.textContent = String(val);
        } else {
            // Fallback to old method
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
    }

    // Keep tips positioned on resize and resize charts
    window.addEventListener('resize', function () {
        updateSliderTip();
        updateAuxTip();
        // Resize charts to ensure proper display
        if (pvChart) {
            pvChart.resize();
        }
        if (pressureChart) {
            pressureChart.resize();
        }
        if (volumeChart) {
            volumeChart.resize();
        }
        if (timeSeriesChart) {
            timeSeriesChart.resize();
        }
    });

    function sendAuxCommand() {
        if (!window.electronAPI || !window.electronAPI.setAux) return;
        var val = Math.max(0, Math.min(100, parseInt(auxSlider ? auxSlider.value : 0)));
        window.electronAPI.setAux(val);
    }

    function applyAuxHardwareValue(rawValue) {
        if (!auxSlider || !auxValue) {
            return;
        }
        var val = parseInt(rawValue);
        if (!isFinite(val)) {
            val = 0;
        }
        val = Math.max(0, Math.min(100, val));
        auxSlider.value = String(val);
        auxValue.value = val;
        updateAuxTip();
        updateAuxSliderFill(val);
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
        sweepTimer = setInterval(function () {
            if (!auxSlider) return;
            let val = parseInt(auxSlider.value || 0);
            val += step * sweepDirection;
            if (val >= 100) { val = 100; sweepDirection = -1; }
            if (val <= 0) { val = 0; sweepDirection = 1; }
            auxSlider.value = String(val);
            auxValue.value = val;
            updateAuxTip();
            updateAuxSliderFill(val);
            sendAuxCommand();
        }, interval);
    }
    if (sweepToggle) { sweepToggle.addEventListener('click', handleSweepToggle); }
    if (csvToggleButton) {
        csvToggleButton.addEventListener('click', toggleCsvSaving);
        setCsvIndicator(false);
    }
    if (calibrationButton) {
        calibrationButton.addEventListener('click', handleCalibrationClick);
    }
    if (zeroButton) {
        zeroButton.addEventListener('click', handleZeroClick);
    }
    if (doneButton) {
        doneButton.addEventListener('click', handleDoneClick);
    }
    // Modal can only be closed by clicking the Done button
    // Removed click-outside and Escape key handlers so user must press Done
    if (adminButton) { adminButton.addEventListener('click', openAdminWindow); }

    function setCsvIndicator(active) {
        if (!csvToggleButton) {
            return;
        }
        csvToggleButton.classList.remove('csv-saving', 'csv-idle');
        if (active) {
            csvToggleButton.classList.add('csv-saving');
        } else {
            csvToggleButton.classList.add('csv-idle');
        }
    }

    function resetCsvState() {
        isCsvSaving = false;
        csvRows = [];
        csvFilePath = '';
        lastCsvTemperature = '';
        lastCsvRpm = '';
        lastCsvPressure = '';
        lastCsvVolume = '';
        csvPacketQueue = [];
        csvPacketsProcessed = 0;

        // Stop the async processing interval
        if (csvProcessingInterval) {
            clearInterval(csvProcessingInterval);
            csvProcessingInterval = null;
        }

        if (csvToggleButton) {
            csvToggleButton.textContent = 'Start CSV Save';
        }
        setCsvIndicator(false);
    }

    async function startCsvSaving() {
        if (!window.electronAPI || !window.electronAPI.chooseCsvPath) {
            alert('CSV save feature is not available.');
            return;
        }
        let dialogResult = null;
        try {
            dialogResult = await window.electronAPI.chooseCsvPath();
        } catch (e) {
            alert('Unable to open the save window. Please try again.');
            return;
        }
        if (!dialogResult || !dialogResult.success || !dialogResult.filePath) {
            return;
        }
        csvFilePath = dialogResult.filePath;
        // First column is now HeaterTimeSeconds (time since last heater ON, in seconds)
        csvRows = ['HeaterTimeSeconds,Pressure,Volume_mm3,Temperature,RPM'];
        lastCsvTemperature = '';
        lastCsvRpm = '';
        lastCsvPressure = '';
        lastCsvVolume = '';
        csvPacketQueue = [];
        csvPacketsProcessed = 0;
        isCsvSaving = true;

        // Start async processing of CSV queue
        startCsvAsyncProcessing();

        if (csvToggleButton) {
            csvToggleButton.textContent = 'Stop CSV Save';
        }
        setCsvIndicator(true);
    }

    function stopCsvSaving() {
        if (!isCsvSaving) {
            return;
        }

        // Stop the async processing interval
        if (csvProcessingInterval) {
            clearInterval(csvProcessingInterval);
            csvProcessingInterval = null;
        }

        // Process all remaining packets in the queue before saving
        while (csvPacketQueue.length > 0) {
            var packet = csvPacketQueue.shift();
            if (packet) {
                processCsvPacket(packet);
                csvPacketsProcessed++;
            }
        }

        if (!window.electronAPI || !window.electronAPI.saveCsv) {
            alert('CSV save feature is not available.');
            resetCsvState();
            return;
        }
        var rowsToWrite = csvRows.slice();
        var targetPath = csvFilePath;
        window.electronAPI.saveCsv(targetPath, rowsToWrite).then(function (result) {
            // CSV saved silently - no popup
            resetCsvState();
        }).catch(function (error) {
            // CSV save error - no popup, just reset state
            resetCsvState();
        });
    }

    async function toggleCsvSaving() {
        if (!isCsvSaving) {
            await startCsvSaving();
        } else {
            stopCsvSaving();
        }
    }

    function handleCalibrationClick() {
        // Send data with label M and value 1, just like other data
        if (window.electronAPI && window.electronAPI.sendCalibration) {
            window.electronAPI.sendCalibration().then(function (result) {
                // Data sent successfully - no need to show anything
                // The data will be processed just like incoming data
            }).catch(function (error) {
                // Silently handle errors - don't show popup
                console.warn('Calibration error:', error);
            });
        }
        showCalibrationModal();
    }

    function handleZeroClick() {
        // Handle Zero button click
        // Send data with label Z and value 1, just like other data
        if (window.electronAPI && window.electronAPI.sendZeroCalibration) {
            window.electronAPI.sendZeroCalibration().then(function (result) {
                // Data sent successfully - no need to show anything
                // The data will be processed just like incoming data
            }).catch(function (error) {
                // Silently handle errors - don't show popup
                console.warn('Zero calibration error:', error);
            });
        }
        // Note: Zero does NOT close the modal - you can click it multiple times
        // Only the Done button closes the modal
    }

    function handleDoneClick() {
        // Handle Done button click
        // Send data with label N and value 1, just like other data
        if (window.electronAPI && window.electronAPI.sendCalibrationDone) {
            window.electronAPI.sendCalibrationDone().then(function (result) {
                // Data sent successfully - no need to show anything
                // The data will be processed just like incoming data
            }).catch(function (error) {
                // Silently handle errors - don't show popup
                console.warn('Calibration done error:', error);
            });
        }
        // Close the modal - this hides the Zero and Done buttons
        closeCalibrationModal();
    }

    function closeCalibrationModal() {
        // Hide the calibration modal
        if (calibrationModal) {
            calibrationModal.classList.remove('show');
        }
        isCalibrationModalOpen = false;
    }

    function showCalibrationModal() {
        if (calibrationModal) {
            calibrationModal.classList.add('show');
        }
        isCalibrationModalOpen = true;
        calibrationDataBuffer = [];
        if (calibrationValue) {
            calibrationValue.value = '';
            calibrationValue.placeholder = 'Waiting for data...';
        }
    }

    // Parse calibration data packets:
    //  - [0xAB, 0xAB, data1, data2, 0xAB, 0xAB] -> update text box
    //  - [0xA1, 0xA1, data, 0xA1, 0xA1]        -> close modal when data == 1
    //  - [0xA2, 0xA2, data, 0xA2, 0xA2]        -> open modal when data == 1
    //  - [0xC1, 0xC1, data, 0xC1, 0xC1]        -> update Aux slider
    //  - [0xC2, 0xC2, data, 0xC2, 0xC2]        -> update heater temperature slider
    //  - [0xEE, 0xEE, data, 0xEE, 0xEE]        -> update heater ON/OFF button
    function parseCalibrationData(bytes) {
        // Convert bytes to array if needed
        const dataArray = Array.isArray(bytes) ? bytes : Array.from(bytes);

        // Add to buffer
        calibrationDataBuffer = calibrationDataBuffer.concat(dataArray);

        // Look for complete packets
        while (calibrationDataBuffer.length >= 5) {
            // Find the start marker (either 0xAB, 0xA1, or 0xA2 pairs)
            let startIndex = -1;
            let headerType = null;
            for (let i = 0; i <= calibrationDataBuffer.length - 5; i++) {
                const first = calibrationDataBuffer[i];
                const second = calibrationDataBuffer[i + 1];
                if (first === 0xAB && second === 0xAB) {
                    startIndex = i;
                    headerType = 'AB';
                    break;
                }
                if (first === 0xA1 && second === 0xA1) {
                    startIndex = i;
                    headerType = 'A1';
                    break;
                }
                if (first === 0xA2 && second === 0xA2) {
                    startIndex = i;
                    headerType = 'A2';
                    break;
                }
                if (first === 0xC1 && second === 0xC1) {
                    startIndex = i;
                    headerType = 'C1';
                    break;
                }
                if (first === 0xC2 && second === 0xC2) {
                    startIndex = i;
                    headerType = 'C2';
                    break;
                }
                if (first === 0xEE && second === 0xEE) {
                    startIndex = i;
                    headerType = 'EE';
                    break;
                }
            }

            if (startIndex === -1) {
                // No start marker found, keep only the last few bytes
                calibrationDataBuffer = calibrationDataBuffer.slice(-5);
                break;
            }

            const requiresSixBytes = headerType === 'AB';
            const requiredLength = requiresSixBytes ? 6 : 5;

            // Check if we have enough bytes for a complete packet
            if (calibrationDataBuffer.length < startIndex + requiredLength) {
                // Not enough bytes yet, keep from start marker
                calibrationDataBuffer = calibrationDataBuffer.slice(startIndex);
                break;
            }

            // Determine footer positions
            let footerFirstIndex = requiresSixBytes ? startIndex + 4 : startIndex + 3;
            let footerSecondIndex = requiresSixBytes ? startIndex + 5 : startIndex + 4;
            const footerFirst = calibrationDataBuffer[footerFirstIndex];
            const footerSecond = calibrationDataBuffer[footerSecondIndex];

            if (headerType === 'AB') {
                if (footerFirst === 0xAB && footerSecond === 0xAB) {
                    const dataByte1 = calibrationDataBuffer[startIndex + 2];
                    const dataByte2 = calibrationDataBuffer[startIndex + 3];

                    let intValue = (dataByte1 << 8) | dataByte2;
                    if (intValue >= 0x8000) {
                        intValue = intValue - 0x10000;
                    }

                    if (calibrationValue) {
                        calibrationValue.value = intValue.toString();
                    }

                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + requiredLength);
                } else {
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + 1);
                }
            } else if (headerType === 'A1') {
                if (footerFirst === 0xA1 && footerSecond === 0xA1) {
                    const dataByte = calibrationDataBuffer[startIndex + 2];

                    if (dataByte === 1) {
                        closeCalibrationModal();
                        calibrationDataBuffer = [];
                        if (calibrationValue) {
                            calibrationValue.placeholder = 'Calibration done';
                            calibrationValue.value = '';
                        }
                        break;
                    } else {
                        calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + requiredLength);
                    }
                } else {
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + 1);
                }
            } else if (headerType === 'A2') {
                if (footerFirst === 0xA2 && footerSecond === 0xA2) {
                    const dataByte = calibrationDataBuffer[startIndex + 2];

                    if (dataByte === 1) {
                        showCalibrationModal();
                        calibrationDataBuffer = [];
                        break;
                    } else {
                        calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + requiredLength);
                    }
                } else {
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + 1);
                }
            } else if (headerType === 'C1') {
                if (footerFirst === 0xC1 && footerSecond === 0xC1) {
                    const dataByte = calibrationDataBuffer[startIndex + 2];
                    applyAuxHardwareValue(dataByte);
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + requiredLength);
                } else {
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + 1);
                }
            } else if (headerType === 'C2') {
                if (footerFirst === 0xC2 && footerSecond === 0xC2) {
                    const dataByte = calibrationDataBuffer[startIndex + 2];
                    applyHeaterSliderHardwareValue(dataByte);
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + requiredLength);
                } else {
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + 1);
                }
            } else if (headerType === 'EE') {
                if (footerFirst === 0xEE && footerSecond === 0xEE) {
                    const dataByte = calibrationDataBuffer[startIndex + 2];
                    applyHeaterHardwareValue(dataByte);
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + requiredLength);
                } else {
                    calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + 1);
                }
            } else {
                calibrationDataBuffer = calibrationDataBuffer.slice(startIndex + 1);
            }
        }
    }

    // Start async processing of CSV queue
    function startCsvAsyncProcessing() {
        if (csvProcessingInterval) {
            return; // Already running
        }

        // Process queue every 50ms (20 times per second) - fast enough to not lose data
        csvProcessingInterval = setInterval(function () {
            processCsvQueue();
        }, 50);
    }

    // Process packets from the queue asynchronously
    function processCsvQueue() {
        if (!isCsvSaving || csvPacketQueue.length === 0) {
            return;
        }

        // Process up to 100 packets at a time to avoid blocking
        var batchSize = 100;
        var processed = 0;

        while (csvPacketQueue.length > 0 && processed < batchSize) {
            var packet = csvPacketQueue.shift();
            if (packet) {
                processCsvPacket(packet);
                csvPacketsProcessed++;
                processed++;
            }
        }
    }

    // Quick function to add packet to queue (non-blocking)
    function recordCsvPacket(parsedData) {
        if (!isCsvSaving || !parsedData) {
            return;
        }

        // Quickly update last known values (very fast operation)
        // Only update if values are valid finite numbers
        if (typeof parsedData.rpm === 'number' && parsedData.rpm > 0) {
            lastCsvRpm = parsedData.rpm;
        }
        if (typeof parsedData.heaterTemperature === 'number' && parsedData.heaterTemperature > 0) {
            lastCsvTemperature = parsedData.heaterTemperature;
        }
        if (Array.isArray(parsedData.pressureReadings) && parsedData.pressureReadings.length > 0) {
            var pressureValue = Number(parsedData.pressureReadings[0]);
            // Only store valid finite pressure values
            if (isFinite(pressureValue)) {
                lastCsvPressure = pressureValue;
            }
        }
        if (Array.isArray(parsedData.volumeReadings) && parsedData.volumeReadings.length > 0) {
            var volumeValue = Number(parsedData.volumeReadings[0]);
            // Only store valid finite volume values
            if (isFinite(volumeValue)) {
                lastCsvVolume = volumeValue;
            }
        }

        // Check if this packet has data worth saving
        var hasPressureVolume = Array.isArray(parsedData.pressureReadings) && parsedData.pressureReadings.length > 0 &&
            Array.isArray(parsedData.volumeReadings) && parsedData.volumeReadings.length > 0;
        var hasTemperatureRpm = (typeof parsedData.heaterTemperature === 'number' && parsedData.heaterTemperature > 0) ||
            (typeof parsedData.rpm === 'number' && parsedData.rpm > 0);

        // Attach heater elapsed time (seconds since last heater ON) to this packet
        if (heaterCycleStartTimeMs !== null) {
            var nowMsForCsv = Date.now();
            var elapsedMsForCsv = nowMsForCsv - heaterCycleStartTimeMs;
            if (elapsedMsForCsv < 0) {
                elapsedMsForCsv = 0;
            }
            parsedData.heaterElapsedSeconds = elapsedMsForCsv / 1000;
        } else {
            // If we do not have a start time yet, store 0 seconds
            parsedData.heaterElapsedSeconds = 0;
        }

        if (hasPressureVolume || hasTemperatureRpm) {
            // Add to queue for async processing (very fast, non-blocking)
            csvPacketQueue.push(parsedData);

            // Prevent queue from growing too large (keep last 10000 packets)
            if (csvPacketQueue.length > 10000) {
                csvPacketQueue.shift(); // Remove oldest if queue too large
            }
        }
    }

    // Process a single packet and add to CSV rows (called asynchronously)
    function processCsvPacket(parsedData) {
        if (!parsedData) {
            return;
        }

        // Check what data we have in this packet
        var hasPressureVolume = Array.isArray(parsedData.pressureReadings) && parsedData.pressureReadings.length > 0 &&
            Array.isArray(parsedData.volumeReadings) && parsedData.volumeReadings.length > 0;
        var hasTemperatureRpm = (typeof parsedData.heaterTemperature === 'number' && parsedData.heaterTemperature > 0) ||
            (typeof parsedData.rpm === 'number' && parsedData.rpm > 0);

        // Only log packets that have pressure/volume data (PV packets)
        // Don't log RT packets that don't have pressure data
        if (!hasPressureVolume) {
            return;
        }

        // Get heater time in seconds (time since last heater ON)
        var heaterTimeSeconds = 0;
        if (typeof parsedData.heaterElapsedSeconds === 'number' && isFinite(parsedData.heaterElapsedSeconds) && parsedData.heaterElapsedSeconds >= 0) {
            heaterTimeSeconds = parsedData.heaterElapsedSeconds;
        }
        var heaterTimeText = heaterTimeSeconds.toFixed(3);

        // Get pressure and volume values from the packet
        var pressureValue = Number(parsedData.pressureReadings[0]);
        var volumeValue = Number(parsedData.volumeReadings[0]);

        // Validate that values are finite numbers (reject NaN, Infinity, etc.)
        if (!isFinite(pressureValue) || !isFinite(volumeValue)) {
            // Invalid pressure or volume, skip this packet
            return;
        }

        // Get temperature and RPM values (use last known if available)
        var temperatureValue = '';
        var rpmValue = '';
        if (hasTemperatureRpm) {
            temperatureValue = (typeof parsedData.heaterTemperature === 'number' && parsedData.heaterTemperature > 0) ? parsedData.heaterTemperature : lastCsvTemperature;
            rpmValue = (typeof parsedData.rpm === 'number' && parsedData.rpm > 0) ? parsedData.rpm : lastCsvRpm;
        } else {
            temperatureValue = lastCsvTemperature;
            rpmValue = lastCsvRpm;
        }

        // Format values for CSV
        var pressureText = (pressureValue === '' || pressureValue === null || pressureValue === undefined) ? '' : String(pressureValue);
        var volumeText = (volumeValue === '' || volumeValue === null || volumeValue === undefined) ? '' : Number(volumeValue).toFixed(2);
        var temperatureText = (temperatureValue === '' || temperatureValue === null || temperatureValue === undefined) ? '' : String(temperatureValue);
        var rpmText = (rpmValue === '' || rpmValue === null || rpmValue === undefined) ? '' : String(rpmValue);

        // Add to CSV rows
        // First column: heater time in seconds since last heater ON
        csvRows.push(heaterTimeText + ',' + pressureText + ',' + volumeText + ',' + temperatureText + ',' + rpmText);
    }

    // Theme selector
    if (themeSelector) {
        themeSelector.addEventListener('change', function (e) {
            currentTheme = e.target.value;
            updateChartTheme(currentTheme);
        });
        // Initialize theme on page load
        setTimeout(function () {
            updateChartTheme(currentTheme);
        }, 100);
    }

    // Time series mode selector (Temperature vs RPM)
    if (timeSeriesModeSelect) {
        timeSeriesModeSelect.addEventListener('change', function () {
            // Set new mode
            timeSeriesMode = timeSeriesModeSelect.value === 'rpm' ? 'rpm' : 'temperature';

            // Clear existing time-series data
            timeSeriesLabels = [];
            timeSeriesTempValues = [];
            timeSeriesRpmValues = [];
            timeSeriesStartTimeMs = null;
            timeSeriesLastSampleMs = 0;

            // Pause plotting for 2 seconds before starting new mode
            timeSeriesPausedUntilMs = Date.now() + 2000;
            lastTimeSeriesDrawMs = 0;

            // Immediately clear the chart display
            updateTimeSeriesChartDataset();
        });
    }

    // Set up USB serial communication listeners
    setupSerialListeners();

    // Immediately sync current connection status once UI is ready
    if (window.electronAPI && window.electronAPI.getConnectionStatus) {
        window.electronAPI.getConnectionStatus().then(function (status) {
            updateConnectionStatus(status);
        }).catch(function (e) {
            try { console.error('[UI] getConnectionStatus error:', e && e.message ? e.message : e); } catch (e2) { }
        });
    }

    // Periodically refresh connection status continuously to catch any missed events
    (function () {
        var timerId = setInterval(function () {
            if (!window.electronAPI || !window.electronAPI.getConnectionStatus) {
                return;
            }
            window.electronAPI.getConnectionStatus().then(function (status) {
                try {
                } catch (e) { }
                updateConnectionStatus(status);
            }).catch(function (e) {
                console.error('[UI] Error polling connection status:', e);
            });
        }, 2000); // Poll every 2 seconds as backup
    })();

    // Function to update chart theme
    function updateChartTheme(theme) {
        // Update body class for theme
        if (document.body) {
            if (theme === 'dark') {
                document.body.classList.add('theme-dark');
                document.body.classList.remove('theme-light');
            } else {
                document.body.classList.add('theme-light');
                document.body.classList.remove('theme-dark');
            }
        }
        
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

        if (timeSeriesChart) {
            timeSeriesChart.options.scales.x.grid.color = gridColor;
            timeSeriesChart.options.scales.y.grid.color = gridColor;
            timeSeriesChart.options.scales.x.ticks.color = textColor;
            timeSeriesChart.options.scales.y.ticks.color = textColor;
            timeSeriesChart.options.scales.x.title.color = textColor;
            timeSeriesChart.options.scales.y.title.color = textColor;
            timeSeriesChart.options.plugins.legend.labels.color = textColor;
            timeSeriesChart.update('none');
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

    // Update the work display text based on selected unit
    function updateWorkDisplay() {
        if (!workValueEl || !workUnitSelect) {
            return;
        }

        // Make sure the select shows the current unit
        workUnitSelect.value = currentWorkUnit;

        if (!hasWorkValue) {
            workValueEl.textContent = '--';
            return;
        }

        var valueToShow = currentWorkJoules;

        // Convert from Joules to selected unit
        if (currentWorkUnit === 'mJ') {
            valueToShow = currentWorkJoules * 1000; // 1 J = 1000 mJ
        } else if (currentWorkUnit === 'uJ') {
            valueToShow = currentWorkJoules * 1000000; // 1 J = 1,000,000 µJ
        }

        // Show with 2 decimal places
        workValueEl.textContent = valueToShow.toFixed(2);
    }

    // When user changes the unit, update the number
    if (workUnitSelect) {
        workUnitSelect.addEventListener('change', function () {
            currentWorkUnit = workUnitSelect.value;
            updateWorkDisplay();
        });
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
                layout: {
                    padding: {
                        left: 20,
                        right: 20,
                        top: 20,
                        bottom: 30
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Volume (mm³)',
                            font: { size: 14, weight: 'bold' },
                            padding: { top: 10, bottom: 5 }
                        },
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: {
                            callback: function (value) {
                                return formatMm3(toMm3(value));
                            },
                            maxRotation: 45,
                            minRotation: 45,
                            padding: 10,
                            autoSkip: true,
                            maxTicksLimit: 8
                        },
                        position: 'bottom',
                        grace: '5%'
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Pressure',
                            font: { size: 14, weight: 'bold' },
                            padding: { left: 10, right: 5 }
                        },
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: {
                            padding: 10,
                            autoSkip: true,
                            maxTicksLimit: 8
                        },
                        position: 'left',
                        grace: '5%'
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: { size: 14, weight: 'bold' },
                            padding: 10,
                            boxWidth: 15,
                            boxHeight: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                var pressureValue = context.raw ? context.raw.y : context.parsed.y;
                                var volumeValue = context.raw ? context.raw.x : context.parsed.x;
                                var mm3Value = toMm3(volumeValue);
                                return 'Volume: ' + formatMm3(mm3Value) + ' mm³, Pressure: ' + pressureValue;
                            }
                        }
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
                layout: {
                    padding: {
                        left: 15,
                        right: 15,
                        top: 15,
                        bottom: 15
                    }
                },
                scales: {
                    x: { 
                        title: { display: false }, 
                        ticks: { display: false, padding: 5 }, 
                        grid: { display: false } 
                    },
                    y: { 
                        title: { 
                            display: true, 
                            text: 'Pressure',
                            padding: { top: 5, bottom: 5 }
                        }, 
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: {
                            padding: 10,
                            autoSkip: true
                        },
                        grace: '5%'
                    }
                },
                plugins: { 
                    legend: { 
                        display: true, 
                        position: 'top',
                        padding: { bottom: 10 }
                    } 
                }
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
                layout: {
                    padding: {
                        left: 15,
                        right: 15,
                        top: 15,
                        bottom: 15
                    }
                },
                scales: {
                    x: { 
                        title: { display: false }, 
                        ticks: { display: false, padding: 5 }, 
                        grid: { display: false } 
                    },
                    y: {
                        title: { 
                            display: true, 
                            text: 'Volume (mm³)',
                            padding: { top: 5, bottom: 5 }
                        },
                        grid: { color: 'rgba(0,0,0,0.1)' },
                        ticks: {
                            callback: function (value) {
                                return formatMm3(value);
                            },
                            padding: 10,
                            autoSkip: true
                        },
                        grace: '5%'
                    }
                },
                plugins: {
                    legend: { 
                        display: true, 
                        position: 'top',
                        padding: { bottom: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                var value = context.parsed.y;
                                return 'Volume: ' + formatMm3(value) + ' mm³';
                            }
                        }
                    }
                }
            }
        });
    }

    // New 4th graph: Time vs Temperature or RPM (user selectable)
    function initializeTimeSeriesChart() {
        if (!tempRpmTimeCanvas) {
            return;
        }

        const ctx = tempRpmTimeCanvas.getContext('2d');

        timeSeriesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeSeriesLabels,
                datasets: [{
                    label: 'Temperature (°C)',
                    data: timeSeriesTempValues,
                    borderColor: '#fd7e14', // orange
                    backgroundColor: 'rgba(253, 126, 20, 0.15)',
                    borderWidth: 2,
                    pointRadius: 1.5,
                    tension: 0.2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 15,
                        right: 15,
                        top: 15,
                        bottom: 20
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time (s)',
                            padding: { top: 5, bottom: 5 }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            padding: 8,
                            autoSkip: true
                        },
                        grace: '2%'
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Temperature (°C)',
                            padding: { top: 5, bottom: 5 }
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            padding: 10,
                            autoSkip: true
                        },
                        grace: '5%'
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        padding: { bottom: 10 }
                    }
                }
            }
        });
    }

    // Helper: update which dataset (Temperature or RPM) is shown on the time-series chart
    function updateTimeSeriesChartDataset() {
        if (!timeSeriesChart) {
            return;
        }

        if (timeSeriesMode === 'rpm') {
            // Show RPM on Y axis
            timeSeriesChart.data.datasets[0].label = 'RPM';
            timeSeriesChart.data.datasets[0].data = timeSeriesRpmValues;
            timeSeriesChart.data.datasets[0].borderColor = '#ff5733'; // reddish orange
            timeSeriesChart.data.datasets[0].backgroundColor = 'rgba(255, 87, 51, 0.15)';
            timeSeriesChart.options.scales.y.title.text = 'RPM';
        } else {
            // Default: Temperature on Y axis
            timeSeriesChart.data.datasets[0].label = 'Temperature (°C)';
            timeSeriesChart.data.datasets[0].data = timeSeriesTempValues;
            timeSeriesChart.data.datasets[0].borderColor = '#fd7e14';
            timeSeriesChart.data.datasets[0].backgroundColor = 'rgba(253, 126, 20, 0.15)';
            timeSeriesChart.options.scales.y.title.text = 'Temperature (°C)';
        }

        // Always use the same time labels on X axis
        timeSeriesChart.data.labels = timeSeriesLabels;

        // Redraw chart without animation for faster updates
        timeSeriesChart.update('none');
    }

    // Update P–V chart with a parsed packet
    function updatePVChart(parsed) {
        if (!pvChart || !parsed) {
            if (!pvChart) {
                console.warn('[UI] pvChart not initialized, cannot update');
            }
            return;
        }

        // Ensure chart is ready
        if (!pvChart.data || !pvChart.data.datasets || !pvChart.data.datasets[0]) {
            console.warn('[UI] Chart not ready, initializing...');
            return;
        }
        if (!parsed.pressureReadings || parsed.pressureReadings.length === 0 || !parsed.volumeReadings || parsed.volumeReadings.length === 0) {
            return; // only handle PV packets
        }

        var n = Math.min(parsed.pressureReadings.length, parsed.volumeReadings.length);

        // Add points to the chart
        for (var i = 0; i < n; i++) {
            var volumeM3 = parsed.volumeReadings[i] * 1e-9; // convert mm^3 to m^3
            pvPoints.push({ x: volumeM3, y: parsed.pressureReadings[i] });
        }

        // Keep only last 250 points (reduced for better performance)
        if (pvPoints.length > 250) {
            pvPoints = pvPoints.slice(pvPoints.length - 250);
        }

        // Always update chart data, even if we don't redraw immediately
        if (pvChart.data && pvChart.data.datasets && pvChart.data.datasets[0]) {
            pvChart.data.datasets[0].data = pvPoints;
        } else {
            console.warn('[UI] Chart data structure not ready');
            return;
        }

        // Force chart update - ensure it redraws when data arrives
        var nowMs = Date.now();
        // Update more frequently (50ms = 20 FPS) to ensure smooth plotting
        if (nowMs - lastChartDrawMs > 50) {
            lastChartDrawMs = nowMs;
            // Update chart immediately, don't wait for requestAnimationFrame
            try {
                if (pvChart) {
                    pvChart.update('none');
                }
                if (pressureChart) {
                    pressureChart.update('none');
                }
                if (volumeChart) {
                    volumeChart.update('none');
                }
                if (timeSeriesChart) {
                    timeSeriesChart.update('none');
                }
            } catch (e) {
                console.warn('[UI] Chart update error:', e);
            }
        } else {
            // Even if throttled, schedule an update for the next frame
            if (!chartUpdatePending) {
                chartUpdatePending = true;
                requestAnimationFrame(function () {
                    try {
                        if (pvChart) pvChart.update('none');
                        if (pressureChart) pressureChart.update('none');
                        if (volumeChart) volumeChart.update('none');
                        if (timeSeriesChart) timeSeriesChart.update('none');
                    } catch (e) {
                        console.warn('[UI] Chart update error:', e);
                    }
                    chartUpdatePending = false;
                });
            }
        }

        // Compute work via polygon area (shoelace) - only update every 500ms to reduce lag
        var nowMs = Date.now();
        if (nowMs - lastPVUpdateMs > 500) {
            lastPVUpdateMs = nowMs;
            try {
                // Use only the last 51 points to get one complete cycle
                // Pressure is already in Pascal (Pa), volume is in m³
                // So area in Pa·m³ = Joules (no conversion needed)
                var pointsForWork = pvPoints;
                if (pvPoints.length > 51) {
                    // Take only the last 51 points (one complete cycle)
                    pointsForWork = pvPoints.slice(pvPoints.length - 51);
                }
                
                // Need at least 3 points to calculate area
                if (pointsForWork.length >= 3) {
                    // computePolygonArea returns area in Pa·m³ = Joules
                    // (pressure is in Pascal, volume is in m³)
                    const workJoules = computePolygonArea(pointsForWork);
                    
                    currentWorkJoules = workJoules;
                    hasWorkValue = true;
                    updateWorkDisplay();
                } else {
                    // Not enough points yet
                    currentWorkJoules = 0;
                    hasWorkValue = false;
                    updateWorkDisplay();
                }
            } catch (_) { }
        }

        // Time series updates (one reading per PV packet) - hide x-axis labels
        pressureTimeLabels.push('');
        volumeTimeLabels.push('');
        if (parsed.pressureReadings.length > 0) {
            pressureTimeValues.push(parsed.pressureReadings[0]);
        }
        if (parsed.volumeReadings.length > 0) {
            volumeTimeValues.push(Number(parsed.volumeReadings[0]));
        }
        // Keep last 100 samples (reduced for better performance)
        if (pressureTimeLabels.length > 100) { pressureTimeLabels.shift(); pressureTimeValues.shift(); }
        if (volumeTimeLabels.length > 100) { volumeTimeLabels.shift(); volumeTimeValues.shift(); }
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
        monitoringInterval = setInterval(function () {
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
        // Listen for connection status updates
        if (window.electronAPI) {
            window.electronAPI.onConnectionStatus((event, status) => {
                try {
                    // Status updates handled silently
                } catch (e) {
                    console.error('[UI] Error in connection-status handler:', e);
                }
                var dbg = document.getElementById('debugStatus');
                if (dbg) { dbg.textContent = 'ON'; }
                updateConnectionStatus(status);
            });

            // Listen for parsed data from worker thread (processed on separate CPU core)
            // Batch packets together to reduce UI lag on Linux
            if (window.electronAPI.onStirlingData) {
                // Function to check if RPM timeout has occurred (4 seconds without new value)
                function checkRpmTimeout() {
                    if (rpmValueEl && lastRpmTimestamp !== null) {
                        var timeSinceLastRpm = Date.now() - lastRpmTimestamp;
                        if (timeSinceLastRpm >= 4000) {
                            // 4 seconds have passed, set RPM to zero
                            rpmValueEl.textContent = '0';
                            lastValidRPM = null;
                            lastRpmTimestamp = null;
                        }
                    } else if (rpmValueEl && lastRpmTimestamp === null && lastValidRPM === null) {
                        // No RPM data ever received, show zero
                        rpmValueEl.textContent = '0';
                    }
                }
                
                // Set up interval to check RPM timeout every second
                if (rpmTimeoutInterval) {
                    clearInterval(rpmTimeoutInterval);
                }
                rpmTimeoutInterval = setInterval(checkRpmTimeout, 1000);
                
                // Process batched data packets every 100ms (10 times per second)
                function processBatchedData() {
                    if (pendingDataPackets.length === 0) return;

                    // Get latest values for immediate display
                    var latestRPM = null;
                    var latestTemp = null;
                    var latestPower = null;
                    var latestPVPackets = [];

                    // Process all pending packets
                    for (var i = 0; i < pendingDataPackets.length; i++) {
                        var pkt = pendingDataPackets[i];
                        if (pkt && !pkt.__worker_error) {
                            // Collect latest RPM and temp (only if > 0 to avoid showing 0)
                            if (typeof pkt.rpm === 'number' && pkt.rpm > 0) {
                                latestRPM = pkt.rpm;
                                lastValidRPM = pkt.rpm; // Store last valid value
                                lastRpmTimestamp = Date.now(); // Update timestamp when RPM is received
                            }
                            if (typeof pkt.heaterTemperature === 'number' && pkt.heaterTemperature > 0) {
                                latestTemp = pkt.heaterTemperature;
                                lastValidTemperature = pkt.heaterTemperature; // Store last valid value
                            }
                            if (typeof pkt.power === 'number' && pkt.power > 0) {
                                latestPower = pkt.power;
                                lastValidPower = pkt.power;
                            }
                            // Collect PV packets for batch chart update
                            if (Array.isArray(pkt.pressureReadings) && pkt.pressureReadings.length > 0 &&
                                Array.isArray(pkt.volumeReadings) && pkt.volumeReadings.length > 0) {
                                latestPVPackets.push(pkt);
                            }
                        }
                    }

                    // Update displays with latest values (only if we have valid data, otherwise keep last valid)
                    if (latestRPM !== null && latestRPM > 0 && rpmValueEl) {
                        rpmValueEl.textContent = String(latestRPM);
                    } else if (lastValidRPM !== null && rpmValueEl && lastRpmTimestamp !== null) {
                        // Show last valid RPM (checkRpmTimeout will handle timeout)
                        var timeSinceLastRpm = Date.now() - lastRpmTimestamp;
                        if (timeSinceLastRpm < 4000) {
                            rpmValueEl.textContent = String(lastValidRPM);
                        }
                        // If timeout, checkRpmTimeout will set it to zero
                    }
                    // Check if RPM timeout has occurred (4 seconds without new value)
                    checkRpmTimeout();
                    if (latestTemp !== null && latestTemp > 0 && tempValueEl) {
                        tempValueEl.textContent = String(latestTemp);
                    } else if (lastValidTemperature !== null && tempValueEl) {
                        // Keep showing last valid temperature instead of 0
                        tempValueEl.textContent = String(lastValidTemperature);
                    }
                    if (latestPower !== null && latestPower > 0 && powerValueEl) {
                        powerValueEl.textContent = latestPower.toFixed(2);
                    } else if (lastValidPower !== null && powerValueEl) {
                        powerValueEl.textContent = lastValidPower.toFixed(2);
                    }

                // Update heater elapsed time display each time we handle new temperature data
                // Time starts from 0 when heater turns ON and keeps going until the next ON
                if (heaterCycleStartTimeMs !== null) {
                    var nowMsForDisplay = Date.now();
                    lastHeaterElapsedMs = nowMsForDisplay - heaterCycleStartTimeMs;
                    if (lastHeaterElapsedMs < 0) {
                        lastHeaterElapsedMs = 0;
                    }
                    var elapsedSecondsForDisplay = lastHeaterElapsedMs / 1000;
                    updateHeaterElapsedDisplay(elapsedSecondsForDisplay);
                }

                    // Batch update PV chart (only once per batch)
                    if (latestPVPackets.length > 0) {
                        // Process all PV packets together
                        for (var j = 0; j < latestPVPackets.length; j++) {
                            updatePVChart(latestPVPackets[j]);
                        }
                        // Force a chart update after processing all packets to ensure it redraws
                        if (pvChart && pvChart.data && pvChart.data.datasets && pvChart.data.datasets[0]) {
                            try {
                                pvChart.update('none');
                            } catch (e) {
                                console.warn('[UI] Error updating chart after batch:', e);
                            }
                        }
                    }

                    // Handle data for CSV logging - process ALL packets to avoid data loss
                    // For UI statistics, we only need the latest, but CSV needs everything
                    if (pendingDataPackets.length > 0) {
                        // Process all packets for CSV logging
                        var validPackets = [];
                        for (var k = 0; k < pendingDataPackets.length; k++) {
                            if (pendingDataPackets[k] && !pendingDataPackets[k].__worker_error) {
                                validPackets.push(pendingDataPackets[k]);
                            }
                        }
                        if (validPackets.length > 0) {
                            handleStirlingData(validPackets);
                        }
                    }

                    // Clear batch
                    var processedCount = pendingDataPackets.length;
                    pendingDataPackets = [];

                    // Batch processed silently
                }

                // Start batch processing interval (100ms = 10 updates per second)
                // Ensure variables are initialized
                if (typeof pendingDataPackets === 'undefined') {
                    pendingDataPackets = [];
                }
                if (!dataBatchInterval) {
                    dataBatchInterval = setInterval(processBatchedData, 100);
                }

                // Accumulate packets into batch
                window.electronAPI.onStirlingData(function (event, parsedPackets) {
                    try {
                        // parsedPackets is already an array from the worker thread
                        if (!parsedPackets) return;
                        if (!Array.isArray(parsedPackets)) {
                            parsedPackets = [parsedPackets];
                        }

                        // Add to batch instead of processing immediately
                        for (var i = 0; i < parsedPackets.length; i++) {
                            var pkt = parsedPackets[i];
                            if (pkt && !pkt.__worker_error) {
                                pendingDataPackets.push(pkt);
                            }
                        }

                        // Data received silently

                        // Limit batch size to prevent memory issues
                        if (pendingDataPackets.length > 50) {
                            // Keep only latest 50 packets
                            pendingDataPackets = pendingDataPackets.slice(-50);
                        }
                    } catch (e) {
                        console.warn('[UI] Error batching parsed data:', e);
                    }
                });
            }

            // Keep raw data listener for admin window if needed (fallback)
            // Also use it to parse calibration data packets (0xAB ... 0xAB format)
            if (window.electronAPI.onRawData) {
                window.electronAPI.onRawData(function (event, bytes) {
                    // Raw data processing moved to worker thread for better performance
                    // This listener can be used for admin/debugging purposes

                    parseCalibrationData(bytes);
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
            }

            if (parsedData.rpm > 0) {
                rpmData.push(parsedData.rpm);
            }

            if (parsedData.heaterTemperature > 0) {
                heaterTempData.push(parsedData.heaterTemperature);
            }

            // Keep only last 30 data points (reduced for better performance)
            if (pressureData.length > 30) {
                pressureData.shift();
                volumeData.shift();
                rpmData.shift();
                heaterTempData.shift();
            }

            // Update UI with latest data
            updateDataDisplay(parsedData);
            recordCsvPacket(parsedData);

            // Also update the new Time vs Temperature/RPM chart data
            updateTimeSeriesData(parsedData);
        });
    }

    function resetChartsAndData() {
        try {
            temperatureData.length = 0;
            timeLabels.length = 0;
            pressureData.length = 0;
            volumeData.length = 0;
            rpmData.length = 0;
            heaterTempData.length = 0;
            pressureTimeLabels.length = 0;
            pressureTimeValues.length = 0;
            volumeTimeLabels.length = 0;
            volumeTimeValues.length = 0;
            pvPoints = [];
            timeSeriesLabels.length = 0;
            timeSeriesTempValues.length = 0;
            timeSeriesRpmValues.length = 0;
            timeSeriesStartTimeMs = null;
            dataPointCounter = 0;
            if (dataCount) {
                dataCount.textContent = '0';
            }
            if (chart && chart.data && chart.data.datasets && chart.data.datasets[0]) {
                chart.update('none');
            }
            if (pvChart && pvChart.data && pvChart.data.datasets && pvChart.data.datasets[0]) {
                pvChart.data.datasets[0].data = pvPoints;
                pvChart.update('none');
            }
            if (pressureChart) {
                pressureChart.update('none');
            }
            if (volumeChart) {
                volumeChart.update('none');
            }
            if (timeSeriesChart) {
                updateTimeSeriesChartDataset();
            }
        } catch (e) {
            console.warn('[UI] Error resetting charts/data:', e);
        }
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

    // Update data for the new Time vs Temperature/RPM chart
    function updateTimeSeriesData(parsedData) {
        if (!timeSeriesChart) {
            return;
        }

        var nowMs = Date.now();

        // If we are in the 2-second pause window after a mode switch, skip plotting
        if (timeSeriesPausedUntilMs !== null && nowMs < timeSeriesPausedUntilMs) {
            return;
        }

        // Pause is over; clear the flag
        timeSeriesPausedUntilMs = null;

         // Only sample a new point every 2 seconds, ignore packets in between
        if (timeSeriesLastSampleMs !== 0) {
            var msSinceLastSample = nowMs - timeSeriesLastSampleMs;
            if (msSinceLastSample < 2000) {
                // Less than 2 seconds since last plotted point → skip this packet
                return;
            }
        }
        // Record time of this new sample
        timeSeriesLastSampleMs = nowMs;

        // Start time reference for X axis if not set
        if (timeSeriesStartTimeMs === null) {
            timeSeriesStartTimeMs = Date.now();
        }

        var elapsedSeconds = (nowMs - timeSeriesStartTimeMs) / 1000;
        if (!isFinite(elapsedSeconds) || elapsedSeconds < 0) {
            elapsedSeconds = 0;
        }

        // Push common X-axis value (time in seconds)
        timeSeriesLabels.push(elapsedSeconds.toFixed(1)); // simple rounded seconds

        // Temperature value for this packet
        var tempValue = null;
        if (typeof parsedData.heaterTemperature === 'number' && parsedData.heaterTemperature > 0) {
            tempValue = parsedData.heaterTemperature;
        } else if (lastValidTemperature !== null) {
            tempValue = lastValidTemperature;
        }
        timeSeriesTempValues.push(tempValue);

        // RPM value for this packet
        var rpmValue = null;
        if (typeof parsedData.rpm === 'number' && parsedData.rpm > 0) {
            rpmValue = parsedData.rpm;
        } else if (lastValidRPM !== null) {
            rpmValue = lastValidRPM;
        }
        timeSeriesRpmValues.push(rpmValue);

        // Keep only the last 300 points so the graph stays reasonable
        var maxPoints = 300;
        if (timeSeriesLabels.length > maxPoints) {
            timeSeriesLabels.shift();
        }
        if (timeSeriesTempValues.length > maxPoints) {
            timeSeriesTempValues.shift();
        }
        if (timeSeriesRpmValues.length > maxPoints) {
            timeSeriesRpmValues.shift();
        }

        // Throttle redraws to about 20 times per second
        var nowForDraw = Date.now();
        if (nowForDraw - lastTimeSeriesDrawMs > 50) {
            lastTimeSeriesDrawMs = nowForDraw;
            updateTimeSeriesChartDataset();
        }
    }

    function updateConnectionStatus(status) {
        var wasConnected = isConnected;
        isConnected = status.connected;


        // Update system status banner
        updateSystemStatus(status);

        if (status.connected) {
            if (shouldResetGraphsOnReconnect) {
                resetChartsAndData();
                shouldResetGraphsOnReconnect = false;
            }

            const deviceInfo = status.deviceType ? ` (${status.deviceType})` : '';
            const portInfo = status.port ? ` on ${status.port}` : '';
            statusText.textContent = `Connected${deviceInfo}${portInfo}`;
            statusText.style.color = '#28a745';
            if (startButton) startButton.disabled = false;
            if (stopButton) stopButton.disabled = true;

            // Turn heater OFF only when FIRST connecting (not on every status update)
            if (!wasConnected && !heaterInitializedOnConnection) {
                heaterOn = false;
                if (heaterToggle) {
                    heaterToggle.textContent = '○ Heater OFF';
                    try { heaterToggle.classList.remove('active'); } catch (_) { }
                }
                if (window.electronAPI && window.electronAPI.setHardwareReady) {
                    window.electronAPI.setHardwareReady(1);
                }
                if (window.electronAPI && window.electronAPI.setHeaterMode) {
                    window.electronAPI.setHeaterMode(0);
                }
                sendHeaterSetpoint();
                heaterInitializedOnConnection = true;
            }

            // Set Aux Output to 0 only when FIRST connecting (not on every status update)
            if (!wasConnected) {
                if (auxSlider) {
                    auxSlider.value = 0;
                    if (auxValue) {
                        auxValue.value = 0;
                    }
                    updateAuxTip();
                }
                // Send Aux Output 0 command immediately
                if (window.electronAPI && window.electronAPI.setAux) {
                    window.electronAPI.setAux(0);
                }
            }

            if (status.vid && status.pid) {
                // Connected silently
            }
        } else {
            if (wasConnected && !status.connected) {
                shouldResetGraphsOnReconnect = true;
                stopCsvSaving();
            }

            // Reset RPM timeout state when disconnected
            lastRpmTimestamp = null;
            lastValidRPM = null;
            if (rpmValueEl) {
                rpmValueEl.textContent = '0';
            }
            lastValidPower = null;
            if (powerValueEl) {
                powerValueEl.textContent = '0';
            }

            // Reset initialization flag when disconnected
            heaterInitializedOnConnection = false;
            if (window.electronAPI && window.electronAPI.setHardwareReady) {
                window.electronAPI.setHardwareReady(0);
            }
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
                systemStatusBanner.className = 'system-status-banner online';
                statusTextEl.textContent = 'SYSTEM ONLINE';

                // Centered banner shows only the main text
            } else if (status.error) {
                // System is OFFLINE with error
                systemStatusBanner.className = 'system-status-banner offline';
                statusTextEl.textContent = 'SYSTEM OFFLINE';
            } else {
                // System is CONNECTING/SEARCHING
                // Show OFFLINE until device is actually connected (no 'connecting' text)
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
            const result = await window.electronAPI.autoConnectStirling();

            if (result.success) {
                currentPort = result.port;
            }
            // Auto-connect attempts handled silently by main process
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
        passwordSubmitBtn.addEventListener('click', function () {
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
        passwordCancelBtn.addEventListener('click', function () {
            passwordModal.classList.remove('show');
            passwordInput.value = '';
            passwordError.style.display = 'none';
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                passwordSubmitBtn.click();
            } else if (e.key === 'Escape') {
                passwordCancelBtn.click();
            }
        });
    }

} // End of initializeUI function

