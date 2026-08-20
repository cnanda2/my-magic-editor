# Deployment Plan for Hardware Blocks - Student-Friendly Server Setup

This plan provides step-by-step instructions to deploy the Hardware Blocks platform on a server so students can access it without errors.

## Overview
Hardware Blocks consists of:
- **Backend**: Node.js/Express server (port 3001) - handles device communication, firmware uploads, API
- **Frontend**: React/Vite dashboard (served by backend on port 3001 in production)
- **TurboWarp Extension**: Scratch extension that connects to the backend via WebSocket

## Prerequisites

### Server Requirements
- Ubuntu 20.04 LTS or later / CentOS 7+ / Windows Server 2019+
- Node.js 18.x or later
- npm 9.x or later
- 2GB+ RAM recommended
- USB ports accessible (for student hardware connections)

### Required Tools
1. **Node.js & npm**
   ```bash
   # Install Node.js 18.x (using nodesource)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Verify
   node --version  # Should be v18.x or higher
   npm --version   # Should be 9.x or higher
   ```

2. **Arduino Tools** (for hardware functionality)
   ```bash
   # Install avrdude (Arduino)
   sudo apt-get install -y avrdude

   # Install esptool (ESP32)
   sudo apt-get install -y python3-pip
   pip3 install esptool
   ```

3. **USB Drivers** (for student hardware)
   - CH340 drivers (for cheap Arduino clones)
   - CP210x drivers (for official Arduinos)
   - These are usually included in modern Linux kernels

## Deployment Options

### Option 1: Simple PM2 Deployment (Recommended for most schools)

#### Step 1: Prepare the Server
```bash
# Create app directory
sudo mkdir -p /opt/hardware-blocks
sudo chown $USER:$USER /opt/hardware-blocks
cd /opt/hardware-blocks

# Clone repository
git clone https://github.com/yourusername/hardware-blocks.git .
# OR copy your local files
# cp -r /path/to/local/hardware-blocks/* .

# Install PM2 globally
sudo npm install -g pm2
```

#### Step 2: Install Dependencies
```bash
# Install all dependencies
npm run install:all

# Verify Arduino tools are accessible
avrdude -v
esptool.py version
```

#### Step 3: Build for Production
```bash
# Build frontend
cd frontend
npm run build
cd ..

# Install backend production dependencies only
cd backend
npm ci --only=production
cd ..
```

#### Step 4: Configure Environment
```bash
# Create .env file in backend/
cd backend
cat > .env << EOF
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
AUTO_RECONNECT=true
RECONNECT_INTERVAL=5000
EOF
cd ..
```

#### Step 5: Start with PM2
```bash
# Create ecosystem.config.js
cat > ecosystem.config.js << EOF
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
EOF

# Start the application
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Verify it's running
pm2 status
```

#### Step 6: Set up Auto-start on Boot
```bash
# PM2 startup command will give you the exact command to run
# Usually looks like:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```

### Option 2: Docker Deployment (Best for consistency)

#### Step 1: Install Docker
```bash
# Install Docker Engine
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (log out/in after)
sudo usermod -aG docker $USER
```

#### Step 2: Create Docker Files
```bash
# In project root, create Dockerfile
cat > Dockerfile << EOF
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

# Install runtime dependencies for hardware tools
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
EOF

# Create docker-compose.yml
cat > docker-compose.yml << EOF
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
EOF
```

#### Step 3: Deploy with Docker Compose
```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f hardware-blocks

# Check status
docker-compose ps
```

### Option 3: Nginx Reverse Proxy (For domain/SSL)

#### Step 1: Install Nginx
```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
```

#### Step 2: Configure Nginx (using PM2 or Docker backend)
```bash
# Create site configuration
sudo tee /etc/nginx/sites-available/hardware-blocks > /dev/null << EOF
server {
    listen 80;
    server_name your-school-domain.com;

    # Redirect to HTTPS (if you have SSL certificate)
    # return 301 https://\$host\$request_uri;

    # WebSocket support for Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }

    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Dashboard SPA
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable and test
sudo ln -s /etc/nginx/sites-available/hardware-blocks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Post-Deployment Verification

### 1. Check Application Status
```bash
# For PM2
pm2 status

# For Docker
docker-compose ps

# Check backend API
curl http://localhost:3001/api/status
# Should return JSON with status: "running"
```

### 2. Test Student Workflow
1. Open browser to `http://your-server-address:3001`
2. Verify dashboard loads
3. Connect a test Arduino/ESP32 via USB
4. Check if device appears in Device Management
5. Test uploading a simple sketch
6. Test WebSocket connection (for WiFi/BLE devices)

### 3. Common Student Issues & Solutions

#### Issue: "Board not detected" or "Port not found"
**Solution:**
- Linux: Add student to dialout group: `sudo usermod -a -G dialout username`
- Windows: Install CH340/CP210x drivers
- Mac: Usually works out-of-box
- Verify: `ls -la /dev/ttyUSB*` or `ls -la /dev/ttyACM*`

#### Issue: "avrdude not found" or "esptool not found"
**Solution:**
- Verify installation: `which avrdude` and `which esptool.py`
- Add to PATH if needed: `export PATH=\$PATH:/path/to/arduino/hardware/tools/avr/bin`
- For Docker: Ensure tools are installed in container (already in Dockerfile)

#### Issue: WebSocket connection fails
**Solution:**
- Ensure student devices are on same network as server
- Check firewall: `sudo ufw allow 3001/tcp`
- For WiFi devices: Verify ESP32 can reach server IP
- Check backend logs: `pm2 logs hardware-blocks` or `docker-compose logs`

#### Issue: "Port already in use"
**Solution:**
- Change port in `.env` file: `PORT=3002`
- Or kill existing process: `sudo lsof -i :3001 | grep LISTEN`

#### Issue: Slow performance or crashes
**Solution:**
- Check memory usage: `pm2 monit` or `docker stats`
- Increase memory limit in PM2 config: `max_memory_restart: '1G'`
- Check logs for errors: `pm2 logs hardware-blocks`

## Security Considerations for Student Use

### 1. Network Security
- Deploy behind school firewall
- Only expose port 3001 (or 80/443 with Nginx)
- Consider VLAN segregation for IoT devices
- Disable unused ports on server

### 2. File System Security
- Run as non-root user (PM2/Docker do this by default)
- Set proper permissions on logs/uploads directories
- ```bash
  mkdir -p logs uploads
  chown -R node:node logs uploads
  chmod 750 logs uploads
  ```

### 3. Input Validation
- Backend already validates firmware uploads (.hex, .bin, .ino only)
- Consider adding rate limiting to API endpoints
- Monitor logs for suspicious activity

### 4. USB Device Security
- In Linux, consider using udev rules to restrict USB access
- Example udev rule (`/etc/udev/rules.d/99-hardware-blocks.rules`):
  ```
  SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", GROUP="dialout", MODE="0660"
  SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", GROUP="dialout", MODE="0660"
  ```

### 5. Regular Maintenance
```bash
# Weekly updates
sudo apt-get update && sudo apt-get upgrade -y
sudo npm update -g
pm2 update
docker-compose pull && docker-compose up -d --build

# Monthly log rotation
# (PM2 handles this automatically with max_size setting)
```

## Troubleshooting Guide for Administrators

### 1. Application Won't Start
```bash
# Check logs
pm2 logs hardware-blocks    # PM2
docker-compose logs hardware-blocks  # Docker
journalctl -u hardware-blocks  # Systemd

# Common fixes:
# - Missing dependencies: npm run install:all
# - Port already in use: change PORT in .env
# - Permission denied: check USB device permissions
```

### 2. Students Can't Connect Devices
```bash
# Check USB permissions
ls -la /dev/ttyUSB*
ls -la /dev/ttyACM*

# If permissions wrong:
sudo chmod 660 /dev/ttyUSB0
sudo chmod 660 /dev/ttyACM0
# Or better: add user to dialout group

# Check if tools work manually
avrdude -c arduino -p m328p -P /dev/ttyUSB0 -b 115200 -v
esptool.py --port /dev/ttyUSB0 chip_id
```

### 3. High CPU/Memory Usage
```bash
# Check processes
pm2 monit          # PM2
docker stats       # Docker
top                # System

# Common causes:
# - Too many simultaneous connections
# - Large log files (rotate logs)
# - Memory leak (restart with pm2 restart all)
```

## Backup & Recovery

### 1. Backup Configuration
```bash
# Backup important files
tar -czf hardware-blocks-backup-$(date +%Y%m%d).tar.gz \
  backend/.env \
  ecosystem.config.js \
  docker-compose.yml \
  Dockerfile \
  logs/ \
  uploads/
```

### 2. Restore Procedure
```bash
# Extract backup
tar -xzf hardware-blocks-backup-*.tar.gz

# Reinstall dependencies
npm run install:all

# Rebuild (if needed)
cd frontend && npm run build && cd ..

# Restart
pm2 restart ecosystem.config.js
# OR
docker-compose up -d
```

## Estimated Resource Usage
- **Idle**: ~100-200MB RAM, minimal CPU
- **With 10-20 students**: ~500MB-1GB RAM, moderate CPU
- **During firmware upload**: Temporary spikes to 2GB RAM
- **Storage**: ~500MB for application + space for logs/uploads

## Conclusion
This deployment plan provides multiple options for running Hardware Blocks on a school server. The **PM2 deployment** is recommended for most educational environments due to its simplicity and excellent process management. For environments requiring containerization or complex networking, the **Docker** option provides excellent consistency.

Key success factors:
1. Proper USB permissions for student devices
2. Correct installation of avrdude/esptool
3. Adequate server resources (2GB+ RAM recommended)
4. Regular monitoring and log maintenance
5. Clear instructions for students on device connection

Once deployed, students should be able to access the platform at `http://server-address:3001` and program their Arduino/ESP32 boards without encountering common setup errors.