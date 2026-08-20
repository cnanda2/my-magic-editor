# API Documentation

## WebSocket Events (Socket.io)

The backend uses Socket.io for real-time communication with the frontend dashboard.

### Client-to-Server Events

| Event                  | Direction      | Payload                                                   | Description                         |
|------------------------|---------------|-----------------------------------------------------------|-------------------------------------|
| `list_serial_ports`    | Client→Server | `{}`                                                      | Request available serial ports      |
| `connect_serial`       | Client→Server | `{path, baudRate, boardType}`                              | Connect to a serial device          |
| `disconnect_serial`    | Client→Server | `deviceId` (string)                                       | Disconnect a serial device          |
| `send_serial_command`  | Client→Server | `{deviceId, command}`                                      | Send a command to a serial device   |
| `connect_websocket_device` | Client→Server | `{url}`                                                | Connect to a WebSocket device       |
| `send_websocket_command`  | Client→Server | `{url, command}`                                        | Send a command via WebSocket        |
| `upload_firmware`      | Client→Server | `{boardType, port, firmwarePath}`                         | Upload firmware to a board          |
| `start_discovery`      | Client→Server | `{}`                                                      | Start automatic device discovery    |
| `stop_discovery`       | Client→Server | `{}`                                                      | Stop device discovery               |
| `get_devices`          | Client→Server | `{}`                                                      | Get list of all registered devices  |

### Server-to-Client Events

| Event                  | Direction      | Payload                                                   | Description                          |
|------------------------|---------------|-----------------------------------------------------------|--------------------------------------|
| `server_ready`         | Server→Client | `{version, timestamp}`                                    | Server connection acknowledged       |
| `serial_ports`         | Server→Client | `{ports: [...]}`                                          | Available serial ports               |
| `serial_connected`     | Server→Client | `{id, path, baudRate, boardType, connected, connectedAt}` | Serial device connected              |
| `serial_error`         | Server→Client | `{error: string}`                                         | Serial connection failed             |
| `serial_disconnected`  | Server→Client | `{deviceId}`                                               | Serial device disconnected           |
| `device_data`          | Server→Client | `{deviceId, data}`                                         | Incoming data from a device          |
| `websocket_message`    | Server→Client | `{url, message}`                                           | Message received from WebSocket      |
| `upload_progress`      | Server→Client | `{boardType, progress}`                                    | Firmware upload progress (%)         |
| `upload_complete`      | Server→Client | `{success, result}`                                        | Firmware upload finished             |
| `upload_error`         | Server→Client | `{error: string}`                                          | Firmware upload failed               |
| `discovery_started`    | Server→Client | `{}`                                                      | Device discovery started             |
| `discovery_stopped`    | Server→Client | `{}`                                                      | Device discovery stopped             |
| `devices_list`         | Server→Client | `[{device}]`                                              | All registered devices               |

---

## REST API Endpoints

### System

| Method | Path           | Description              | Body Params |
|--------|----------------|--------------------------|-------------|
| GET    | `/api/status`  | Server status and stats  | —           |

### Serial Ports

| Method | Path                         | Description                    | Body Params                              |
|--------|------------------------------|--------------------------------|------------------------------------------|
| GET    | `/api/serial/ports`          | List available serial ports    | —                                        |
| POST   | `/api/serial/connect`        | Connect to a serial device     | `{path, baudRate?, boardType?}`          |
| POST   | `/api/serial/disconnect/:id` | Disconnect a serial device     | —                                        |
| POST   | `/api/serial/send/:id`       | Send a command to a device     | `{command}`                              |

### Devices

| Method | Path                          | Description                  | Body Params |
|--------|-------------------------------|------------------------------|-------------|
| GET    | `/api/devices`                | List all devices             | —           |
| GET    | `/api/devices/connected`      | List connected devices       | —           |
| GET    | `/api/devices/:deviceId`      | Get device by ID             | —           |

### WebSocket

| Method | Path                           | Description                   | Body Params        |
|--------|--------------------------------|-------------------------------|--------------------|
| GET    | `/api/websocket/connections`   | List WebSocket connections    | —                  |
| POST   | `/api/websocket/connect`       | Connect to WebSocket device   | `{url}`            |
| POST   | `/api/websocket/send`          | Send via WebSocket            | `{url, command}`   |

### Firmware

| Method | Path                     | Description                      | Body Params                                |
|--------|--------------------------|----------------------------------|--------------------------------------------|
| GET    | `/api/firmware/boards`   | List supported boards            | —                                          |
| GET    | `/api/firmware/tools`    | Check flashing tools availability| —                                          |
| POST   | `/api/firmware/upload`   | Upload firmware                  | `{boardType, port, firmware}` (multipart)  |

### Discovery

| Method | Path                      | Description           | Body Params |
|--------|---------------------------|-----------------------|-------------|
| POST   | `/api/discovery/start`    | Start auto-discovery  | —           |
| POST   | `/api/discovery/stop`     | Stop auto-discovery   | —           |

---

## Hardware JSON Command Protocol

The firmware communicates using JSON over Serial (Arduino) or WebSocket (ESP32). Every command sends a JSON object and receives a response.

### Command Format

```json
{
  "cmd": "command_name",
  "pin": 13,
  "value": 1,
  "angle": 90,
  ...
}
```

### Response Format

**Acknowledgment:**
```json
{"ack": "digital_write", "pin": 13, "value": 1}
```

**Read Response:**
```json
{"response": "digital_read", "pin": 7, "value": 1}
```

**Error:**
```json
{"error": "unknown_command"}
```

**Events (unsolicited):**
```json
{"event": "heartbeat", "status": "alive", "millis": "12345"}
{"event": "board_info", "board": "Arduino Uno", "version": "2.0.0", ...}
```

---

### Commands Reference

#### digital_write
Set a digital pin HIGH or LOW.
```json
{"cmd": "digital_write", "pin": 13, "value": 1}
```
Response: `{"ack": "digital_write", "pin": 13, "value": 1}`

#### digital_read
Read a digital pin state.
```json
{"cmd": "digital_read", "pin": 7}
```
Response: `{"response": "digital_read", "pin": 7, "value": 1}`

#### analog_write
Write a PWM value (0-255) to a pin.
```json
{"cmd": "analog_write", "pin": 9, "value": 128}
```
Response: `{"ack": "analog_write", "pin": 9, "value": 128}`

#### analog_read
Read an analog pin value (0-1023).
```json
{"cmd": "analog_read", "pin": 0}
```
Response: `{"response": "analog_read", "pin": 0, "value": 512}`

#### servo_write
Set servo angle (0-180).
```json
{"cmd": "servo_write", "pin": 9, "angle": 90}
```
Response: `{"ack": "servo_write", "pin": 9, "value": 90}`

#### pin_mode
Set pin mode (OUTPUT=1, INPUT=0).
```json
{"cmd": "pin_mode", "pin": 13, "value": 1}
```
Response: `{"ack": "pin_mode", "pin": 13, "value": 1}`

#### ultrasonic_setup
Configure ultrasonic sensor pins.
```json
{"cmd": "ultrasonic_setup", "trig": 9, "echo": 10}
```
Response: `{"ack": "ultrasonic_setup", "pin": 9, "value": 10}`

#### ultrasonic_read
Read ultrasonic sensor distance.
```json
{"cmd": "ultrasonic_read", "trig": 9, "echo": 10}
```
Response: `{"response": "ultrasonic_read", "pin": 9, "value": 42}` (distance in cm)

#### i2c_write
Write a byte to an I2C device.
```json
{"cmd": "i2c_write", "address": 0x68, "register": 0x00, "value": 0}
```
Response: `{"ack": "i2c_write", "pin": 104, "value": 0}`

#### i2c_read
Read a byte from an I2C device.
```json
{"cmd": "i2c_read", "address": 0x68, "register": 0x00}
```
Response: `{"response": "i2c_read", "pin": 104, "value": 128}`

#### spi_transfer
Transfer data over SPI.
```json
{"cmd": "spi_transfer", "data": 0xFF}
```
Response: `{"response": "spi_transfer", "pin": 0, "value": 255}`

#### neopixel_setup
Initialize NeoPixel strip.
```json
{"cmd": "neopixel_setup", "pin": 6, "count": 8}
```
Response: `{"ack": "neopixel_setup", "pin": 6, "value": 8}`

#### neopixel_set
Set a NeoPixel LED color.
```json
{"cmd": "neopixel_set", "pin": 6, "index": 0, "r": 255, "g": 0, "b": 0}
```
Response: `{"ack": "neopixel_set", "pin": 6, "value": 0}`

#### wifi_connect (ESP32 only)
Connect ESP32 to a WiFi network.
```json
{"cmd": "wifi_connect", "ssid": "MyNetwork", "pass": "mypassword"}
```
Response: `{"response": "wifi_connect", "pin": 0, "value": 1}`

#### get_info
Request board information.
```json
{"cmd": "get_info"}
```
Response:
```json
{
  "event": "board_info",
  "board": "ESP32",
  "version": "2.0.0",
  "features": ["digital_io", "analog_io", "pwm", "dac", "servo", "i2c", "spi", "wifi", "websocket", "ota"]
}
```

#### reset
Reset the board (disables servos, NeoPixels, resets pins to INPUT).
```json
{"cmd": "reset"}
```
Response: `{"ack": "reset", "pin": 0, "value": 0}`

#### restart (ESP32 only)
Software restart the ESP32.
```json
{"cmd": "restart"}
```
Response: `{"response": "restart", "pin": 0, "value": 1}`

---

## Example Command Flow

```
1. Client sends:  {"cmd": "digital_write", "pin": 13, "value": 1}
2. Server forwards to device via Serial/WebSocket
3. Hardware executes: digitalWrite(13, HIGH);
4. Hardware responds: {"ack": "digital_write", "pin": 13, "value": 1}
5. Server passes response to client via Socket.io event 'device_data'
```

## Error Handling

Errors are returned as JSON with an `error` field:

```json
{"error": "unknown_command"}
{"error": "invalid_json"}
{"error": "Device not found"}
```

HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters)
- `404` - Resource not found
- `500` - Internal server error
