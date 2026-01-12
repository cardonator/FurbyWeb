// Furby Connect Web Interface
// Using Web Bluetooth

const furby = new FurBLE();
const THEME_STORAGE_KEY = 'furbyweb-theme';

// Theme Logic
function getStoredTheme() {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
        return null;
    }
}

function setStoredTheme(theme) {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        console.warn('Theme preference not saved', error);
    }
}

function updateThemeToggleButton(isDark) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    toggleBtn.setAttribute('aria-pressed', String(isDark));
    const message = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    toggleBtn.setAttribute('aria-label', message);
    toggleBtn.setAttribute('title', message);

    const icon = toggleBtn.querySelector('.theme-icon');
    if (icon) icon.textContent = isDark ? '🌞' : '🌙';
}

function applyTheme(theme, persist = false) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark-mode', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    updateThemeToggleButton(isDark);
    if (persist) setStoredTheme(theme);
}

function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = getStoredTheme() || (prefersDark ? 'dark' : 'light');
    applyTheme(initialTheme);

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark-mode');
            applyTheme(isDark ? 'light' : 'dark', true);
        });
    }
}

// Logging
function log(message, type = 'info') {
    const logDiv = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.insertBefore(entry, logDiv.firstChild);

    // Keep only last 50 entries
    while (logDiv.children.length > 50) {
        logDiv.removeChild(logDiv.lastChild);
    }
    console.log(`[${type}] ${message}`);
}

// Wire up logging
furby.setLogCallback(log);

// UX Updates
function updateStatus(connected) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');

    if (connected) {
        statusIndicator.className = 'status-indicator connected';
        statusText.textContent = 'Connected';
        // Hide connection controls or update UI state
    } else {
        statusIndicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Disconnected';
    }
}

// Connection Handlers
document.getElementById('btn-connect').addEventListener('click', async () => {
    try {
        await furby.connect();
        updateStatus(true);
        log("Ready to fluff!", "success");
    } catch (error) {
        log(`Connection failed: ${error}`, 'error');
        updateStatus(false);
    }
});

document.getElementById('btn-disconnect').addEventListener('click', async () => {
    try {
        await furby.disconnect();
        updateStatus(false);
    } catch (error) {
        log(`Disconnect failed: ${error}`, 'error');
    }
});

// UI Controls

// Antenna Color
const redSlider = document.getElementById('red-slider');
const greenSlider = document.getElementById('green-slider');
const blueSlider = document.getElementById('blue-slider');
const colorPreview = document.getElementById('color-preview');

function updateColorPreview() {
    const r = redSlider.value;
    const g = greenSlider.value;
    const b = blueSlider.value;

    document.getElementById('red-value').textContent = r;
    document.getElementById('green-value').textContent = g;
    document.getElementById('blue-value').textContent = b;

    colorPreview.style.background = `rgb(${r}, ${g}, ${b})`;
}

async function sendAntennaColor() {
    const r = parseInt(redSlider.value);
    const g = parseInt(greenSlider.value);
    const b = parseInt(blueSlider.value);

    try {
        await furby.setAntennaColor(r, g, b);
        log(`Set antenna: ${r}, ${g}, ${b}`, 'success');
    } catch (e) {
        log(`Failed to set antenna: ${e}`, 'error');
    }
}

[redSlider, greenSlider, blueSlider].forEach(slider => {
    slider.addEventListener('input', updateColorPreview);
    slider.addEventListener('change', sendAntennaColor);
});

colorPreview.addEventListener('click', sendAntennaColor);

// Presets
document.querySelectorAll('.color-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.color) {
            const [r, g, b] = btn.dataset.color.split(',').map(Number);
            redSlider.value = r;
            greenSlider.value = g;
            blueSlider.value = b;
            updateColorPreview();
            sendAntennaColor();
        }
    });
});

// Quick Actions
document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
        const [input, index, subindex, specific] = btn.dataset.action.split(',').map(Number);
        try {
            await furby.triggerAction(input, index, subindex, specific);
            log(`Action: ${btn.textContent}`, 'success');
        } catch (e) {
            log(`Action failed: ${e}`, 'error');
        }
    });
});

// LCD
document.getElementById('btn-lcd-on').addEventListener('click', () => furby.setLcd(true));
document.getElementById('btn-lcd-off').addEventListener('click', () => furby.setLcd(false));
document.getElementById('btn-debug').addEventListener('click', () => furby.cycleDebug());

// Custom Action
document.getElementById('btn-custom-action').addEventListener('click', async () => {
    const input = parseInt(document.getElementById('action-input').value);
    const index = parseInt(document.getElementById('action-index').value);
    const subindex = parseInt(document.getElementById('action-subindex').value);
    const specific = parseInt(document.getElementById('action-specific').value);

    try {
        await furby.triggerAction(input, index, subindex, specific);
        log(`Custom action sent`, 'success');
    } catch (e) {
        log(`Custom action failed: ${e}`, 'error');
    }
});

// Moods
document.querySelectorAll('.mood-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
        document.getElementById(`${e.target.dataset.mood}-value`).textContent = e.target.value;
    });

    slider.addEventListener('change', async (e) => {
        const typeMap = {
            'excitedness': 0,
            'displeasedness': 1,
            'tiredness': 2,
            'fullness': 3,
            'wellness': 4
        };
        const moodType = typeMap[e.target.dataset.mood];
        const value = parseInt(e.target.value);

        try {
            await furby.setMood(moodType, value);
            log(`Set ${e.target.dataset.mood} to ${value}`, 'success');
        } catch (err) {
            log(`Failed to set mood: ${err}`, 'error');
        }
    });
});

// Name Selection (Reuse UI logic from names.js but override the setting part)
// Since names.js sets up event listeners on DOMContentLoaded, we need to be careful.
// names.js currently uses `apiCall`. We need to override the button click handler for name setting.

// We can replace the listener on `btn-set-name` cleanly.
// Cloning the node removes event listeners.
const oldBtn = document.getElementById('btn-set-name');
const newBtn = oldBtn.cloneNode(true);
oldBtn.parentNode.replaceChild(newBtn, oldBtn);

newBtn.addEventListener('click', async () => {
    const nameId = parseInt(document.getElementById('name-id').value);
    try {
        await furby.setName(nameId);
        log(`Name set to ID ${nameId}`, 'success');
    } catch (e) {
        log(`Failed to set name: ${e}`, 'error');
    }
});

// Initialization
initThemeToggle();
updateStatus(false);
updateColorPreview();

// Hide irrelevant UI elements for Web Bluetooth
document.getElementById('known-furbies').style.display = 'none';
document.getElementById('mac-address').style.display = 'none';
