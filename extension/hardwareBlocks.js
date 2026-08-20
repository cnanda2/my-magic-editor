(function(Scratch) {
  "use strict";

  class HardwareBlocks {
    constructor() {
      this.connectedDevices = new Map();
      this._ws = null;
      this._wsCallbacks = [];
    }

    getInfo() {
      return {
        id: 'hardwareBlocks',
        name: 'Hardware Blocks',
        color1: '#00979D',
        color2: '#007A7D',
        color3: '#005C5E',
        menuIcon: '',
        docsURI: 'https://docs.arduino.cc/',
        blocks: [
          {
            opcode: 'connectToArduino',
            blockType: Scratch.BlockType.COMMAND,
            text: 'connect to Arduino on [PORT] at [BAUD] baud',
            arguments: {
              PORT: {
                type: Scratch.ArgumentType.STRING,
                menu: 'PORT_MENU',
                defaultValue: 'COM3'
              },
              BAUD: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 9600
              }
            }
          },
          {
            opcode: 'connectToESP32',
            blockType: Scratch.BlockType.COMMAND,
            text: 'connect to ESP32 at [URL]',
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'ws://192.168.1.100/ws'
              }
            }
          },
          {
            opcode: 'disconnectDevice',
            blockType: Scratch.BlockType.COMMAND,
            text: 'disconnect from device [DEVICE]',
            arguments: {
              DEVICE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'DEVICE_MENU',
                defaultValue: ''
              }
            }
          },
          {
            opcode: 'isDeviceConnected',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'is device [DEVICE] connected?',
            arguments: {
              DEVICE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'DEVICE_MENU',
                defaultValue: ''
              }
            }
          },
          {
            opcode: 'getConnectedDevices',
            blockType: Scratch.BlockType.REPORTER,
            text: 'get connected devices',
            disableMonitor: false
          },
          {
            opcode: 'onDeviceConnected',
            blockType: Scratch.BlockType.HAT,
            text: 'on device [DEVICE] connected',
            arguments: {
              DEVICE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'DEVICE_MENU',
                defaultValue: ''
              }
            }
          },
          '---',
          {
            opcode: 'setPinMode',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set pin [PIN] mode [MODE]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 13
              },
              MODE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'MODE_MENU',
                defaultValue: 'OUTPUT'
              }
            }
          },
          {
            opcode: 'digitalWrite',
            blockType: Scratch.BlockType.COMMAND,
            text: 'digital write pin [PIN] [VALUE]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 13
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'DIGITAL_VALUE_MENU',
                defaultValue: 'HIGH'
              }
            }
          },
          {
            opcode: 'digitalRead',
            blockType: Scratch.BlockType.REPORTER,
            text: 'digital read pin [PIN]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 7
              }
            }
          },
          {
            opcode: 'onPinChange',
            blockType: Scratch.BlockType.HAT,
            text: 'on pin [PIN] change to [VALUE]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 2
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'DIGITAL_VALUE_MENU',
                defaultValue: 'HIGH'
              }
            }
          },
          '---',
          {
            opcode: 'analogWrite',
            blockType: Scratch.BlockType.COMMAND,
            text: 'analog write pin [PIN] [VALUE]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 9
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 128,
                minimum: 0,
                maximum: 255
              }
            }
          },
          {
            opcode: 'analogRead',
            blockType: Scratch.BlockType.REPORTER,
            text: 'analog read pin [PIN]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 'A0'
              }
            }
          },
          {
            opcode: 'setPwmFrequency',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set PWM frequency [PIN] [FREQ]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 9
              },
              FREQ: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 5000
              }
            }
          },
          '---',
          {
            opcode: 'setServoAngle',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set servo on pin [PIN] to angle [ANGLE]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 9
              },
              ANGLE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 90,
                minimum: 0,
                maximum: 180
              }
            }
          },
          {
            opcode: 'setServoSpeed',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set servo speed [PIN] [SPEED]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 9
              },
              SPEED: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 50,
                minimum: 0,
                maximum: 100
              }
            }
          },
          '---',
          {
            opcode: 'ultrasonicDistance',
            blockType: Scratch.BlockType.REPORTER,
            text: 'ultrasonic distance trig [TRIG] echo [ECHO]',
            arguments: {
              TRIG: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 9
              },
              ECHO: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 10
              }
            }
          },
          {
            opcode: 'readTemperature',
            blockType: Scratch.BlockType.REPORTER,
            text: 'read temperature [PIN] sensor [SENSOR]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 2
              },
              SENSOR: {
                type: Scratch.ArgumentType.STRING,
                menu: 'SENSOR_MENU',
                defaultValue: 'DHT11'
              }
            }
          },
          {
            opcode: 'readHumidity',
            blockType: Scratch.BlockType.REPORTER,
            text: 'read humidity [PIN]',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 2
              }
            }
          },
          '---',
          {
            opcode: 'oledInitialize',
            blockType: Scratch.BlockType.COMMAND,
            text: 'OLED initialize [WIDTH] [HEIGHT] address [ADDR]',
            arguments: {
              WIDTH: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 128
              },
              HEIGHT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 64
              },
              ADDR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '0x3C'
              }
            }
          },
          {
            opcode: 'oledClear',
            blockType: Scratch.BlockType.COMMAND,
            text: 'OLED clear display'
          },
          {
            opcode: 'oledPrint',
            blockType: Scratch.BlockType.COMMAND,
            text: 'OLED print [TEXT] line [LINE]',
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello'
              },
              LINE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            }
          },
          {
            opcode: 'oledShowText',
            blockType: Scratch.BlockType.COMMAND,
            text: 'OLED show text [TEXT] at x [X] y [Y]',
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello'
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            }
          },
          '---',
          {
            opcode: 'neoPixelInit',
            blockType: Scratch.BlockType.COMMAND,
            text: 'NeoPixel initialize on pin [PIN] with [COUNT] LEDs',
            arguments: {
              PIN: {
                type: Scratch.ArgumentType.NUMBER,
                menu: 'PIN_MENU',
                defaultValue: 6
              },
              COUNT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 8
              }
            }
          },
          {
            opcode: 'neoPixelSetLed',
            blockType: Scratch.BlockType.COMMAND,
            text: 'NeoPixel set LED [INDEX] color [COLOR]',
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              COLOR: {
                type: Scratch.ArgumentType.STRING,
                menu: 'COLOR_MENU',
                defaultValue: 'red'
              }
            }
          },
          {
            opcode: 'neoPixelShow',
            blockType: Scratch.BlockType.COMMAND,
            text: 'NeoPixel show'
          },
          {
            opcode: 'neoPixelClear',
            blockType: Scratch.BlockType.COMMAND,
            text: 'NeoPixel clear'
          },
          {
            opcode: 'neoPixelSetBrightness',
            blockType: Scratch.BlockType.COMMAND,
            text: 'NeoPixel set brightness [BRIGHTNESS]',
            arguments: {
              BRIGHTNESS: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 50,
                minimum: 0,
                maximum: 255
              }
            }
          },
          '---',
          {
            opcode: 'i2cWrite',
            blockType: Scratch.BlockType.COMMAND,
            text: 'I2C write to address [ADDR] register [REG] value [VALUE]',
            arguments: {
              ADDR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '0x68'
              },
              REG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '0x00'
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              }
            }
          },
          {
            opcode: 'i2cRead',
            blockType: Scratch.BlockType.REPORTER,
            text: 'I2C read from address [ADDR] register [REG]',
            arguments: {
              ADDR: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '0x68'
              },
              REG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '0x00'
              }
            }
          },
          {
            opcode: 'i2cScan',
            blockType: Scratch.BlockType.REPORTER,
            text: 'I2C scan'
          },
          {
            opcode: 'spiTransfer',
            blockType: Scratch.BlockType.REPORTER,
            text: 'SPI transfer [DATA]',
            arguments: {
              DATA: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '0x00'
              }
            }
          },
          '---',
          {
            opcode: 'wifiConnect',
            blockType: Scratch.BlockType.COMMAND,
            text: 'WiFi connect SSID [SSID] password [PASS]',
            arguments: {
              SSID: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'MyNetwork'
              },
              PASS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: ''
              }
            }
          },
          {
            opcode: 'wifiStatus',
            blockType: Scratch.BlockType.REPORTER,
            text: 'WiFi status'
          },
          {
            opcode: 'scanWifi',
            blockType: Scratch.BlockType.REPORTER,
            text: 'scan WiFi networks'
          },
          {
            opcode: 'bleAdvertise',
            blockType: Scratch.BlockType.COMMAND,
            text: 'BLE advertise name [NAME]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'ScratchDevice'
              }
            }
          },
          {
            opcode: 'sendWebSocket',
            blockType: Scratch.BlockType.COMMAND,
            text: 'send WebSocket message [MESSAGE]',
            arguments: {
              MESSAGE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'hello'
              }
            }
          },
          {
            opcode: 'onWebSocketMessage',
            blockType: Scratch.BlockType.HAT,
            text: 'on WebSocket message',
            shouldRestartExistingThreads: true
          }
        ],
        menus: {
          PORT_MENU: {
            acceptReporters: true,
            items: 'getPorts'
          },
          COLOR_MENU: {
            acceptReporters: true,
            items: ['red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'white', 'orange', 'purple']
          },
          PIN_MENU: {
            acceptReporters: true,
            items: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5']
          },
          DEVICE_MENU: {
            acceptReporters: true,
            items: 'getDeviceList'
          },
          MODE_MENU: {
            acceptReporters: true,
            items: ['OUTPUT', 'INPUT', 'INPUT_PULLUP']
          },
          DIGITAL_VALUE_MENU: {
            acceptReporters: true,
            items: ['HIGH', 'LOW']
          },
          SENSOR_MENU: {
            acceptReporters: true,
            items: ['DHT11', 'DHT22', 'LM35']
          }
        }
      };
    }

    getPorts() {
      return new Promise((resolve) => {
        fetch(window.location.origin + '/api/serial/ports')
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) {
              resolve(data.map((p) => (typeof p === 'string' ? p : p.path || p.name || String(p))));
            } else {
              resolve(['COM3', 'COM5', 'COM7', '/dev/ttyUSB0', '/dev/ttyACM0']);
            }
          })
          .catch(() => {
            resolve(['COM3', 'COM5', 'COM7', '/dev/ttyUSB0', '/dev/ttyACM0']);
          });
      });
    }

    getDeviceList() {
      const devices = [];
      for (const id of this.connectedDevices.keys()) {
        devices.push(id);
      }
      return devices.length ? devices : ['No devices'];
    }

    _sendCommand(deviceId, command) {
      const payload = JSON.stringify(command);
      return fetch(`${window.location.origin}/api/serial/send/${encodeURIComponent(deviceId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      })
        .then((r) => r.json())
        .catch((err) => {
          console.warn('HardwareBlocks: sendCommand error', err);
          return { error: err.message };
        });
    }

    _getDevice() {
      for (const id of this.connectedDevices.keys()) {
        return id;
      }
      return null;
    }

    _ensureConnected() {
      return this.connectedDevices.size > 0;
    }

    _addDevice(id, info) {
      this.connectedDevices.set(id, Object.assign({ connected: true }, info));
    }

    connectToArduino(args) {
      const port = args.PORT;
      const baud = args.BAUD;
      const deviceId = `arduino_${port}`;
      this._addDevice(deviceId, { type: 'arduino', path: port, baud: baud });
      this._sendCommand(deviceId, { command: 'connect', port: port, baud: baud });
    }

    connectToESP32(args) {
      const url = args.URL;
      const deviceId = `esp32_${url}`;
      this._addDevice(deviceId, { type: 'esp32', path: url });
      this._sendCommand(deviceId, { command: 'connect_esp32', url: url });
      try {
        this._ws = new WebSocket(url);
        this._ws.onopen = () => {};
        this._ws.onmessage = (e) => {
          this._lastWsMessage = e.data;
          for (const cb of this._wsCallbacks) {
            try { cb(e.data); } catch (_) {}
          }
        };
        this._ws.onerror = () => {};
        this._ws.onclose = () => {};
      } catch (_) {}
    }

    disconnectDevice(args) {
      const deviceId = args.DEVICE;
      if (this.connectedDevices.has(deviceId)) {
        this._sendCommand(deviceId, { command: 'disconnect' });
        this.connectedDevices.delete(deviceId);
      }
      if (this._ws && deviceId.startsWith('esp32_')) {
        try { this._ws.close(); } catch (_) {}
        this._ws = null;
      }
    }

    isDeviceConnected(args) {
      const deviceId = args.DEVICE;
      return this.connectedDevices.has(deviceId);
    }

    getConnectedDevices() {
      return Array.from(this.connectedDevices.keys()).join(', ');
    }

    onDeviceConnected(args) {
      const deviceId = args.DEVICE;
      return this.connectedDevices.has(deviceId);
    }

    setPinMode(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'pinMode', pin: args.PIN, mode: args.MODE });
    }

    digitalWrite(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'digitalWrite', pin: args.PIN, value: args.VALUE });
    }

    digitalRead(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return 0;
      try {
        const result = this._sendCommand(deviceId, { command: 'digitalRead', pin: args.PIN });
        return result.value !== undefined ? result.value : 0;
      } catch (_) {
        return 0;
      }
    }

    onPinChange(args) {
      return false;
    }

    analogWrite(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'analogWrite', pin: args.PIN, value: args.VALUE });
    }

    analogRead(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return 0;
      try {
        const result = this._sendCommand(deviceId, { command: 'analogRead', pin: args.PIN });
        return result.value !== undefined ? result.value : 0;
      } catch (_) {
        return 0;
      }
    }

    setPwmFrequency(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'pwmFrequency', pin: args.PIN, frequency: args.FREQ });
    }

    setServoAngle(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'servoAngle', pin: args.PIN, angle: args.ANGLE });
    }

    setServoSpeed(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'servoSpeed', pin: args.PIN, speed: args.SPEED });
    }

    ultrasonicDistance(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return -1;
      try {
        const result = this._sendCommand(deviceId, { command: 'ultrasonic', trig: args.TRIG, echo: args.ECHO });
        return result.distance !== undefined ? result.distance : -1;
      } catch (_) {
        return -1;
      }
    }

    readTemperature(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return -1;
      try {
        const result = this._sendCommand(deviceId, { command: 'temperature', pin: args.PIN, sensor: args.SENSOR });
        return result.temperature !== undefined ? result.temperature : -1;
      } catch (_) {
        return -1;
      }
    }

    readHumidity(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return -1;
      try {
        const result = this._sendCommand(deviceId, { command: 'humidity', pin: args.PIN });
        return result.humidity !== undefined ? result.humidity : -1;
      } catch (_) {
        return -1;
      }
    }

    oledInitialize(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'oledInit', width: args.WIDTH, height: args.HEIGHT, addr: args.ADDR });
    }

    oledClear(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'oledClear' });
    }

    oledPrint(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'oledPrint', text: args.TEXT, line: args.LINE });
    }

    oledShowText(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'oledShowText', text: args.TEXT, x: args.X, y: args.Y });
    }

    neoPixelInit(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'neoPixelInit', pin: args.PIN, count: args.COUNT });
    }

    neoPixelSetLed(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'neoPixelSetLed', index: args.INDEX, color: args.COLOR });
    }

    neoPixelShow(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'neoPixelShow' });
    }

    neoPixelClear(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'neoPixelClear' });
    }

    neoPixelSetBrightness(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'neoPixelBrightness', brightness: args.BRIGHTNESS });
    }

    i2cWrite(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'i2cWrite', addr: args.ADDR, reg: args.REG, value: args.VALUE });
    }

    i2cRead(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return 0;
      try {
        const result = this._sendCommand(deviceId, { command: 'i2cRead', addr: args.ADDR, reg: args.REG });
        return result.value !== undefined ? result.value : 0;
      } catch (_) {
        return 0;
      }
    }

    i2cScan(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return '';
      try {
        const result = this._sendCommand(deviceId, { command: 'i2cScan' });
        return result.addresses ? result.addresses.join(', ') : '';
      } catch (_) {
        return '';
      }
    }

    spiTransfer(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return 0;
      try {
        const result = this._sendCommand(deviceId, { command: 'spiTransfer', data: args.DATA });
        return result.response !== undefined ? result.response : 0;
      } catch (_) {
        return 0;
      }
    }

    wifiConnect(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'wifiConnect', ssid: args.SSID, password: args.PASS });
    }

    wifiStatus(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return 'NOT_CONNECTED';
      try {
        const result = this._sendCommand(deviceId, { command: 'wifiStatus' });
        return result.status || 'NOT_CONNECTED';
      } catch (_) {
        return 'NOT_CONNECTED';
      }
    }

    scanWifi(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return '';
      try {
        const result = this._sendCommand(deviceId, { command: 'wifiScan' });
        return result.networks ? result.networks.join(', ') : '';
      } catch (_) {
        return '';
      }
    }

    bleAdvertise(args) {
      const deviceId = this._getDevice();
      if (!deviceId) return;
      this._sendCommand(deviceId, { command: 'bleAdvertise', name: args.NAME });
    }

    sendWebSocket(args) {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.send(args.MESSAGE);
      } else {
        const deviceId = this._getDevice();
        if (deviceId) {
          this._sendCommand(deviceId, { command: 'websocketSend', message: args.MESSAGE });
        }
      }
    }

    onWebSocketMessage(args, util) {
      if (!this._lastWsMessage) return false;
      const msg = this._lastWsMessage;
      this._lastWsMessage = null;
      if (util && util.yield) {
        util.yield();
      }
      return msg !== undefined;
    }
  }

  Scratch.extensions.register(new HardwareBlocks());
})(Scratch);
