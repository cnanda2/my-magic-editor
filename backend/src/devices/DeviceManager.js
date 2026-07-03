/**
 * Device Manager
 * Manages all connected hardware devices (serial and websocket)
 * Handles auto-discovery and reconnection
 */

const { SerialPort } = require('serialport');
const EventEmitter = require('events');

class DeviceManager extends EventEmitter {
  constructor(logger, serialManager, wsManager) {
    super();
    this.logger = logger;
    this.serialManager = serialManager;
    this.wsManager = wsManager;
    this.devices = new Map(); // Unified device registry
    this.discoveryActive = false;
    this.discoveryInterval = null;
    this.preferredPorts = [];
  }

  /**
   * Start automatic device discovery
   */
  startDiscovery() {
    if (this.discoveryActive) return;
    
    this.discoveryActive = true;
    this.logger.info('Starting device discovery');
    
    this.discoveryInterval = setInterval(async () => {
      await this.scanForDevices();
    }, 3000);
    
    // Initial scan
    this.scanForDevices();
  }

  /**
   * Stop device discovery
   */
  stopDiscovery() {
    this.discoveryActive = false;
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    this.logger.info('Device discovery stopped');
  }

  /**
   * Scan for new devices and auto-connect
   */
  async scanForDevices() {
    try {
      const ports = await SerialPort.list();
      const knownPaths = new Set(
        Array.from(this.devices.values())
          .filter(d => d.type === 'serial')
          .map(d => d.path)
      );

      for (const port of ports) {
        if (!knownPaths.has(port.path) && this.isInterestingPort(port)) {
          this.logger.info(`New device detected: ${port.path} (${port.manufacturer || 'Unknown'})`);
          this.emit('device_found', {
            path: port.path,
            manufacturer: port.manufacturer,
            type: 'serial'
          });
        }
      }
    } catch (err) {
      this.logger.error(`Discovery scan failed: ${err.message}`);
    }
  }

  /**
   * Check if port is likely a microcontroller
   */
  isInterestingPort(port) {
    const interestingVendors = [
      '2341', // Arduino
      '1a86', // CH340
      '10c4', // CP210x (ESP32)
      '0403', // FTDI
      '0483', // ST Micro
      '239a', // Adafruit
      '2a03', // Arduino SRL
      '303a', // Espressif (ESP32-S2/C3)
      '1366'  // Nordic (nRF)
    ];

    if (port.vendorId && interestingVendors.includes(port.vendorId.toLowerCase())) {
      return true;
    }

    if (port.manufacturer) {
      const name = port.manufacturer.toLowerCase();
      if (name.includes('arduino') || 
          name.includes('esp') || 
          name.includes('ch340') || 
          name.includes('cp210') ||
          name.includes('ftdi') ||
          name.includes('serial')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Register a device in the unified registry
   */
  registerDevice(deviceInfo) {
    const id = deviceInfo.id || `device_${Date.now()}`;
    const device = {
      id,
      type: deviceInfo.type || 'serial',
      boardType: deviceInfo.boardType || 'unknown',
      name: deviceInfo.name || `${deviceInfo.boardType || 'Device'} (${id.slice(0, 8)})`,
      connected: true,
      connectedAt: Date.now(),
      path: deviceInfo.path || null,
      url: deviceInfo.url || null,
      capabilities: deviceInfo.capabilities || [],
      metadata: deviceInfo.metadata || {}
    };

    this.devices.set(id, device);
    this.emit('device_registered', device);
    this.logger.info(`Device registered: ${device.name}`);
    return device;
  }

  /**
   * Unregister a device
   */
  unregisterDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      this.emit('device_unregistered', device);
    }
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId);
  }

  /**
   * Get all devices
   */
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get connected devices
   */
  getConnectedDevices() {
    return Array.from(this.devices.values()).filter(d => d.connected);
  }

  /**
   * Check for auto-reconnect on disconnected devices
   */
  async checkAutoReconnect() {
    for (const [id, device] of this.devices) {
      if (!device.connected && device.autoReconnect !== false) {
        if (device.type === 'serial' && device.path) {
          this.logger.info(`Auto-reconnecting to ${device.path}`);
          try {
            await this.serialManager.connect(device.path, {
              boardType: device.boardType,
              baudRate: 115200
            });
          } catch (err) {
            this.logger.error(`Auto-reconnect failed for ${device.path}: ${err.message}`);
          }
        }
      }
    }
  }

  /**
   * Update device status
   */
  updateDeviceStatus(deviceId, status) {
    const device = this.devices.get(deviceId);
    if (device) {
      Object.assign(device, status);
      this.emit('device_updated', device);
    }
  }

  /**
   * Add device capability
   */
  addCapability(deviceId, capability) {
    const device = this.devices.get(deviceId);
    if (device && !device.capabilities.includes(capability)) {
      device.capabilities.push(capability);
    }
  }
}

module.exports = DeviceManager;
