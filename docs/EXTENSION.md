# Extension Development Guide

The Hardware Blocks TurboWarp extension (`extension/hardwareBlocks.js`) provides 50+ hardware programming blocks for Arduino and ESP32 boards within the TurboWarp Scratch environment.

---

## How to Load the Extension in TurboWarp

### In TurboWarp Editor

1. Open TurboWarp at https://turbowarp.org/editor
2. Click the "Extensions" icon (puzzle piece, bottom-left)
3. Click "Custom Extension"
4. Enter the URL: `http://localhost:3001/extension/hardwareBlocks.js` (when running locally)
5. The Hardware Blocks category will appear in the block palette

### Loading from a Local File

1. In TurboWarp, go to Settings → Extensions
2. Click "Load from file"
3. Select `extension/hardwareBlocks.js` from the project directory

### Via URL

Serve the extension file via any static file server or use the provided backend:

```bash
# The extension is automatically served by the backend
# Available at: http://localhost:3001/extension/hardwareBlocks.js
```

---

## Extension Architecture

The extension is a single JavaScript file that registers a class with the TurboWarp Scratch VM.

### Structure

```
extension/hardwareBlocks.js
├── (function(Scratch) { ... })(Scratch)  // IIFE wrapper
│   └── class HardwareBlocks
│       ├── constructor()
│       │   ├── connectedDevices: Map
│       │   ├── _ws: WebSocket (ESP32)
│       │   └── _wsCallbacks: Array
│       ├── getInfo()
│       │   └── Returns: { id, name, color1-3, blocks[], menus{} }
│       ├── Dynamic menus: getPorts(), getDeviceList()
│       ├── Device management blocks
│       ├── Digital/Analog I/O blocks
│       ├── PWM/Frequency blocks
│       ├── Servo control blocks
│       ├── Sensor blocks (ultrasonic, temp, humidity)
│       ├── Display blocks (OLED)
│       ├── NeoPixel blocks
│       ├── I2C/SPI communication blocks
│       ├── WiFi/BLE blocks
│       └── WebSocket blocks
```

## Adding New Blocks

### 1. Define the Block in `getInfo()`

Open `extension/hardwareBlocks.js` and add a new entry to the `blocks` array inside `getInfo()`:

```javascript
{
  opcode: 'myNewBlock',
  blockType: Scratch.BlockType.COMMAND,  // or REPORTER, BOOLEAN, HAT
  text: 'do something with [PARAM]',
  arguments: {
    PARAM: {
      type: Scratch.ArgumentType.NUMBER,  // or STRING, BOOLEAN, COLOR, ANGLE
      defaultValue: 42,
      menu: 'OPTIONAL_MENU'  // Optional: link to a dynamic menu
    }
  }
}
```

### 2. Implement the Block Handler

Add a corresponding method to the `HardwareBlocks` class:

```javascript
myNewBlock(args) {
  const deviceId = this._getDevice();
  if (!deviceId) return;
  
  this._sendCommand(deviceId, {
    command: 'my_new_command',
    param: args.PARAM
  });
}
```

### 3. Add Firmware Support

If the block controls hardware, add the command handler to the respective firmware file:
- `firmware/arduino/ScratchBridge_Arduino.ino`
- `firmware/esp32/ScratchBridge_ESP32.ino`

---

## Block Types

| Constant                       | Description                                      |
|--------------------------------|--------------------------------------------------|
| `Scratch.BlockType.COMMAND`    | A command block (hat-shaped top, executes action) |
| `Scratch.BlockType.REPORTER`   | A reporter block (oval, returns a value)         |
| `Scratch.BlockType.BOOLEAN`    | A boolean block (hexagonal, returns true/false)  |
| `Scratch.BlockType.HAT`        | A hat block (rounded top, starts on event)       |

## Argument Types

| Constant                             | Description                |
|--------------------------------------|----------------------------|
| `Scratch.ArgumentType.STRING`        | Text input                 |
| `Scratch.ArgumentType.NUMBER`        | Numeric input              |
| `Scratch.ArgumentType.BOOLEAN`       | Boolean input              |
| `Scratch.ArgumentType.COLOR`         | Color picker               |
| `Scratch.ArgumentType.ANGLE`         | Angle input (0-360)        |
| `Scratch.ArgumentType.MATRIX`        | Grid/matrix input          |
| `Scratch.ArgumentType.NOTE`          | Musical note selector      |

---

## Custom Block Colors and Categories

Block colors are defined in the `getInfo()` return value:

```javascript
{
  id: 'hardwareBlocks',
  name: 'Hardware Blocks',
  color1: '#00979D',   // Primary color (block fill)
  color2: '#007A7D',   // Secondary color
  color3: '#005C5E'    // Tertiary color
}
```

Separators create visual groupings within the block palette. Use `'---'` strings in the `blocks` array:

```javascript
blocks: [
  { /* connection block 1 */ },
  { /* connection block 2 */ },
  '---',  // Visual divider
  { /* digital I/O block 1 */ },
  { /* digital I/O block 2 */ },
  '---',
  { /* sensor block 1 */ }
]
```

---

## Dynamic Menu Creation

Dynamic menus fetch data at runtime (e.g., available serial ports, connected devices).

### Static Menu

```javascript
menus: {
  COLOR_MENU: {
    acceptReporters: true,
    items: ['red', 'green', 'blue', 'yellow']
  }
}
```

### Dynamic Menu (via function)

```javascript
menus: {
  PORT_MENU: {
    acceptReporters: true,
    items: 'getPorts'  // References a class method
  }
}
```

Implement the method:

```javascript
getPorts() {
  return new Promise((resolve) => {
    fetch('http://localhost:3001/api/serial/ports')
      .then(r => r.json())
      .then(data => {
        resolve(data.map(p => p.path || p.name || String(p)));
      })
      .catch(() => {
        resolve(['COM3', 'COM5', '/dev/ttyUSB0']);
      });
  });
}
```

### Dynamic Menu (connected devices)

```javascript
getDeviceList() {
  const devices = [];
  for (const id of this.connectedDevices.keys()) {
    devices.push(id);
  }
  return devices.length ? devices : ['No devices'];
}
```

---

## Testing Extensions

### 1. Manual Testing in TurboWarp

1. Load the extension in TurboWarp
2. Create a simple project using hardware blocks
3. Connect a device (Arduino or ESP32 with firmware loaded)
4. Test each block category
5. Check the browser console for errors

### 2. Automated Testing

The extension can be tested using TurboWarp's headless mode or with a test harness:

```bash
# Example: Serve extension and run tests
cd extension
npx http-server -p 8080
```

Then run automated tests against the served extension URL.

### 3. Common Issues

- **Extension not loading**: Check the console for syntax errors in `hardwareBlocks.js`
- **Commands not reaching hardware**: Verify the backend is running on port 3001
- **Dynamic menus empty**: Check the backend API endpoint is accessible
- **CORS errors**: The backend must have CORS enabled for the TurboWarp origin

---

## Communication Flow

```
TurboWarp (Browser)
    │
    │  Extension block triggers HTTP POST
    ▼
Backend Server (localhost:3001)
    │
    │  Forward via Serial or WebSocket
    ▼
Hardware (Arduino / ESP32)
    │
    │  Execute command, send JSON response
    ▼
Backend parses response and emits Socket.io event
    │
    ▼
Dashboard receives real-time data
```
