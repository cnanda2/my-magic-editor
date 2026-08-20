# Installation Guide

## Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later
- **Git** for cloning the repository
- **Arduino IDE** (optional, for firmware compilation)
- **avrdude** (for flashing Arduino boards)
- **esptool** (for flashing ESP32 boards)

---

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/hardware-blocks.git
cd hardware-blocks
```

### 2. Install Dependencies

The project uses npm workspaces. Run the following from the project root:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

Alternatively, use the convenience script:

```bash
npm run install:all
```

### 3. Arduino Tool Setup

#### avrdude (Arduino)

**Windows:**
- Install Arduino IDE from https://www.arduino.cc/en/software
- avrdude is included at `C:\Program Files (x86)\Arduino\hardware\tools\avr\bin\avrdude.exe`
- Add this path to your system `PATH` variable

**macOS:**
```bash
brew install avrdude
```

**Linux:**
```bash
sudo apt-get install avrdude
```

#### esptool (ESP32)

```bash
pip install esptool
```

Or install via npm:

```bash
npm install -g esptool
```

### 4. Backend Configuration

Create a `.env` file in the `backend/` directory (optional):

```env
PORT=3001
LOG_LEVEL=info
AUTO_RECONNECT=true
RECONNECT_INTERVAL=5000
```

Default configuration works out of the box. The server starts on port 3001.

### 5. Frontend Setup

The frontend is a Vite + React application. No additional configuration is needed. The dev server runs on port 5173 by default.

If you need to change the backend URL, edit `frontend/src/context/SocketContext.jsx`.

---

## Running in Development Mode

```bash
# From the project root - starts both backend and frontend
npm run dev
```

This runs:
- **Backend** at `http://localhost:3001` (with nodemon for auto-restart)
- **Frontend** at `http://localhost:5173` (with Vite HMR)

The backend serves the frontend's production build at `http://localhost:3001` when not in development mode.

---

## Building for Production

```bash
# Build the frontend
cd frontend
npm run build

# The built files will be in frontend/dist/
# The backend serves these files automatically
```

Start the production server:

```bash
cd backend
npm start
```

---

## Troubleshooting

### Serial port not detected

- Ensure the board is connected via USB
- Check device drivers (CH340/CP210x drivers may be needed for clones)
- On Linux, add your user to the `dialout` group:
  ```bash
  sudo usermod -a -G dialout $USER
  ```
- Restart after installing drivers

### avrdude not found

- Install Arduino IDE or install avrdude separately
- Verify with: `avrdude -v`
- On Windows, add avrdude's directory to PATH

### esptool not found

- Install via pip: `pip install esptool`
- Or use the Arduino IDE's built-in esptool

### WebSocket connection fails

- Ensure the ESP32 is on the same network
- Verify the WebSocket URL (default: `ws://192.168.1.100/ws`)
- Check firewall settings

### npm install errors

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lock files
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json

# Reinstall
npm run install:all
```

### Port already in use

Change the port in `backend/src/index.js` or set the `PORT` environment variable:

```bash
export PORT=3002
npm run dev
```
