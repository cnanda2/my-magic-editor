/**
 * WebSocket Manager
 * Manages WebSocket client connections to ESP32 devices
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
  constructor(logger) {
    super();
    this.logger = logger;
    this.connections = new Map(); // url -> { ws, connected, lastPing, callbacks }
  }

  connect(url, onMessage) {
    if (this.connections.has(url)) {
      this.logger.warn(`Already connected to ${url}`);
      return this.connections.get(url);
    }

    this.logger.info(`Connecting to WebSocket: ${url}`);
    
    const ws = new WebSocket(url);
    const connInfo = {
      url,
      ws,
      connected: false,
      connectedAt: null,
      lastPing: Date.now(),
      callbacks: []
    };

    ws.on('open', () => {
      connInfo.connected = true;
      connInfo.connectedAt = Date.now();
      this.logger.info(`WebSocket connected: ${url}`);
      this.emit('connected', url);
    });

    ws.on('message', (data) => {
      connInfo.lastPing = Date.now();
      const message = data.toString();
      
      try {
        const parsed = JSON.parse(message);
        
        // Notify specific callback
        if (onMessage) onMessage(parsed);
        
        // Notify all registered callbacks
        connInfo.callbacks.forEach(cb => {
          try { cb(parsed); } catch (e) {}
        });
        
        this.emit('message', { url, data: parsed });
      } catch {
        this.emit('message', { url, data: message });
      }
    });

    ws.on('close', () => {
      connInfo.connected = false;
      this.logger.warn(`WebSocket closed: ${url}`);
      this.emit('disconnected', url);
      this.connections.delete(url);
    });

    ws.on('error', (err) => {
      this.logger.error(`WebSocket error for ${url}: ${err.message}`);
      this.emit('error', { url, error: err });
    });

    this.connections.set(url, connInfo);
    return connInfo;
  }

  send(url, command) {
    const conn = this.connections.get(url);
    if (!conn || !conn.connected) {
      this.logger.warn(`Cannot send to disconnected WebSocket: ${url}`);
      return false;
    }

    const cmdStr = typeof command === 'string' ? command : JSON.stringify(command);
    conn.ws.send(cmdStr);
    return true;
  }

  disconnect(url) {
    const conn = this.connections.get(url);
    if (conn) {
      conn.ws.close();
      this.connections.delete(url);
    }
  }

  disconnectAll() {
    this.connections.forEach((conn, url) => {
      conn.ws.close();
    });
    this.connections.clear();
  }

  getConnections() {
    return Array.from(this.connections.values()).map(c => ({
      url: c.url,
      connected: c.connected,
      connectedAt: c.connectedAt
    }));
  }

  addCallback(url, callback) {
    const conn = this.connections.get(url);
    if (conn) {
      conn.callbacks.push(callback);
    }
  }

  removeCallback(url, callback) {
    const conn = this.connections.get(url);
    if (conn) {
      conn.callbacks = conn.callbacks.filter(cb => cb !== callback);
    }
  }
}

module.exports = WebSocketManager;
