(function(Scratch) {
  "use strict";

  var API = window.location.origin + '/api';

  var BOARD = {
    id: 'arduinoUno',
    name: 'Arduino Uno',
    color1: '#00979D',
    color2: '#007A7D',
    color3: '#005C5E',
    defaultPort: ''
  };

  var modeVal = { OUTPUT: 1, INPUT: 0, INPUT_PULLUP: 2 };
  var binVal = { HIGH: 1, LOW: 0 };

  var cmdNames = {
    setPinMode: 'pin_mode',
    digitalWrite: 'digital_write',
    digitalRead: 'digital_read',
    analogWrite: 'analog_write',
    analogRead: 'analog_read',
    setServoAngle: 'servo_write',
    ultrasonicSetup: 'ultrasonic_setup',
    ultrasonicRead: 'ultrasonic_read',
    getInfo: 'get_info',
    reset: 'reset'
  };

  function showPortPicker(ports) {
    return new Promise(function(resolve) {
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;';
      var dialog = document.createElement('div');
      dialog.style.cssText = 'background:#fff;border-radius:12px;padding:24px;min-width:340px;max-width:450px;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:Arial,sans-serif;';
      dialog.innerHTML = '<h3 style="margin:0 0 6px;color:#333;font-size:18px;">Select Serial Port</h3><p style="margin:0 0 12px;color:#666;font-size:13px;">Available ports:</p>';
      if (ports.length === 0) {
        dialog.innerHTML += '<p style="color:#999;font-size:14px;padding:12px 0;">No ports found. Make sure your Arduino is connected.</p>';
      } else {
        var list = document.createElement('div');
        list.style.cssText = 'max-height:280px;overflow-y:auto;';
        ports.forEach(function(p) {
          var btn = document.createElement('button');
          btn.textContent = p.path + (p.manufacturer ? ' (' + p.manufacturer + ')' : '');
          btn.style.cssText = 'display:block;width:100%;padding:12px 14px;margin:4px 0;border:1px solid #ddd;border-radius:6px;cursor:pointer;background:#f8f8f8;text-align:left;font-size:14px;';
          btn.onmouseover = function(){this.style.background='#e8f4f8';this.style.borderColor='#00979D';};
          btn.onmouseout = function(){this.style.background='#f8f8f8';this.style.borderColor='#ddd';};
          btn.onclick = function(){overlay.remove();resolve(p.path);};
          list.appendChild(btn);
        });
        dialog.appendChild(list);
      }
      var cancel = document.createElement('button');
      cancel.textContent = 'Cancel'; cancel.style.cssText = 'margin-top:14px;padding:10px 24px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#f0f0f0;font-size:14px;display:block;width:100%;';
      cancel.onmouseover = function(){this.style.background='#e0e0e0';};
      cancel.onmouseout = function(){this.style.background='#f0f0f0';};
      cancel.onclick = function(){overlay.remove();resolve(null);};
      dialog.appendChild(cancel);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  }

  function analogIndex(pin) {
    if (typeof pin === 'string' && pin.toUpperCase().startsWith('A')) {
      return parseInt(pin.substring(1), 10);
    }
    return parseInt(pin, 10);
  }

  function jsonFetch(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); }).catch(function() { return { error: 'fetch failed' }; });
  }

  function _did(d) { return d || (window.__hardwareConnection && window.__hardwareConnection.id) || null; }

  function sendCmd(deviceId, op, extra) {
    deviceId = _did(deviceId);
    if (!deviceId) return;
    var cmd = { cmd: cmdNames[op] || op };
    if (extra) { for (var k in extra) { if (extra.hasOwnProperty(k)) cmd[k] = extra[k]; } }
    return jsonFetch('/serial/send/' + deviceId, cmd);
  }

  function sendCmdWait(deviceId, op, extra, timeout) {
    deviceId = _did(deviceId);
    if (!deviceId) return Promise.resolve(0);
    var cmd = { cmd: cmdNames[op] || op, _wait: true, _timeout: timeout || 5000 };
    if (extra) { for (var k in extra) { if (extra.hasOwnProperty(k)) cmd[k] = extra[k]; } }
    return jsonFetch('/serial/send/' + deviceId, cmd).then(function(d) {
      if (d.success && d.response && d.response.value !== undefined) return d.response.value;
      return 0;
    });
  }

  class ArduinoUnoBlocks {
    constructor() {
      this._deviceId = null;
      this._connected = false;
      this._started = false;
    }

    getInfo() {
      return {
        id: BOARD.id,
        name: BOARD.name,
        color1: BOARD.color1,
        color2: BOARD.color2,
        color3: BOARD.color3,
        menuIconURI: '/static/extensions/arduino_uno/arduino_uno-small.svg',
        blocks: [
          { blockType: Scratch.BlockType.LABEL, text: '\u2699 Connection' },
          { opcode: 'onStart', blockType: Scratch.BlockType.HAT, text: 'when Arduino Uno start up', shouldRestartExistingThreads: true },
          { opcode: 'isConnected', blockType: Scratch.BlockType.BOOLEAN, text: 'connected?' },
          '---',
          { blockType: Scratch.BlockType.LABEL, text: 'Digital I/O' },
          { opcode: 'setPinMode', blockType: Scratch.BlockType.COMMAND, text: 'set pin [PIN] mode [MODE]', arguments: { PIN: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 13 }, MODE: { type: Scratch.ArgumentType.STRING, menu: 'MODE_MENU', defaultValue: 'OUTPUT' } } },
          { opcode: 'digitalWrite', blockType: Scratch.BlockType.COMMAND, text: 'digital write pin [PIN] [VALUE]', arguments: { PIN: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 13 }, VALUE: { type: Scratch.ArgumentType.STRING, menu: 'DIGITAL_VALUE_MENU', defaultValue: 'HIGH' } } },
          { opcode: 'digitalRead', blockType: Scratch.BlockType.REPORTER, text: 'digital read pin [PIN]', arguments: { PIN: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 7 } } },
          '---',
          { blockType: Scratch.BlockType.LABEL, text: 'Analog I/O' },
          { opcode: 'analogWrite', blockType: Scratch.BlockType.COMMAND, text: 'PWM pin [PIN] value [VALUE]', arguments: { PIN: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 9 }, VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 128, minimum: 0, maximum: 255 } } },
          { opcode: 'analogRead', blockType: Scratch.BlockType.REPORTER, text: 'analog read pin [PIN]', arguments: { PIN: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 'A0' } } },
          '---',
          { blockType: Scratch.BlockType.LABEL, text: 'Servo' },
          { opcode: 'setServoAngle', blockType: Scratch.BlockType.COMMAND, text: 'set servo pin [PIN] angle [ANGLE]', arguments: { PIN: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 9 }, ANGLE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 90, minimum: 0, maximum: 180 } } },
          '---',
          { blockType: Scratch.BlockType.LABEL, text: 'Sensors' },
          { opcode: 'ultrasonicDistance', blockType: Scratch.BlockType.REPORTER, text: 'ultrasonic trig [TRIG] echo [ECHO]', arguments: { TRIG: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 9 }, ECHO: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 10 } } },
          { opcode: 'readTemperature', blockType: Scratch.BlockType.REPORTER, text: 'temperature pin [PIN] sensor [SENSOR]', arguments: { PIN: { type: Scratch.ArgumentType.NUMBER, menu: 'PIN_MENU', defaultValue: 2 }, SENSOR: { type: Scratch.ArgumentType.STRING, menu: 'SENSOR_MENU', defaultValue: 'DHT11' } } }
        ],
        menus: {
          PIN_MENU: { acceptReporters: true, items: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','A0','A1','A2','A3','A4','A5'] },
          MODE_MENU: { acceptReporters: true, items: ['OUTPUT', 'INPUT', 'INPUT_PULLUP'] },
          DIGITAL_VALUE_MENU: { acceptReporters: true, items: ['HIGH', 'LOW'] },
          SENSOR_MENU: { acceptReporters: true, items: ['DHT11', 'DHT22', 'LM35'] }
        }
      };
    }

    onStart() {
      var self = this;
      if (!self._started) {
        self._started = true;
        setTimeout(function() { self.scanAndConnect(); }, 200);
      }
      return true;
    }

    connect(args) {
      var self = this;
      var port = args.PORT || BOARD.defaultPort;
      function doConnect(p) {
        return jsonFetch('/serial/connect', { path: p, baudRate: args.BAUD || 115200, boardType: 'arduino_uno' }).then(function(d) {
          if (d.success && d.device) { self._deviceId = d.device.id; self._connected = true; }
        });
      }
      if (!port) {
        return fetch(API + '/driver/find', { method: 'POST' }).then(function(r){return r.json();}).then(function(data){
          if (data.found) return doConnect(data.port);
          alert('No Arduino found. Make sure it is plugged in, then use "scan and connect".');
        });
      }
      return doConnect(port);
    }

    scanAndConnect() {
      var self = this;
      if(self._deviceId){self.disconnect();}
      return fetch(API + '/serial/ports').then(function(r){return r.json();}).then(function(data){
        return showPortPicker((data&&data.ports)||[]);
      }).then(function(path){
        if(!path) return;
        return jsonFetch('/serial/connect',{path:path,baudRate:115200,boardType:'arduino_uno'}).then(function(d){
          if(d.success&&d.device){self._deviceId=d.device.id;self._connected=true;alert('Connected to '+path);}
          else{alert('Connection failed: '+(d.error||'Unknown error'));}
        });
      });
    }

    disconnect() {
      if (this._deviceId) { jsonFetch('/serial/disconnect/' + this._deviceId, {}); }
      this._connected = false;
      this._deviceId = null;
    }

    isConnected() { return this._connected; }

    setPinMode(args) { sendCmd(this._deviceId, 'setPinMode', { pin: parseInt(args.PIN, 10), value: modeVal[args.MODE] !== undefined ? modeVal[args.MODE] : 1 }); }
    digitalWrite(args) { sendCmd(this._deviceId, 'digitalWrite', { pin: parseInt(args.PIN, 10), value: binVal[args.VALUE] !== undefined ? binVal[args.VALUE] : parseInt(args.VALUE, 10) }); }
    digitalRead(args) { return sendCmdWait(this._deviceId, 'digitalRead', { pin: parseInt(args.PIN, 10) }); }
    analogWrite(args) { sendCmd(this._deviceId, 'analogWrite', { pin: parseInt(args.PIN, 10), value: parseInt(args.VALUE, 10) }); }
    analogRead(args) { return sendCmdWait(this._deviceId, 'analogRead', { pin: analogIndex(args.PIN) }); }
    setServoAngle(args) { sendCmd(this._deviceId, 'setServoAngle', { pin: parseInt(args.PIN, 10), angle: parseInt(args.ANGLE, 10) }); }

    ultrasonicDistance(args) {
      var trig = parseInt(args.TRIG, 10);
      var echo = parseInt(args.ECHO, 10);
      sendCmd(this._deviceId, 'ultrasonicSetup', { trig: trig, echo: echo });
      return sendCmdWait(this._deviceId, 'ultrasonicRead', { pin: trig });
    }

    readTemperature(args) { return 0; }
  }

  Scratch.extensions.register(new ArduinoUnoBlocks());
})(Scratch);
