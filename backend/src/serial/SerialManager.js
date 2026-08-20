/**
 * Serial Manager
 * Handles USB Serial connections using the serialport library
 * Supports automatic port detection, reconnection, and multi-device management
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class SerialManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.connections = new Map(); // deviceId -> { port, parser, info, callbacks }
    this.autoReconnect = true;
    this.reconnectInterval = 5000;
    this.monitorBuffers = new Map(); // deviceId -> { seq: number, lines: {seq:number, text:string}[] }
    this.maxMonitorLines = 500;
  }

  /**
   * List all available serial ports
   */
  async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer || 'Unknown',
        serialNumber: port.serialNumber || '',
        vendorId: port.vendorId || '',
        productId: port.productId || '',
        friendlyName: this.getFriendlyName(port)
      }));
    } catch (err) {
      this.logger.error(`Failed to list ports: ${err.message}`);
      throw err;
    }
  }

  /**
   * Connect to a serial port
   */
  async connect(path, options = {}) {
    const baudRate = options.baudRate || 115200;
    const boardType = options.boardType || 'arduino';

    for (const [existingId, conn] of this.connections) {
      if (conn.info.path === path) {
        this.logger.info(`Closing existing connection to ${path} before reconnecting`);
        try { await this.disconnect(existingId); } catch (_) {}
        break;
      }
    }
    
    return new Promise((resolve, reject) => {
      try {
        const port = new SerialPort({
          path,
          baudRate,
          autoOpen: false
        });

        const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
        
        const deviceId = uuidv4();
        const deviceInfo = {
          id: deviceId,
          path,
          baudRate,
          boardType,
          connected: false,
          connectedAt: null,
          lastData: null,
          reconnectAttempts: 0,
          autoReconnect: true,
          callbacks: new Map()
        };

        port.on('open', () => {
          deviceInfo.connected = true;
          deviceInfo.connectedAt = Date.now();
          deviceInfo.reconnectAttempts = 0;
          this.logger.info(`Serial port opened: ${path} (${boardType})`);
          
          // Board resets on serial open (DTR). Wait for bootloader to finish and sketch to start
          setTimeout(() => {
            deviceInfo.connected = true;
            this.sendCommand(deviceId, { cmd: 'get_info' });
            resolve(deviceInfo);
          }, 2000);
        });

        port.on('close', () => {
          deviceInfo.connected = false;
          this.logger.warn(`Serial port closed: ${path}`);
          this.emit('disconnected', deviceId);

          if (deviceInfo.autoReconnect) {
            this.scheduleReconnect(deviceId, path, options);
          }
        });

        port.on('error', (err) => {
          this.logger.error(`Serial port error on ${path}: ${err.message}`);
          reject(err);
        });

        parser.on('data', (data) => {
          deviceInfo.lastData = Date.now();
          this.handleIncomingData(deviceId, data);
        });

        port.open((err) => {
          if (err) {
            reject(err);
          }
        });

        this.connections.set(deviceId, { port, parser, info: deviceInfo });
        
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Disconnect from a device
   * Drops DTR first to trigger Arduino bootloader reset, then closes the port.
   */
  async disconnect(deviceId, skipDtr = false) {
    const conn = this.connections.get(deviceId);
    if (!conn) return;

    conn.info.autoReconnect = false;

    return new Promise((resolve) => {
      const doClose = () => {
        conn.port.close((closeErr) => {
          if (closeErr) {
            this.logger.error(`Error closing port: ${closeErr.message}`);
          }
          this.connections.delete(deviceId);
          this.logger.info(`Disconnected device: ${deviceId}`);
          resolve();
        });
      };

      if (skipDtr) {
        doClose();
      } else {
        // Drop DTR to reset the Arduino (falling edge triggers bootloader)
        conn.port.set({ dtr: false, rts: false }, (setErr) => {
          if (setErr) {
            this.logger.error(`Error setting DTR: ${setErr.message}`);
          }
          setTimeout(doClose, 200);
        });
      }
    });
  }

  /**
   * Reset Arduino into bootloader via DTR toggle at normal baud rate.
   * Opens the port at 115200 baud, drops DTR to trigger the reset,
   * waits for bootloader to start, then closes.
   */
  async resetToBootloader(path) {
    return new Promise((resolve) => {
      const resetPort = new SerialPort({
        path,
        baudRate: 115200,
        autoOpen: false
      });
      resetPort.open((err) => {
        if (err) {
          this.logger.warn(`DTR reset open failed (${err.message}), board may not reset`);
          resolve();
          return;
        }
        // Drop DTR to reset the board (falling edge triggers bootloader)
        resetPort.set({ dtr: false, rts: false }, () => {
          setTimeout(() => {
            resetPort.close(() => {
              resolve();
            });
          }, 500);
        });
      });
    });
  }

  /**
   * Disconnect all devices on a given port
   */
  async disconnectByPort(portPath, { skipDtr = false } = {}) {
    const toDisconnect = [];
    for (const [id, conn] of this.connections) {
      if (conn.info.path === portPath) {
        toDisconnect.push(id);
      }
    }
    await Promise.all(toDisconnect.map(id => this.disconnect(id, skipDtr)));
  }

  async disconnectAll() {
    const promises = Array.from(this.connections.keys()).map(id => this.disconnect(id));
    await Promise.all(promises);
  }

  /**
   * Send a command to a device
   */
  sendCommand(deviceId, command) {
    const conn = this.connections.get(deviceId);
    if (!conn || !conn.info.connected) {
      this.logger.warn(`Cannot send to disconnected device: ${deviceId}`);
      return false;
    }

    try {
      const cmdStr = typeof command === 'string' ? command + '\n' : JSON.stringify(command) + '\n';
      conn.port.write(cmdStr, (err) => {
        if (err) {
          this.logger.error(`Write error: ${err.message}`);
        }
      });
      return true;
    } catch (err) {
      this.logger.error(`Send command failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Register data callback for a device
   */
  onDeviceData(deviceId, callback) {
    const conn = this.connections.get(deviceId);
    if (conn) {
      const callbackId = uuidv4();
      conn.info.callbacks.set(callbackId, callback);
      return callbackId;
    }
    return null;
  }

  /**
   * Remove data callback
   */
  offDeviceData(deviceId, callbackId) {
    const conn = this.connections.get(deviceId);
    if (conn) {
      conn.info.callbacks.delete(callbackId);
    }
  }

  /**
   * Send a command and wait for a response
   */
  sendCommandAndWait(deviceId, command, timeout) {
    const conn = this.connections.get(deviceId);
    if (!conn || !conn.info.connected) {
      this.logger.warn(`Cannot send to disconnected device: ${deviceId}`);
      return Promise.resolve({ error: 'not connected' });
    }

    return new Promise((resolve) => {
      conn.info._pendingResponse = resolve;
      
      const timer = setTimeout(() => {
        if (conn.info._pendingResponse === resolve) {
          conn.info._pendingResponse = null;
          resolve({ error: 'timeout', value: 0 });
        }
      }, timeout || 5000);

      try {
        const cmdStr = JSON.stringify(command) + '\n';
        conn.port.write(cmdStr, (err) => {
          if (err) {
            if (conn.info._pendingResponse === resolve) {
              clearTimeout(timer);
              conn.info._pendingResponse = null;
              resolve({ error: err.message, value: 0 });
            }
          }
        });
      } catch (err) {
        if (conn.info._pendingResponse === resolve) {
          clearTimeout(timer);
          conn.info._pendingResponse = null;
          resolve({ error: err.message, value: 0 });
        }
      }
    });
  }

  /**
   * Handle incoming serial data
   */
  handleIncomingData(deviceId, data) {
    const conn = this.connections.get(deviceId);
    if (!conn) return;

    try {
      const trimmed = data.trim();
      if (!trimmed) return;

      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = { raw: trimmed };
      }

      // Add to monitor buffer
      this.addMonitorLine(deviceId, trimmed);

      // Resolve pending response if this is a response/ack
      if (parsed.response || parsed.ack) {
        const resolve = conn.info._pendingResponse;
        if (resolve) {
          conn.info._pendingResponse = null;
          resolve(parsed);
          return;
        }
      }

      // Notify all callbacks
      conn.info.callbacks.forEach(callback => {
        try {
          callback(parsed);
        } catch (err) {
          this.logger.error(`Callback error: ${err.message}`);
        }
      });

      // Emit for other listeners
      this.emit('data', { deviceId, data: parsed });
      
    } catch (err) {
      this.logger.error(`Data handling error: ${err.message}`);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect(deviceId, path, options) {
    const conn = this.connections.get(deviceId);
    if (!conn) return;
    
    conn.info.reconnectAttempts++;
    this.logger.info(`Scheduling reconnect for ${path} (attempt ${conn.info.reconnectAttempts})`);
    
    setTimeout(async () => {
      if (!conn.info.connected) {
        try {
          await this.connect(path, options);
        } catch (err) {
          this.logger.error(`Reconnect failed: ${err.message}`);
        }
      }
    }, this.reconnectInterval);
  }

  /**
   * Get a friendly name for the port
   */
  getFriendlyName(portInfo) {
    const knownDevices = {
      '2341': 'Arduino',
      '1a86': 'CH340 (Arduino Nano Clone)',
      '10c4': 'CP210x (ESP32)',
      '0403': 'FT232 (Arduino)',
      '0483': 'STLink',
      '239a': 'Adafruit',
      '2a03': 'Arduino SRL'
    };
    
    if (portInfo.vendorId) {
      const vid = portInfo.vendorId.toLowerCase();
      if (knownDevices[vid]) {
        return knownDevices[vid];
      }
    }
    
    if (portInfo.manufacturer) {
      return portInfo.manufacturer;
    }
    
    return 'Unknown Device';
  }

  /**
   * Get all active connections
   */
  getConnections() {
    return Array.from(this.connections.values()).map(c => ({
      ...c.info,
      callbacks: undefined
    }));
  }

  /**
   * Get connection by device ID
   */
  getConnection(deviceId) {
    return this.connections.get(deviceId);
  }

  addMonitorLine(deviceId, line) {
    if (!this.monitorBuffers.has(deviceId)) {
      this.monitorBuffers.set(deviceId, { seq: 0, lines: [] });
    }
    const buf = this.monitorBuffers.get(deviceId);
    const entry = { seq: buf.seq, text: line };
    buf.seq++;
    buf.lines.push(entry);
    if (buf.lines.length > this.maxMonitorLines) {
      buf.lines.splice(0, buf.lines.length - this.maxMonitorLines);
    }
    this.emit('monitorData', { deviceId, line });
  }

  getMonitorBuffer(deviceId) {
    const buf = this.monitorBuffers.get(deviceId);
    return buf ? buf.lines : [];
  }

  getMonitorBufferSince(deviceId, minSeq) {
    const buf = this.monitorBuffers.get(deviceId);
    if (!buf) return { lines: [], nextSeq: 0 };
    const lines = buf.lines.filter(e => e.seq >= minSeq);
    const nextSeq = lines.length > 0 ? lines[lines.length - 1].seq + 1 : minSeq;
    return { lines, nextSeq };
  }

  clearMonitorBuffer(deviceId) {
    this.monitorBuffers.set(deviceId, { seq: 0, lines: [] });
  }

  writeRaw(deviceId, text) {
    const conn = this.connections.get(deviceId);
    if (!conn || !conn.info.connected) return false;
    try {
      conn.port.write(text, (err) => {
        if (err) this.logger.error(`Serial monitor write error: ${err.message}`);
      });
      return true;
    } catch (err) {
      this.logger.error(`Serial monitor write failed: ${err.message}`);
      return false;
    }
  }
}

module.exports = SerialManager;
