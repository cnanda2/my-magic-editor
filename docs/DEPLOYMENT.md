# Deployment Guide

## Production Build

### 1. Build the Frontend

```bash
cd frontend
npm run build
```

This creates a production bundle in `frontend/dist/`. The backend automatically serves these files.

### 2. Start the Backend

```bash
cd backend
NODE_ENV=production npm start
```

The application will be available at `http://localhost:3001`.

---

## PM2 Process Manager

For production deployments, use PM2 for process management, auto-restart, and logging.

### Installation

```bash
npm install -g pm2
```

### Configuration

Create `ecosystem.config.js` in the project root:

```javascript
module.exports = {
  apps: [{
    name: 'hardware-blocks',
    script: 'backend/src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    max_memory_restart: '500M',
    restart_delay: 3000,
    max_restarts: 10
  }]
};
```

### Start with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Useful PM2 Commands

```bash
pm2 status                    # List all processes
pm2 logs hardware-blocks      # View logs
pm2 restart hardware-blocks   # Restart
pm2 stop hardware-blocks      # Stop
pm2 delete hardware-blocks    # Remove
pm2 monit                     # Monitor CPU/memory
```

---

## Docker Deployment

### Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm ci
RUN cd backend && npm ci
RUN cd frontend && npm ci

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache avrdude esptool py3-pip python3 && \
    pip3 install esptool

# Copy backend and built frontend
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN cd backend && npm ci --only=production

EXPOSE 3001

CMD ["node", "backend/src/index.js"]
```

### docker-compose.yml

Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  hardware-blocks:
    build: .
    container_name: hardware-blocks
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./logs:/app/backend/logs
      - ./uploads:/app/backend/uploads
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0"
      - "/dev/ttyACM0:/dev/ttyACM0"
    restart: unless-stopped
    privileged: true   # Required for USB serial access
```

### Docker Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

---

## Nginx Reverse Proxy

For production deployments behind a domain name or for SSL termination.

Create `/etc/nginx/sites-available/hardware-blocks`:

```nginx
server {
    listen 80;
    server_name hardware-blocks.example.com;

    # Redirect to HTTPS (optional)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hardware-blocks.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/hardware-blocks.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hardware-blocks.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Static files (served by backend, but nginx can cache)
    location /assets/ {
        proxy_pass http://127.0.0.1:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket support for Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Dashboard SPA
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/hardware-blocks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Environment Variables

| Variable           | Default      | Description                        |
|--------------------|-------------|------------------------------------|
| `PORT`             | `3001`      | Backend server port                |
| `NODE_ENV`         | `development` | Environment mode                 |
| `LOG_LEVEL`        | `info`      | Winston log level                  |
| `AUTO_RECONNECT`   | `true`      | Auto-reconnect disconnected devices|
| `RECONNECT_INTERVAL` | `5000`    | Reconnect interval (ms)            |

---

## Security Considerations

- **USB Access**: In production, restrict USB device access to the application user only
- **WebSocket**: Use `wss://` (WebSocket Secure) when behind HTTPS
- **CORS**: Configure the `cors` origin in `backend/src/index.js` for production
- **Network**: Deploy behind a firewall; the dashboard and API should not be publicly exposed
- **Firmware Uploads**: Validate uploaded firmware files (`.hex`, `.bin`, `.ino` only)
- **Rate Limiting**: Consider adding rate limiting to API routes
- **Authentication**: Add authentication for the dashboard in multi-user environments
- **Logging**: Logs may contain serial data; ensure log files have restricted permissions

---

## Monitoring and Logging

### Log Files

The backend logs to:
- `backend/logs/combined.log` - All logs
- `backend/logs/error.log` - Error logs only

### Systemd Service (Linux)

Create `/etc/systemd/system/hardware-blocks.service`:

```ini
[Unit]
Description=Hardware Blocks Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/hardware-blocks
ExecStart=/usr/bin/node backend/src/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable hardware-blocks
sudo systemctl start hardware-blocks
sudo systemctl status hardware-blocks
```

### Health Check

```
GET /api/status
```

Expected response:
```json
{
  "status": "running",
  "version": "1.0.0",
  "timestamp": 1712012345678,
  "uptime": 12345.67,
  "connections": {
    "serial": 1,
    "websocket": 0,
    "totalDevices": 1
  }
}
```
