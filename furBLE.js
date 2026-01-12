
// Furby Connect Web Bluetooth Implementation
// Based on PyFluff concepts

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
        this.fileWriteChar = null;
        this.isIdle = false;
        this.idleInterval = null;
        this.logCallback = console.log;

        // Event listeners
        this.listeners = {
            'sensor': [],
            'fileTransfer': []
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
            this.fileWriteChar = await this.fluffService.getCharacteristic(FurbyUUIDs.CHAR_FILE_WRITE);

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
            } else if (responseId === GeneralPlusResponse.FILE_TRANSFER_MODE) {
                // Handle file transfer status
                this.emit('fileTransfer', data);
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

    // DLC Support

    async writeFile(data) {
        if (!this.fileWriteChar) {
            throw new Error("File write characteristic not available");
        }
        try {
            await this.fileWriteChar.writeValueWithoutResponse(data);
        } catch (e) {
            console.error("File write failed", e);
            throw e;
        }
    }

    async enableNordicPacketAck(enable) {
        // Enable/disable Nordic packet acknowledgment
        const cmd = new Uint8Array([enable ? 0x01 : 0x00]);
        try {
            await this.nordicWriteChar.writeValueWithoutResponse(cmd);
        } catch (e) {
            console.error("Nordic ACK toggle failed", e);
        }
    }

    buildDlcAnnounceCommand(fileSize, slot, filename) {
        // Build DLC announce command with correct byte order
        // Total: 20 bytes
        // Byte 0: Command (0x50)
        // Byte 1: Padding (0x00)
        // Bytes 2-4: File size (3 bytes, little endian)
        // Byte 5: Slot number
        // Bytes 6-17: Filename (12 bytes, ASCII, padded with nulls)
        // Bytes 18-19: Trailing nulls (0x00 0x00)
        const buffer = new Uint8Array(20);
        
        // Command byte and padding
        buffer[0] = GeneralPlusCommand.ANNOUNCE_DLC_UPLOAD; // 0x50
        buffer[1] = 0x00;
        
        // File size (3 bytes, little endian)
        buffer[2] = fileSize & 0xFF;
        buffer[3] = (fileSize >> 8) & 0xFF;
        buffer[4] = (fileSize >> 16) & 0xFF;
        
        // Slot
        buffer[5] = slot;
        
        // Filename (12 bytes, ASCII only, truncate and pad with nulls)
        // Convert to ASCII by removing non-ASCII characters and truncating
        const asciiFilename = filename.replace(/[^\x00-\x7F]/g, '').substring(0, 12);
        for (let i = 0; i < asciiFilename.length && i < 12; i++) {
            buffer[6 + i] = asciiFilename.charCodeAt(i);
        }
        
        // Trailing nulls (already zero-initialized, but explicit for clarity)
        buffer[18] = 0x00;
        buffer[19] = 0x00;
        
        return buffer;
    }

    async uploadDlc(file, slot = 0, progressCallback = null) {
        const FILE_CHUNK_SIZE = 20;
        const CHUNK_DELAY = 5; // milliseconds
        
        let transferReady = false;
        let transferComplete = false;
        let transferError = null;

        // Setup file transfer listener
        const fileTransferHandler = (data) => {
            if (data.length < 2 || data[0] !== 0x24) return;
            
            const mode = data[1];
            this.log(`File transfer status: ${mode}`);
            
            // FileTransferMode enum values
            // 0x00: IDLE
            // 0x01: READY_TO_RECEIVE
            // 0x02: RECEIVING
            // 0x03: FILE_RECEIVED_OK
            // 0x04: FILE_RECEIVED_ERROR
            // 0x05: FILE_TRANSFER_TIMEOUT
            
            if (mode === 0x01) { // READY_TO_RECEIVE
                transferReady = true;
            } else if (mode === 0x03) { // FILE_RECEIVED_OK
                transferComplete = true;
            } else if (mode === 0x04) { // FILE_RECEIVED_ERROR
                transferError = "File transfer failed";
                transferComplete = true;
            } else if (mode === 0x05) { // FILE_TRANSFER_TIMEOUT
                transferError = "File transfer timeout";
                transferComplete = true;
            }
        };

        this.on('fileTransfer', fileTransferHandler);

        try {
            // Read file as array buffer
            const fileData = await file.arrayBuffer();
            const fileSize = fileData.byteLength;
            const fileName = file.name;

            this.log(`Uploading DLC: ${fileName} (${fileSize} bytes) to slot ${slot}`, 'info');

            // Enable Nordic packet ACK for monitoring
            await this.enableNordicPacketAck(true);

            // Announce DLC upload
            const announceCmd = this.buildDlcAnnounceCommand(fileSize, slot, fileName);
            await this.writeGp(announceCmd);

            // Wait for ready signal (timeout after 10 seconds)
            const readyTimeout = Date.now() + 10000;
            while (!transferReady && Date.now() < readyTimeout) {
                await new Promise(r => setTimeout(r, 100));
            }

            if (!transferReady) {
                throw new Error("Furby did not respond to DLC upload announcement");
            }

            this.log("Furby ready, uploading data...", 'info');

            // Upload file in chunks
            const dataView = new Uint8Array(fileData);
            let offset = 0;
            let chunkCount = 0;

            while (offset < fileSize) {
                const chunkEnd = Math.min(offset + FILE_CHUNK_SIZE, fileSize);
                const chunk = dataView.slice(offset, chunkEnd);
                
                await this.writeFile(chunk);
                offset = chunkEnd;
                chunkCount++;

                // Small delay to prevent overwhelming Furby
                await new Promise(r => setTimeout(r, CHUNK_DELAY));

                // Progress callback
                const progress = (offset / fileSize) * 100;
                if (progressCallback) {
                    progressCallback(progress, offset, fileSize);
                }

                // Progress logging every 100 chunks
                if (chunkCount % 100 === 0) {
                    this.log(`Upload progress: ${progress.toFixed(1)}%`, 'info');
                }
            }

            this.log(`Uploaded ${chunkCount} chunks, waiting for confirmation...`, 'info');

            // Wait for transfer complete (timeout after 60 seconds)
            const completeTimeout = Date.now() + 60000;
            while (!transferComplete && Date.now() < completeTimeout) {
                await new Promise(r => setTimeout(r, 100));
            }

            if (!transferComplete) {
                throw new Error("Timeout waiting for upload confirmation");
            }

            if (transferError) {
                throw new Error(transferError);
            }

            this.log("DLC upload complete!", 'success');

        } catch (error) {
            this.log(`DLC upload failed: ${error.message}`, 'error');
            throw error;
        } finally {
            // Remove listener
            this.off('fileTransfer', fileTransferHandler);
        }
    }

    async loadDlc(slot) {
        // Command to load DLC from slot
        const cmd = new Uint8Array([GeneralPlusCommand.LOAD_DLC, slot]);
        await this.writeGp(cmd);
        this.log(`Loading DLC from slot ${slot}`, 'info');
    }

    async activateDlc(slot) {
        // Command to activate DLC
        const cmd = new Uint8Array([GeneralPlusCommand.ACTIVATE_DLC, slot]);
        await this.writeGp(cmd);
        this.log(`Activating DLC in slot ${slot}`, 'info');
    }

    async deactivateDlc() {
        // Command to deactivate DLC
        const cmd = new Uint8Array([GeneralPlusCommand.DEACTIVATE_DLC]);
        await this.writeGp(cmd);
        this.log("Deactivating DLC", 'info');
    }

    async deleteDlcSlot(slot) {
        // Command to delete DLC from slot
        const cmd = new Uint8Array([GeneralPlusCommand.DELETE_DLC_SLOT, slot]);
        await this.writeGp(cmd);
        this.log(`Deleting DLC from slot ${slot}`, 'info');
    }
}
