
// Furby Connect Web Bluetooth Implementation
// Ported from PyFluff (Python) by Antigravity

const FurbyUUIDs = {
    // Services
    SERVICE_FLUFF: "dab91435-b5a1-e29c-b041-bcd562613bde",
    SERVICE_DEVICE_INFO: "0000180a-0000-1000-8000-00805f9b34fb",

    // Characteristics
    // Device Information
    CHAR_MANUFACTURER_NAME: "00002a29-0000-1000-8000-00805f9b34fb",
    CHAR_MODEL_NUMBER: "00002a24-0000-1000-8000-00805f9b34fb",
    CHAR_SERIAL_NUMBER: "00002a25-0000-1000-8000-00805f9b34fb",
    CHAR_HARDWARE_REVISION: "00002a27-0000-1000-8000-00805f9b34fb",
    CHAR_FIRMWARE_REVISION: "00002a26-0000-1000-8000-00805f9b34fb",
    CHAR_SOFTWARE_REVISION: "00002a28-0000-1000-8000-00805f9b34fb",

    // Fluff Service
    CHAR_GENERALPLUS_WRITE: "dab91383-b5a1-e29c-b041-bcd562613bde",
    CHAR_GENERALPLUS_LISTEN: "dab91382-b5a1-e29c-b041-bcd562613bde",
    CHAR_NORDIC_WRITE: "dab90757-b5a1-e29c-b041-bcd562613bde",
    CHAR_NORDIC_LISTEN: "dab90756-b5a1-e29c-b041-bcd562613bde",
    CHAR_RSSI_LISTEN: "dab90755-b5a1-e29c-b041-bcd562613bde",
    CHAR_FILE_WRITE: "dab90758-b5a1-e29c-b041-bcd562613bde"
};

const GeneralPlusCommand = {
    TRIGGER_ACTION_BY_INPUT: 0x10,
    TRIGGER_ACTION_BY_INDEX: 0x11,
    TRIGGER_ACTION_BY_SUBINDEX: 0x12,
    TRIGGER_SPECIFIC_ACTION: 0x13,
    SET_ANTENNA_COLOR: 0x14,
    FURBY_MESSAGE: 0x20,
    SET_NAME: 0x21,
    SET_MOODMETER: 0x23,
    SET_NOTIFICATIONS: 0x31,
    ANNOUNCE_DLC_UPLOAD: 0x50,
    DELETE_FILE: 0x53,
    GET_FILE_SIZE: 0x54,
    GET_CHECKSUM: 0x55,
    LOAD_DLC: 0x60,
    ACTIVATE_DLC: 0x61,
    DEACTIVATE_DLC: 0x62,
    GET_SLOT_ALLOCATION: 0x72,
    GET_SLOT_INFO: 0x73,
    DELETE_DLC_SLOT: 0x74,
    BODY_CAM: 0xBC,
    LCD_DEBUG_MENU: 0xDB,
    LCD_BACKLIGHT: 0xCD,
    GET_GPL_FIRMWARE: 0xFE
};

const GeneralPlusResponse = {
    FURBY_MESSAGE: 0x20,
    SENSOR_STATUS: 0x21,
    IM_HERE_SIGNAL: 0x22,
    CURRENT_MODE: 0x23,
    FILE_TRANSFER_MODE: 0x24,
    LANGUAGE: 0x25,
    FURBIES_MET: 0x26,
    GOT_FILE_SIZE: 0x54,
    GOT_FILE_CHECKSUM: 0x55,
    SLOTS_INFO: 0x72,
    GOT_SLOT_INFO_BY_INDEX: 0x73,
    GOT_DELETE_SLOT_BY_INDEX: 0x74,
    REPORT_DLC: 0xDC,
    GPL_FIRMWARE_VERSION: 0xFE
};

class FurBLE {
    constructor() {
        this.device = null;
        this.server = null;
        this.fluffService = null;
        this.gpWriteChar = null;
        this.gpListenChar = null;
        this.nordicWriteChar = null;
        this.isIdle = false;
        this.idleInterval = null;
        this.logCallback = console.log;

        // Event listeners
        this.listeners = {
            'sensor': []
        };
    }

    setLogCallback(callback) {
        this.logCallback = callback;
    }

    log(message, type = 'info') {
        this.logCallback(message, type);
    }

    async connect() {
        if (!navigator.bluetooth) {
            throw new Error("Web Bluetooth is not supported in this browser.");
        }

        try {
            this.log("Requesting Bluetooth Device...");
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: "Furby" }],
                optionalServices: [
                    FurbyUUIDs.SERVICE_FLUFF,
                    FurbyUUIDs.SERVICE_DEVICE_INFO
                ]
            });

            this.log(`Connecting to ${this.device.name}...`);
            this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

            this.server = await this.device.gatt.connect();
            this.log("Connected to GATT Server.");

            this.log("Getting Fluff Service...");
            this.fluffService = await this.server.getPrimaryService(FurbyUUIDs.SERVICE_FLUFF);

            this.log("Getting Characteristics...");
            this.gpWriteChar = await this.fluffService.getCharacteristic(FurbyUUIDs.CHAR_GENERALPLUS_WRITE);
            this.gpListenChar = await this.fluffService.getCharacteristic(FurbyUUIDs.CHAR_GENERALPLUS_LISTEN);
            this.nordicWriteChar = await this.fluffService.getCharacteristic(FurbyUUIDs.CHAR_NORDIC_WRITE);

            this.log("Starting Notifications...");
            await this.gpListenChar.startNotifications();
            this.gpListenChar.addEventListener('characteristicvaluechanged', this.handleNotifications.bind(this));

            this.startIdle();

            // Get device info if possible
            // await this.getDeviceInfo(); // Optional

            return this.device;
        } catch (error) {
            this.log(`Connection failed: ${error}`, 'error');
            throw error;
        }
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.log("Disconnecting...");
            this.stopIdle();
            this.device.gatt.disconnect();
        }
    }

    onDisconnected() {
        this.log("Furby Disconnected", 'warning');
        this.stopIdle();
    }

    handleNotifications(event) {
        const value = event.target.value;
        const data = new Uint8Array(value.buffer);

        // this.log(`Notification: ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`, 'debug');

        if (data.length > 0) {
            const responseId = data[0];

            if (responseId === GeneralPlusResponse.SENSOR_STATUS) {
                // Handle sensor data
                this.emit('sensor', data);
            } else if (responseId === GeneralPlusResponse.FURBY_MESSAGE) {
                // Handle furby messages (actions, state changes)
                // this.log(`Furby Message: ${data[1]}`, 'info');
            }
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    startIdle() {
        if (this.idleInterval) clearInterval(this.idleInterval);
        this.idleInterval = setInterval(() => {
            if (this.device && this.device.gatt.connected) {
                this.writeGp(new Uint8Array([0x00])); // Keep-alive
            }
        }, 4000);
    }

    stopIdle() {
        if (this.idleInterval) {
            clearInterval(this.idleInterval);
            this.idleInterval = null;
        }
    }

    async writeGp(data) {
        if (!this.gpWriteChar) return;
        try {
            await this.gpWriteChar.writeValueWithoutResponse(data);
        } catch (e) {
            console.error("Write failed", e);
        }
    }

    // Commands

    async setAntennaColor(r, g, b) {
        // Command: [0x14, r, g, b]
        const cmd = new Uint8Array([GeneralPlusCommand.SET_ANTENNA_COLOR, r, g, b]);
        await this.writeGp(cmd);
    }

    async triggerAction(input, index, subindex, specific) {
        // Command: [0x13, 0x00, input, index, subindex, specific]
        const cmd = new Uint8Array([
            GeneralPlusCommand.TRIGGER_SPECIFIC_ACTION,
            0x00,
            input,
            index,
            subindex,
            specific
        ]);
        await this.writeGp(cmd);
    }

    async setLcd(enabled) {
        // Command [0xCD, 0x01/0x00]
        const cmd = new Uint8Array([
            GeneralPlusCommand.LCD_BACKLIGHT,
            enabled ? 0x01 : 0x00
        ]);
        await this.writeGp(cmd);
    }

    async cycleDebug() {
        // Command [0xDB]
        const cmd = new Uint8Array([GeneralPlusCommand.LCD_DEBUG_MENU]);
        await this.writeGp(cmd);
    }

    async setName(nameId) {
        // Command [0x21, nameId]
        const cmd = new Uint8Array([GeneralPlusCommand.SET_NAME, nameId]);
        await this.writeGp(cmd);
        // Also say the name
        await this.triggerAction(0x21, 0, 0, nameId);
    }

    async setMood(type, value) {
        // Command [0x23, action(1=set), type, value]
        const cmd = new Uint8Array([
            GeneralPlusCommand.SET_MOODMETER,
            0x01, // Set absolute
            type,
            value
        ]);
        await this.writeGp(cmd);
    }

    // Helpers
    async getDeviceInfo() {
        if (!this.device || !this.device.gatt.connected) return null;

        const info = {};
        try {
            const service = await this.server.getPrimaryService(FurbyUUIDs.SERVICE_DEVICE_INFO);

            const readChar = async (uuid) => {
                const char = await service.getCharacteristic(uuid);
                const val = await char.readValue();
                return new TextDecoder().decode(val);
            };

            info.manufacturer = await readChar(FurbyUUIDs.CHAR_MANUFACTURER_NAME);
            info.firmware = await readChar(FurbyUUIDs.CHAR_FIRMWARE_REVISION);
            // Add others if needed
        } catch (e) {
            console.warn("Failed to read device info", e);
        }
        return info;
    }
}
