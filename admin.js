// Admin Panel Script — Matrix Stirling Engine
(function initAdminPanel() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
    return;
  }

    // ── Tab switching ──────────────────────────────────────────────────────────
    window.switchAdminTab = function (tabName, clickedButton) {
        document.querySelectorAll('.tab-content').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-button').forEach(function (b) {
            b.classList.remove('active', 'border-primary');
            b.classList.add('border-transparent');
        });
        var tab = document.getElementById(tabName + 'Tab');
        if (tab) tab.classList.add('active');
        if (clickedButton) {
            clickedButton.classList.add('active', 'border-primary');
            clickedButton.classList.remove('border-transparent');
        }
    };

    // ── Back button — close the admin window ───────────────────────────────────
    var backBtn = document.getElementById('adminBackBtn');
    if (backBtn) backBtn.addEventListener('click', function () {
        if (typeof window.adminGoBack === 'function') { window.adminGoBack(); } else { window.close(); }
    });

    // ── Theme selector ─────────────────────────────────────────────────────────
    var themeSel = document.getElementById('adminThemeSelector');
    function applyAdminLogo(theme) {
        var logo = document.getElementById('admin-logo');
        if (logo) logo.src = theme === 'dark'
            ? 'assets/Matrix 2024 White_Thermodynamics.png'
            : 'assets/Matrix 2024_Thermodynamics.png';
    }
    if (themeSel) {
        var savedTheme = localStorage.getItem('theme') || 'dark';
        themeSel.value = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        applyAdminLogo(savedTheme);
        themeSel.addEventListener('change', function () {
            var val = themeSel.value;
            localStorage.setItem('theme', val);
            document.documentElement.setAttribute('data-theme', val);
            applyAdminLogo(val);
        });
    }

    // ── System status badge ────────────────────────────────────────────────────
    var statusBadge = document.getElementById('adminSystemStatus');

    function updateSystemStatus(status) {
        if (!statusBadge) return;
        if (status && status.connected) {
            statusBadge.textContent = 'SYSTEM ONLINE';
            statusBadge.className = 'badge badge-success badge-sm font-bold tracking-wider uppercase';
        } else if (status && status.error) {
            statusBadge.textContent = 'SYSTEM ERROR';
            statusBadge.className = 'badge badge-warning badge-sm font-bold tracking-wider uppercase';
        } else {
            statusBadge.textContent = 'SYSTEM OFFLINE';
            statusBadge.className = 'badge badge-error badge-sm font-bold tracking-wider uppercase';
        }
    }

    // ── System Log helpers ─────────────────────────────────────────────────────
    function addAdminLog(message, type) {
        type = type || 'info';
        var c = document.getElementById('adminLogContainer');
        if (!c) return;
        var entry = document.createElement('div');
        entry.className = 'log-entry';
        var ts = new Date().toLocaleTimeString();
        entry.innerHTML = '<span class="log-timestamp">[' + ts + ']</span>'
                        + '<span class="log-' + type + '"> ' + escapeHtml(message) + '</span>';
        c.appendChild(entry);
        c.scrollTop = c.scrollHeight;
        while (c.children.length > 500) c.removeChild(c.firstChild);
    }

    window.adminClearLog = function () {
        var c = document.getElementById('adminLogContainer');
        if (!c) return;
        c.innerHTML = '<div class="log-entry"><span class="log-timestamp">[' + new Date().toLocaleTimeString() + ']</span>'
                    + '<span class="log-warning"> Log cleared</span></div>';
    };

    window.adminExportLog = function () {
        var c = document.getElementById('adminLogContainer');
        if (!c) return;
        var blob = new Blob([c.innerText], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'stirling-log-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    // ── Raw Data Stream helpers ────────────────────────────────────────────────
    function addRawDataEntry(data, type) {
        type = type || 'hex';
        var c = document.getElementById('rawDataContainer');
        if (!c) return;
        var ts = new Date().toLocaleTimeString();
        var displayData = (type === 'hex')
            ? Array.from(data).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(' ')
            : String(data);
        var entry = document.createElement('div');
        entry.className = 'raw-data-entry';
        entry.innerHTML = '<span class="log-timestamp">[' + ts + ']</span>'
                        + '<span class="raw-data-' + type + '"> ' + escapeHtml(displayData) + '</span>';
        c.appendChild(entry);
        c.scrollTop = c.scrollHeight;
        while (c.children.length > 2000) c.removeChild(c.firstChild);
    }

    window.clearRawData = function () {
        var c = document.getElementById('rawDataContainer');
        if (!c) return;
        c.innerHTML = '<div class="raw-data-entry"><span class="log-timestamp">[' + new Date().toLocaleTimeString() + ']'
                    + ' Raw data cleared</span></div>';
    };

    window.exportRawData = function () {
        var c = document.getElementById('rawDataContainer');
        if (!c) return;
        var blob = new Blob([c.innerText], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'stirling-raw-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    // ── IPC listeners (serial data, connection, sent commands) ────────────────
    try {
        if (window.electronAPI && window.electronAPI.onRawData) {
            window.electronAPI.onRawData(function (event, data) {
                try {
                    var arr = Array.isArray(data) ? data
                            : (data instanceof Uint8Array ? Array.from(data)
                            : Array.from(new Uint8Array(data)));
                    addRawDataEntry(arr, 'hex');
                    updateSystemStatus({ connected: true });
                } catch (e) {}
            });
        }

        var _lastConnectionKey = null;
        if (window.electronAPI && window.electronAPI.onConnectionStatus) {
            window.electronAPI.onConnectionStatus(function (event, status) {
                updateSystemStatus(status);
                var msg = status.connected
                    ? 'Connected' + (status.port ? ' on ' + status.port : '')
                    : (status.error ? 'Error: ' + status.error : 'Disconnected');
                var type = status.connected ? 'success' : (status.error ? 'error' : 'warning');
                var key = status.connected ? ('connected:' + (status.port || '')) : ('disconnected:' + (status.error || ''));
                if (key !== _lastConnectionKey) {
                    _lastConnectionKey = key;
                    addAdminLog(msg, type);
                }

                // Bootloader connection status
                var isBootloader = status.isBootloader || status.isDFU || false;
                var connectBtn = document.getElementById('connectBtn');
                if (status.connected && isBootloader) {
                    bootloaderConnected = true;
                    clearBootloaderConnectTimer();
                    if (connectBtn) { connectBtn.textContent = 'Disconnect'; connectBtn.disabled = false; }
                    setBootloaderButtonState('connected');
                    addBootloaderLog('Device connected', 'success');
                } else if (!status.connected && isBootloader) {
                    bootloaderConnected = false; hexFileLoaded = false;
                    if (connectBtn) { connectBtn.textContent = 'Connect'; connectBtn.disabled = false; }
                    setBootloaderButtonState('disconnected');
                    addBootloaderLog('Disconnected', 'info');
                }
            });
        }

        if (window.electronAPI && window.electronAPI.onSentCommand) {
            window.electronAPI.onSentCommand(function (event, commandData) {
                try {
                    var msg;
                    if (commandData.type === 'heater') {
                        msg = 'Heater ' + (commandData.value === 0 ? 'OFF' : 'setpoint ' + commandData.value + '°C');
                    } else if (commandData.type === 'aux') {
                        msg = 'Aux output ' + commandData.value + '%';
                    } else {
                        msg = 'Command [' + (commandData.type || '?') + '] = ' + commandData.value;
                    }
                    addAdminLog(msg, 'info');
                } catch (e) {}
            });
        }

        if (window.electronAPI && window.electronAPI.onBootloaderProgress) {
            window.electronAPI.onBootloaderProgress(function (data) {
                var mode = data.step === 'erase' ? 'erase' : (data.step === 'verify' ? 'verify' : 'program');
                showFirmwareProgress(data.label, data.progress, mode);
                updateFirmwareProgress(data.label, data.progress);
                if (data.progress >= 100) setTimeout(hideFirmwareProgress, 3000);
            });
        }

        if (window.electronAPI && window.electronAPI.onUpdateStatus) {
            window.electronAPI.onUpdateStatus(function (event, updateInfo) {
                handleUpdateStatus(updateInfo);
            });
        }
    } catch (e) {}

    // Sync initial connection status
    try {
        if (window.electronAPI && window.electronAPI.getConnectionStatus) {
            window.electronAPI.getConnectionStatus().then(function (status) {
                updateSystemStatus(status);
            }).catch(function () {});
        }
    } catch (e) {}

    // ── Version display ────────────────────────────────────────────────────────
    try {
        if (window.electronAPI && window.electronAPI.getAppVersion) {
            window.electronAPI.getAppVersion().then(function (v) {
                var ver = (v && (v.version || v)) || '—';
                var el1 = document.getElementById('currentVersionDisplay');
                var el2 = document.getElementById('aboutVersion');
                if (el1) el1.textContent = ver;
                if (el2) el2.textContent = ver;
            }).catch(function () {});
        }
    } catch (e) {}

    // ── Temperature unit (Settings tab) ───────────────────────────────────────
    window.setTemperatureUnit = function (unit) {
        localStorage.setItem('temp-unit', unit);
        addAdminLog('Temperature unit changed to ' + (unit === 'F' ? 'Fahrenheit (°F)' : 'Celsius (°C)'), 'success');
    };

    // Restore saved unit on load
    var savedUnit = localStorage.getItem('temp-unit') || 'C';
    document.querySelectorAll('input[name="tempUnit"]').forEach(function (r) {
        r.checked = r.value === savedUnit;
    });

    // ── Bootloader UI ──────────────────────────────────────────────────────────
    var bootloaderConnected = false;
    var hexFileLoaded = false;
    var bootloaderConnectTimer = null;

    function clearBootloaderConnectTimer() {
        if (bootloaderConnectTimer !== null) {
            clearTimeout(bootloaderConnectTimer);
            bootloaderConnectTimer = null;
        }
    }

    function addBootloaderLog(message, type) {
        type = type || 'info';
        var c = document.getElementById('bootloaderLog');
        if (!c) return;
        var entry = document.createElement('div');
        entry.className = 'bootloader-log-entry ' + type;
        entry.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
        c.appendChild(entry);
        c.scrollTop = c.scrollHeight;
    }

    function showFirmwareProgress(label, percent, mode) {
        var section = document.getElementById('firmwareProgressSection');
        var labelEl  = document.getElementById('firmwareProgressLabel');
        var fillEl   = document.getElementById('firmwareProgressFill');
        var textEl   = document.getElementById('firmwareProgressText');
        if (!section) return;
        section.style.display = 'block';
        if (labelEl) labelEl.textContent = label;
        if (fillEl) {
            fillEl.value = percent;
            fillEl.className = 'progress w-full h-5 '
                + (mode === 'erase' ? 'progress-warning' : mode === 'verify' ? 'progress-info' : 'progress-success');
        }
        if (textEl) textEl.textContent = percent + '%';
    }

    function hideFirmwareProgress() {
        var s = document.getElementById('firmwareProgressSection');
        if (s) s.style.display = 'none';
    }

    function updateFirmwareProgress(label, percent) {
        var l = document.getElementById('firmwareProgressLabel');
        var f = document.getElementById('firmwareProgressFill');
        var t = document.getElementById('firmwareProgressText');
        if (l) l.textContent = label;
        if (f) f.value = percent;
        if (t) t.textContent = Math.round(percent) + '%';
    }

    function setBlStat(connText, connClass, opText, opDesc) {
        var conn = document.getElementById('blStatConnection');
        var op   = document.getElementById('blStatOperation');
        var opD  = document.getElementById('blStatOperationDesc');
        var dot  = conn && conn.parentElement && conn.parentElement.querySelector('.animate-ping');
        var dotS = conn && conn.parentElement && conn.parentElement.querySelector('.relative.inline-flex');
        if (conn) { conn.textContent = connText; conn.className = 'font-bold text-lg ' + connClass; }
        if (dot)  { dot.className  = dot.className.replace(/bg-\S+/, 'bg-' + connClass.replace('text-','')); }
        if (dotS) { dotS.className = dotS.className.replace(/bg-\S+/, 'bg-' + connClass.replace('text-','')); }
        if (op)   op.textContent = opText;
        if (opD)  opD.textContent = opDesc;
    }

    function setBootloaderButtonState(state) {
        var ids = ['connectBtn', 'triggerBootloaderBtn', 'loadHexBtn', 'eraseProgVerifyBtn', 'runAppBtn'];
        var btns = {};
        ids.forEach(function (id) { btns[id] = document.getElementById(id); });
        function en(id, val) { if (btns[id]) btns[id].disabled = !val; }
        switch (state) {
            case 'disconnected':
                en('connectBtn', false); en('triggerBootloaderBtn', true);
                en('loadHexBtn', false); en('eraseProgVerifyBtn', false); en('runAppBtn', false);
                setBlStat('STANDBY', 'text-warning', 'IDLE', 'Ready'); break;
            case 'connected':
                en('connectBtn', true); en('triggerBootloaderBtn', false);
                en('loadHexBtn', true); en('eraseProgVerifyBtn', false); en('runAppBtn', false);
                setBlStat('CONNECTED', 'text-success', 'READY', 'Load hex file'); break;
            case 'hex_loaded':
                en('connectBtn', true); en('triggerBootloaderBtn', false);
                en('loadHexBtn', true); en('eraseProgVerifyBtn', true); en('runAppBtn', false);
                setBlStat('CONNECTED', 'text-success', 'HEX OK', 'Ready to flash'); break;
            case 'busy':
                ids.forEach(function (id) { en(id, false); });
                setBlStat('BUSY', 'text-info', 'FLASHING', 'Do not disconnect'); break;
            case 'ready_to_run':
                ids.filter(function (id) { return id !== 'runAppBtn'; }).forEach(function (id) { en(id, false); });
                en('runAppBtn', true);
                setBlStat('CONNECTED', 'text-success', 'VERIFIED', 'Click Run Application'); break;
        }
    }

    setBootloaderButtonState('disconnected');

    window.triggerBootloader = async function () {
        var btn = document.getElementById('triggerBootloaderBtn');
        if (btn) btn.disabled = true;
        addBootloaderLog('Sending bootloader trigger…', 'info');
        try {
            if (window.electronAPI && window.electronAPI.sendBootloader) {
                var result = await window.electronAPI.sendBootloader(1);
                if (result.success) {
                    addBootloaderLog('Bootloader command sent — click Connect when device is ready.', 'info');
                    var cb = document.getElementById('connectBtn');
                    if (cb) cb.disabled = false;
                    clearBootloaderConnectTimer();
                    bootloaderConnectTimer = setTimeout(function () {
                        bootloaderConnectTimer = null;
                        if (!bootloaderConnected) {
                            var connectBtn = document.getElementById('connectBtn');
                            if (connectBtn) connectBtn.disabled = true;
                            var trigBtn = document.getElementById('triggerBootloaderBtn');
                            if (trigBtn) trigBtn.disabled = false;
                            addBootloaderLog('Bootloader not detected after 30 s — retrigger when ready.', 'warning');
                        }
                    }, 30000);
                } else {
                    addBootloaderLog('Failed: ' + (result.error || 'Unknown'), 'error');
                    if (btn) btn.disabled = false;
                }
            } else {
                addBootloaderLog('Bootloader control not available on this hardware.', 'warning');
                if (btn) btn.disabled = false;
            }
        } catch (e) {
            addBootloaderLog('Error: ' + e.message, 'error');
            if (btn) btn.disabled = false;
        }
    };

    window.connectBootloader = async function () {
        var connectBtn = document.getElementById('connectBtn');
        if (bootloaderConnected) {
            addBootloaderLog('Disconnecting…', 'info');
            if (window.electronAPI && window.electronAPI.disconnectFromPort) {
                await window.electronAPI.disconnectFromPort();
            }
            bootloaderConnected = false; hexFileLoaded = false;
            if (connectBtn) connectBtn.textContent = 'Connect';
            setBootloaderButtonState('disconnected');
            addBootloaderLog('Disconnected.', 'info');
        } else {
            if (connectBtn) connectBtn.disabled = true;
            addBootloaderLog('Connecting…', 'info');
            try {
                var vid = document.getElementById('usbVidInput').value;
                var pid = document.getElementById('usbPidInput').value;
                var result;
                if (window.electronAPI && window.electronAPI.connectToBootloaderUSB) {
                    result = await window.electronAPI.connectToBootloaderUSB(vid, pid);
                }
                if (result && result.success) {
                    bootloaderConnected = true;
                    clearBootloaderConnectTimer();
                    if (connectBtn) connectBtn.textContent = 'Disconnect';
                    setBootloaderButtonState('connected');
                    addBootloaderLog('Connected — load a hex file to continue.', 'success');
                } else {
                    addBootloaderLog('Connection failed: ' + ((result && result.error) || 'Unknown'), 'error');
                    if (connectBtn) connectBtn.disabled = false;
                }
            } catch (e) {
                addBootloaderLog('Error: ' + e.message, 'error');
                if (connectBtn) connectBtn.disabled = false;
            }
        }
    };

    window.loadHexFile = async function () {
        if (!window.electronAPI || !window.electronAPI.showOpenDialog) {
            addBootloaderLog('File dialog not available.', 'error');
            return;
        }
        try {
            var result = await window.electronAPI.showOpenDialog({
                filters: [{ name: 'Intel Hex Files', extensions: ['hex'] }],
                properties: ['openFile']
            });
            if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
                var filePath = result.filePaths[0];
                var label = document.getElementById('hexFilePathLabel');
                if (label) { label.textContent = filePath; label.classList.add('has-file'); }
                var fname = filePath.split(/[\\/]/).pop();
                var hexStat = document.getElementById('blStatHexFile');
                var hexDesc = document.getElementById('blStatHexDesc');
                if (hexStat) hexStat.textContent = fname.length > 14 ? fname.slice(0,12)+'…' : fname;
                if (hexDesc) hexDesc.textContent = 'File selected';
                if (window.electronAPI && window.electronAPI.loadHexFile) {
                    var lr = await window.electronAPI.loadHexFile(filePath);
                    if (lr && lr.success) {
                        hexFileLoaded = true;
                        addBootloaderLog('Hex file loaded — click Erase-Program-Verify to flash.', 'success');
                        setBootloaderButtonState('hex_loaded');
                    } else {
                        addBootloaderLog('Load failed: ' + ((lr && lr.error) || 'Unknown'), 'error');
                    }
                } else {
                    hexFileLoaded = true;
                    addBootloaderLog('Hex file selected: ' + filePath, 'success');
                    setBootloaderButtonState('hex_loaded');
                }
            }
        } catch (e) {
            addBootloaderLog('Error: ' + e.message, 'error');
        }
    };

    window.eraseProgramVerify = async function () {
        if (!hexFileLoaded) { addBootloaderLog('Load a hex file first.', 'error'); return; }
        addBootloaderLog('Starting Erase → Program → Verify sequence…', 'info');
        setBootloaderButtonState('busy');
        try {
            // Step 1: Erase
            addBootloaderLog('Step 1/3: Erasing flash…', 'info');
            showFirmwareProgress('Erasing Flash…', 0, 'erase');
            var er = window.electronAPI && window.electronAPI.bootloaderEraseFlash
                ? await window.electronAPI.bootloaderEraseFlash() : null;
            if (!er || !er.success) {
                hideFirmwareProgress();
                addBootloaderLog('Erase failed: ' + ((er && er.error) || 'Not available'), 'error');
                setBootloaderButtonState('hex_loaded');
                return;
            }
            addBootloaderLog('Erase complete.', 'success');

            // Step 2: Program
            addBootloaderLog('Step 2/3: Programming flash…', 'info');
            showFirmwareProgress('Programming Flash…', 0, 'program');
            var pr = window.electronAPI && window.electronAPI.bootloaderProgramFlash
                ? await window.electronAPI.bootloaderProgramFlash() : null;
            if (!pr || !pr.success) {
                hideFirmwareProgress();
                addBootloaderLog('Program failed: ' + ((pr && pr.error) || 'Not available'), 'error');
                setBootloaderButtonState('hex_loaded');
                return;
            }
            addBootloaderLog('Program complete.', 'success');

            // Step 3: Verify
            addBootloaderLog('Step 3/3: Verifying…', 'info');
            showFirmwareProgress('Verifying…', 0, 'verify');
            var vr = window.electronAPI && window.electronAPI.bootloaderReadCRC
                ? await window.electronAPI.bootloaderReadCRC() : null;
            if (!vr || !vr.success) {
                hideFirmwareProgress();
                addBootloaderLog('Verify failed: ' + ((vr && vr.error) || 'Not available'), 'error');
                setBootloaderButtonState('hex_loaded');
                return;
            }

            if (vr.crcMatch) {
                updateFirmwareProgress('Complete!', 100);
                setTimeout(hideFirmwareProgress, 2000);
                addBootloaderLog('All done — click Run Application to start firmware.', 'success');
                setBootloaderButtonState('ready_to_run');
            } else {
                hideFirmwareProgress();
                addBootloaderLog('CRC mismatch — verify failed. Try again.', 'error');
                setBootloaderButtonState('hex_loaded');
            }
        } catch (e) {
            hideFirmwareProgress();
            addBootloaderLog('Error: ' + e.message, 'error');
            setBootloaderButtonState('hex_loaded');
        }
    };

    window.runApplication = async function () {
        addBootloaderLog('Jumping to application…', 'info');
        setBootloaderButtonState('busy');
        if (window.electronAPI && window.electronAPI.bootloaderJumpToApp) {
            try {
                var r = await window.electronAPI.bootloaderJumpToApp();
                if (r && r.success) {
                    addBootloaderLog('Application is now running.', 'success');
                } else {
                    addBootloaderLog('Failed: ' + ((r && r.error) || 'Unknown'), 'error');
                }
            } catch (e) {
                if (e.message && (e.message.includes('disconnected') || e.message.includes('Cannot write'))) {
                    addBootloaderLog('Device jumped to application (bootloader disconnected — normal).', 'success');
                } else {
                    addBootloaderLog('Error: ' + e.message, 'error');
                }
            }
        }
        bootloaderConnected = false; hexFileLoaded = false;
        var cb = document.getElementById('connectBtn');
        if (cb) cb.textContent = 'Connect';
        setBootloaderButtonState('disconnected');
    };

    // ── Updates tab ────────────────────────────────────────────────────────────
    window.checkForUpdates = async function () {
        var checkBtn       = document.getElementById('checkUpdateBtn');
        var statusDisplay  = document.getElementById('updateStatusDisplay');
        var statusMessage  = document.getElementById('updateStatusMessage');
        var statusContent  = document.getElementById('updateStatusContent');

        if (checkBtn) checkBtn.disabled = true;
        if (statusDisplay) statusDisplay.textContent = 'Checking…';
        if (statusMessage) { statusMessage.style.display = 'block'; statusMessage.className = 'update-status-message info'; }
        if (statusContent) statusContent.textContent = 'Checking for updates…';

        if (!window.electronAPI || !window.electronAPI.checkForUpdates) {
            // Fallback: show current version as up-to-date
            var ver = (document.getElementById('currentVersionDisplay') || {}).textContent || '—';
            if (statusDisplay) statusDisplay.textContent = 'Up to Date';
            if (statusMessage) statusMessage.className = 'update-status-message success';
            if (statusContent) statusContent.textContent = 'You are running version ' + ver + '. No update server configured.';
            if (checkBtn) checkBtn.disabled = false;
            return;
        }

        try {
            var result = await window.electronAPI.checkForUpdates();
            if (!result.success) {
                if (statusDisplay) statusDisplay.textContent = 'Error';
                if (statusMessage) statusMessage.className = 'update-status-message error';
                if (statusContent) statusContent.textContent = result.error || 'Failed to check for updates.';
                if (checkBtn) checkBtn.disabled = false;
            }
            // Further status comes via onUpdateStatus IPC event
        } catch (e) {
            if (statusDisplay) statusDisplay.textContent = 'Error';
            if (statusMessage) statusMessage.className = 'update-status-message error';
            if (statusContent) statusContent.textContent = 'Error: ' + e.message;
            if (checkBtn) checkBtn.disabled = false;
        }
    };

    function handleUpdateStatus(updateInfo) {
        var statusDisplay  = document.getElementById('updateStatusDisplay');
        var statusMessage  = document.getElementById('updateStatusMessage');
        var statusContent  = document.getElementById('updateStatusContent');
        var progressSection = document.getElementById('updateProgressSection');
        var progressFill   = document.getElementById('updateProgressFill');
        var progressText   = document.getElementById('updateProgressText');
        var checkBtn       = document.getElementById('checkUpdateBtn');

        if (!statusMessage) return;
        statusMessage.style.display = 'block';

        var map = {
            'checking'      : ['Checking…',          'info',    false, updateInfo.message || 'Checking…'],
            'available'     : ['Update Available!',   'success', false, 'New version ' + (updateInfo.version || '') + ' is available.'],
            'not-available' : ['Up to Date',          'success', false, updateInfo.message || 'You are using the latest version.'],
            'downloading'   : ['Downloading…',        'info',    true,  updateInfo.message || 'Downloading update…'],
            'downloaded'    : ['Ready to Install',    'success', false, 'Downloaded — restart the app to install.'],
            'error'         : ['Error',               'error',   false, updateInfo.message || 'An error occurred.']
        };

        var entry = map[updateInfo.status];
        if (!entry) return;

        if (statusDisplay) statusDisplay.textContent = entry[0];
        statusMessage.className = 'update-status-message ' + entry[1];
        if (statusContent) statusContent.textContent = entry[3];
        if (progressSection) progressSection.style.display = entry[2] ? 'block' : 'none';
        if (entry[2] && updateInfo.percent !== undefined) {
            if (progressFill) progressFill.value = updateInfo.percent;
            if (progressText) progressText.textContent = updateInfo.percent + '%';
        }
        if (updateInfo.status !== 'checking' && updateInfo.status !== 'downloading') {
            if (checkBtn) checkBtn.disabled = false;
        }
    }

    // ── Utilities ──────────────────────────────────────────────────────────────
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    addAdminLog('Admin panel ready.', 'success');
}());
