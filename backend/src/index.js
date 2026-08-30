/**
 * Hardware Blocks Backend Server
 * Main entry point for Express + Socket.io backend
 * Manages serial connections, WebSocket devices, and firmware uploads
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const winston = require('winston');

const SerialManager = require('./serial/SerialManager');
const WebSocketManager = require('./websocket/WebSocketManager');
const DeviceManager = require('./devices/DeviceManager');
const FirmwareUploader = require('./firmware/FirmwareUploader');
const ArduinoCompiler = require('./compiler/ArduinoCompiler');
const DriverManager = require('./driver/DriverManager');
const { setupAPIRoutes } = require('./utils/api');
const { setupAuthRoutes } = require('./utils/auth');
const { setupUserRoutes } = require('./utils/userRoutes');
const { setupTenantRoutes } = require('./utils/tenantRoutes');
const { setupPlanRoutes } = require('./utils/planRoutes');
const { setupContentRoutes } = require('./utils/contentRoutes');
const { setupStripeRoutes } = require('./utils/stripeRoutes');
const { initDb } = require('./db/init');
const { query } = require('./db/pool');
const { tenantResolver } = require('./utils/tenantMiddleware');

// ===== LOGGER =====
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// ===== APP SETUP =====
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(tenantResolver);

// Serve editor.html with tenant branding injected
app.get('/editor.html', async (req, res) => {
  const fs = require('fs');
  const editorPath = path.join(__dirname, '../../build/editor.html');
  try {
    let html = fs.readFileSync(editorPath, 'utf-8');
    let tenant = req.tenant || null;

    if (!tenant) {
      const qpTenantId = req.query?.tenant_id;
      if (qpTenantId) {
        const { rows } = await query('SELECT * FROM tenants WHERE id = $1', [qpTenantId]);
        tenant = rows[0] || null;
      }
    }

    if (!tenant) {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (token) {
        try {
          const jwt = require('jsonwebtoken');
          const auth = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-production');
          if (auth?.tenant_id) {
            const { rows } = await query('SELECT * FROM tenants WHERE id = $1', [auth.tenant_id]);
            tenant = rows[0] || null;
          }
        } catch (_) {}
      }
    }

    if (!tenant) {
      const { rows } = await query("SELECT * FROM tenants WHERE id = 'default' OR instance_id = 'default' LIMIT 1");
      tenant = rows[0] || null;
    }

    const tenantConfig = tenant ? {
      appName: tenant.app_name || tenant.name,
      companyName: tenant.company_name || '',
      logoUrl: tenant.logo_url || '',
      faviconUrl: tenant.favicon_url || '',
      subdomain: tenant.subdomain || '',
      customDomain: tenant.custom_domain || '',
    } : null;
    const configScript = `<script>window.__TENANT_CONFIG__ = ${JSON.stringify(tenantConfig)};</script>`;
    let headInject = configScript;
    if (tenantConfig && tenantConfig.faviconUrl) {
      headInject += `<link rel="icon" type="image/png" href="${tenantConfig.faviconUrl}">`;
    }
    if (tenantConfig && tenantConfig.appName) {
      html = html.replace(/<title>.*?<\/title>/, `<title>${tenantConfig.appName}</title>`);
    }
    html = html.replace('</head>', headInject + '</head>');
    res.type('html').send(html);
  } catch (err) {
    res.status(500).send('Error loading editor');
  }
});

app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.use(express.static(path.join(__dirname, '../../build')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/docs', express.static(path.join(__dirname, '../../docs')));

// ===== INITIALIZE MANAGERS =====
const serialManager = new SerialManager(logger);
const wsManager = new WebSocketManager(logger);
const deviceManager = new DeviceManager(logger, serialManager, wsManager);
const firmwareUploader = new FirmwareUploader(logger);
const arduinoCompiler = new ArduinoCompiler(logger);
const driverManager = new DriverManager(logger);

// ===== USER MANAGEMENT (auth + admin) =====
// NOTE: These MUST be registered before setupAPIRoutes, because setupAPIRoutes
// ends with a catch-all `app.get('*')` SPA fallback that would otherwise
// shadow every /api/auth and /api/admin endpoint.
setupAuthRoutes(app);
setupUserRoutes(app);
setupTenantRoutes(app);
setupPlanRoutes(app);
setupContentRoutes(app);
// Stripe webhook needs raw body — register before express.json() processes it.
// We pass express.raw as the second arg so stripeRoutes can mount it correctly.
setupStripeRoutes(app, require('express').raw);

// Initialize the PostgreSQL schema (thestemeducator DB) on boot.
initDb().catch((err) => logger.error(`DB init failed: ${err.message}`));

// ===== API ROUTES (includes catch-all SPA fallback — keep last) =====
setupAPIRoutes(app, { serialManager, wsManager, deviceManager, firmwareUploader, arduinoCompiler, driverManager });

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.emit('server_ready', {
    version: '1.0.0',
    timestamp: Date.now()
  });
  
  // Device management
  socket.on('list_serial_ports', async () => {
    const ports = await serialManager.listPorts();
    socket.emit('serial_ports', ports);
  });
  
  socket.on('connect_serial', async (data) => {
    try {
      const { path, baudRate, boardType } = data;
      const device = await serialManager.connect(path, { baudRate, boardType });
      socket.emit('serial_connected', device);
      
      // Subscribe to device data
      serialManager.onDeviceData(device.id, (data) => {
        socket.emit('device_data', { deviceId: device.id, data });
      });
      
      logger.info(`Serial connected: ${path} (${boardType})`);
    } catch (err) {
      socket.emit('serial_error', { error: err.message });
      logger.error(`Serial connection failed: ${err.message}`);
    }
  });
  
  socket.on('disconnect_serial', async (deviceId) => {
    await serialManager.disconnect(deviceId);
    socket.emit('serial_disconnected', { deviceId });
  });
  
  socket.on('send_serial_command', (data) => {
    const { deviceId, command } = data;
    serialManager.sendCommand(deviceId, command);
  });
  
  // WebSocket device (ESP32)
  socket.on('connect_websocket_device', (data) => {
    const { url } = data;
    wsManager.connect(url, (msg) => {
      socket.emit('websocket_message', { url, message: msg });
    });
  });
  
  socket.on('send_websocket_command', (data) => {
    const { url, command } = data;
    wsManager.send(url, command);
  });
  
  // Firmware upload
  socket.on('upload_firmware', async (data) => {
    try {
      const { boardType, port, firmwarePath } = data;
      const result = await firmwareUploader.upload(boardType, port, firmwarePath, (progress) => {
        socket.emit('upload_progress', { boardType, progress });
      });
      socket.emit('upload_complete', { success: true, result });
    } catch (err) {
      socket.emit('upload_error', { error: err.message });
    }
  });
  
  // Device discovery
  socket.on('start_discovery', () => {
    deviceManager.startDiscovery();
    socket.emit('discovery_started');
  });
  
  socket.on('stop_discovery', () => {
    deviceManager.stopDiscovery();
    socket.emit('discovery_stopped');
  });
  
  // Get all devices
  socket.on('get_devices', () => {
    const devices = deviceManager.getAllDevices();
    socket.emit('devices_list', devices);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ===== PERIODIC TASKS =====
setInterval(() => {
  // Auto-reconnect disconnected devices
  deviceManager.checkAutoReconnect();
}, 5000);

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Hardware Blocks Backend running on port ${PORT}`);
  logger.info(`Dashboard available at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Another instance of this backend (or another app) is likely still running. Stop that process (e.g. \`npx kill-port ${PORT}\` on Windows, or find and end the process using Task Manager / \`netstat -ano | findstr :${PORT}\`) and try again.`);
    process.exit(1);
  } else {
    logger.error(`Server error: ${err.message}`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await serialManager.disconnectAll();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server, io };
