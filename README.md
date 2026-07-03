# Hardware Blocks - Arduino & ESP32 Scratch Programming Platform

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)
![PRs](https://img.shields.io/badge/PRs-welcome-orange.svg)

A professional, open-source hardware programming platform based on TurboWarp Scratch that lets you program Arduino Uno, Arduino Nano, Arduino Mega 2560, and ESP32 boards using visual block programming.

## Features

- [x] Drag-and-drop block programming with Scratch
- [x] Support for Arduino Uno, Nano, Mega 2560, ESP32
- [x] USB Serial, WiFi WebSocket, and Bluetooth BLE communication
- [x] 50+ hardware blocks (Digital/Analog I/O, Servo, Sensors, Display, NeoPixel, Communication)
- [x] Real-time sensor monitoring and live debugging
- [x] Automatic firmware generation and upload
- [x] Professional dashboard with device management
- [x] Dark/light theme support

## Quick Start

```bash
# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Start development
npm run dev
```

The dashboard will be available at `http://localhost:3001` and the Vite dev server at `http://localhost:5173`.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  TurboWarp   │────▶│   Backend    │────▶│   Hardware   │
│  Extension   │     │  (Node.js)   │     │ (Arduino/ESP)│
│  + Dashboard │     │  Socket.io   │     │  USB/WebSocket
└─────────────┘     └──────────────┘     └──────────────┘
       │                    │                      │
       │  REST / WS        │  Serial / WS        │  I2C/SPI/GPIO
       ▼                    ▼                      ▼
   Block Code          Device Manager          Physical
   (Scratch)           + Firmware Upload       Hardware
```

## Project Structure

```
hardware-blocks/
├── backend/                  # Node.js backend server
│   └── src/
│       ├── index.js          # Express + Socket.io entry point
│       ├── serial/           # USB Serial manager
│       │   └── SerialManager.js
│       ├── websocket/        # WebSocket device manager
│       │   └── WebSocketManager.js
│       ├── devices/          # Unified device registry
│       │   └── DeviceManager.js
│       ├── firmware/         # Firmware compilation & upload
│       │   └── FirmwareUploader.js
│       └── utils/
│           └── api.js        # REST API routes
├── frontend/                 # React + Vite dashboard
│   └── src/
│       ├── pages/            # Dashboard, Devices, BlockEditor, etc.
│       ├── components/       # Reusable UI components
│       ├── context/          # Socket.io context provider
│       └── hooks/            # Custom React hooks
├── extension/                # TurboWarp Scratch extension
│   └── hardwareBlocks.js     # 50+ hardware blocks
├── firmware/                 # Arduino/ESP32 firmware
│   ├── arduino/
│   │   └── ScratchBridge_Arduino.ino
│   └── esp32/
│       └── ScratchBridge_ESP32.ino
├── public/                   # Static assets
├── docs/                     # Documentation
├── scripts/                  # Build & utility scripts
└── test/                     # Test suites
```

## Supported Boards

| Board              | MCU           | Connection   | Firmware Tool | Max Flash  |
|--------------------|---------------|-------------|---------------|------------|
| Arduino Uno        | ATmega328P    | USB Serial   | avrdude       | 32 KB      |
| Arduino Nano       | ATmega328P    | USB Serial   | avrdude       | 30 KB      |
| Arduino Mega 2560  | ATmega2560    | USB Serial   | avrdude       | 256 KB     |
| ESP32              | ESP32-D0WDQ6  | USB/WS/BLE   | esptool       | 4 MB       |
| ESP32-CAM          | ESP32-D0WDQ6  | USB/WS       | esptool       | 4 MB       |

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

The TurboWarp Scratch GUI component is based on [TurboWarp](https://turbowarp.org/) modifications to Scratch, which are licensed under GPL v3.0.
