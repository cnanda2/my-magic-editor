const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class FirmwareUploader {
  constructor(logger) {
    this.logger = logger;
    this.uploading = false;
    this.avrdudePath = this.findAvrdude();
    this.avrdudeConf = this.findAvrdudeConf();
    this.esptoolPath = this.findEsptool();
    this.avrdudeTimeout = 30000;

    this.boardConfigs = {
      arduino_uno: {
        name: 'Arduino Uno', mcu: 'atmega328p', protocol: 'arduino', baudRate: 115200,
        baudRateAlternates: [57600, 19200]
      },
      arduino_nano: {
        name: 'Arduino Nano', mcu: 'atmega328p', protocol: 'arduino', baudRate: 115200,
        baudRateAlternates: [57600, 19200]
      },
      arduino_mega: {
        name: 'Arduino Mega 2560', mcu: 'atmega2560', protocol: 'wiring', baudRate: 115200,
        baudRateAlternates: [57600]
      },
      esp32: {
        name: 'ESP32', chip: 'esp32', flashMode: 'dio', flashFreq: '40m', flashSize: '4MB', baudRate: 921600
      },
      esp32cam: {
        name: 'ESP32-CAM', chip: 'esp32', flashMode: 'qio', flashFreq: '80m', flashSize: '4MB', baudRate: 921600
      }
    };

  }

  /* ---------- Tool discovery ---------- */

  findAvrdude() {
    const localAppData = process.env.LOCALAPPDATA || '';
    const userProfile = process.env.USERPROFILE || '';
    const locations = [
      path.join(localAppData, 'Arduino15', 'packages', 'arduino', 'tools', 'avrdude'),
      path.join(userProfile, 'AppData', 'Local', 'Arduino15', 'packages', 'arduino', 'tools', 'avrdude'),
      'C:\\Program Files (x86)\\Arduino\\hardware\\tools\\avr\\bin\\avrdude.exe',
      'C:\\Program Files\\Arduino\\hardware\\tools\\avr\\bin\\avrdude.exe',
      path.join(__dirname, '../../../tools/avrdude/avrdude.exe'),
      path.join(__dirname, '../../tools/avrdude/avrdude.exe'),
    ];
    for (const loc of locations) {
      try {
        const r = path.resolve(loc);
        if (require('fs').existsSync(r)) {
          if (require('fs').statSync(r).isDirectory()) {
            const dirs = require('fs').readdirSync(r).sort().reverse();
            for (const d of dirs) {
              const exe = path.join(r, d, 'bin', 'avrdude.exe');
              if (require('fs').existsSync(exe)) return exe;
            }
          } else {
            return r;
          }
        }
      } catch (_) {}
    }
    try { execSync('avrdude -v', { stdio: 'pipe' }); return 'avrdude'; } catch (_) {}
    return null;
  }

  findAvrdudeConf() {
    if (!this.avrdudePath || this.avrdudePath === 'avrdude') return null;
    const dir = path.dirname(this.avrdudePath);
    for (const c of [path.join(dir, '..', 'etc', 'avrdude.conf'), path.join(dir, '..', '..', 'etc', 'avrdude.conf')]) {
      try { if (require('fs').existsSync(c)) return path.resolve(c); } catch (_) {}
    }
    return null;
  }

  findEsptool() {
    const localAppData = process.env.LOCALAPPDATA || '';
    const locations = [
      path.join(localAppData, 'Arduino15', 'packages', 'esp32', 'tools', 'esptool_py'),
      path.join(__dirname, '../../../tools/esptool/esptool.py'),
      'esptool.py', 'esptool',
    ];
    for (const loc of locations) {
      try {
        const r = path.resolve(loc);
        if (require('fs').existsSync(r)) {
          if (require('fs').statSync(r).isDirectory()) {
            const dirs = require('fs').readdirSync(r).sort().reverse();
            for (const d of dirs) {
              const exe = path.join(r, d, 'esptool.py');
              if (require('fs').existsSync(exe)) return exe;
            }
          } else { return r; }
        }
      } catch (_) {}
    }
    try { execSync('esptool.py version', { stdio: 'pipe' }); return 'esptool.py'; } catch (_) {}
    return null;
  }

  /* ---------- Process / port management ---------- */

  killStaleProcesses() {
    if (os.platform() === 'win32') {
      const cmds = [
        'taskkill /F /IM avrdude.exe /T 2>nul',
        'taskkill /F /IM esptool.exe /T 2>nul',
        'powershell -NoProfile -Command "Get-Process avrdude,esptool -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul'
      ];
      for (const c of cmds) { try { execSync(c, { stdio: 'pipe', timeout: 5000 }); } catch (_) {} }
    } else {
      const cmds = ['pkill -9 avrdude 2>/dev/null', 'pkill -9 esptool 2>/dev/null'];
      for (const c of cmds) { try { execSync(c, { stdio: 'pipe' }); } catch (_) {} }
    }
  }

  /* ---------- Upload strategies ---------- */

  static STRATEGIES = [
    { postDelay: 1500, noAutoReset: true,  label: 'DTR + 1.5s noautoreset' },
    { postDelay: 3000, noAutoReset: false, label: 'avrdude DTR + 3s' },
    { postDelay: 800,  noAutoReset: false, label: 'avrdude DTR + 0.8s' },
  ];

  async dtrReset(port) {
    this.logger.info(`DTR reset on ${port}...`);
    try {
      const result = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = New-Object System.IO.Ports.SerialPort '${port}',115200,None,8,One; try { $p.Open(); Start-Sleep -Milliseconds 200; $p.DtrEnable = $false; Start-Sleep -Milliseconds 100; $p.DtrEnable = $true; Start-Sleep -Milliseconds 50; $p.DtrEnable = $false; Start-Sleep -Milliseconds 400; $p.DtrEnable = $true; $p.Close(); Write-Host OK } catch { Write-Host FAIL } finally { $p.Dispose() }"`,
        { stdio: 'pipe', timeout: 10000 }
      );
      if (result.toString().trim() === 'OK') { this.logger.info('DTR reset OK'); return true; }
    } catch (_) {}
    this.logger.warn('DTR reset failed');
    return false;
  }

  async releasePort(port) {
    try {
      execSync(
        `powershell -NoProfile -Command "try { [System.IO.Ports.SerialPort]::new('${port}').Close() } catch {}"`,
        { stdio: 'pipe', timeout: 3000 }
      );
    } catch (_) {}
    try {
      execSync('taskkill /F /IM avrdude.exe /T 2>nul', { stdio: 'pipe', timeout: 3000 });
    } catch (_) {}
  }

  /* ---------- Main upload entry ---------- */

  reset() {
    this.uploading = false;
    this.logger.info('Upload state reset');
  }

  async upload(boardType, port, firmwarePath, onProgress) {
    if (this.uploading) {
      this.logger.warn('Previous upload still marked in progress — resetting');
      this.reset();
    }
    const config = this.boardConfigs[boardType];
    if (!config) throw new Error(`Unknown board type: ${boardType}`);
    this.uploading = true;
    this.uploadStartTime = Date.now();
    this.logger.info(`Starting firmware upload: ${config.name} on ${port}`);
    try {
      await fs.access(firmwarePath);
      const ext = path.extname(firmwarePath).toLowerCase();
      let result;
      if (ext === '.hex') {
        result = await this.uploadArduinoHex(port, config, firmwarePath, onProgress);
      } else if (ext === '.bin') {
        result = await this.uploadESP32Bin(port, config, firmwarePath, onProgress);
      } else if (ext === '.ino') {
        const compiled = await this.compileSketch(firmwarePath, boardType, onProgress);
        result = boardType.startsWith('esp32')
          ? await this.uploadESP32Bin(port, config, compiled, onProgress)
          : await this.uploadArduinoHex(port, config, compiled, onProgress);
      } else {
        throw new Error(`Unsupported firmware format: ${ext}`);
      }
      this.logger.info(`Upload complete: ${config.name}`);
      return result;
    } catch (err) {
      this.logger.error(`Upload failed: ${err.message}`);
      throw err;
    } finally {
      this.uploading = false;
    }
  }

  /* ---------- Strategy-based Arduino upload ---------- */

  async uploadArduinoHex(port, config, hexPath, onProgress) {
    const avrdude = this.avrdudePath || 'avrdude';
    if (!this.avrdudePath) this.logger.warn('avrdude not found, fallback to PATH');

    const baudRates = config.baudRateAlternates
      ? [config.baudRate, ...config.baudRateAlternates]
      : [config.baudRate];

    for (const strategy of FirmwareUploader.STRATEGIES) {
      for (const baud of baudRates) {
        this.logger.info(`Trying "${strategy.label}" @ ${baud} baud`);
        onProgress && onProgress(0);

        this.killStaleProcesses();
        await this.releasePort(port);

        if (strategy.noAutoReset) {
          await this.dtrReset(port);
          await new Promise(r => setTimeout(r, strategy.postDelay));
        } else {
          await new Promise(r => setTimeout(r, strategy.postDelay));
        }

        const avrdudeExtra = strategy.noAutoReset ? ['-x', 'noautoreset'] : [];

        try {
          const cfg = { ...config, baudRate: baud, avrdudeExtra };
          const result = await this._runAvrdude(avrdude, port, cfg, hexPath, onProgress);
          onProgress && onProgress(100);
          this.logger.info(`Upload succeeded: "${strategy.label}" @ ${baud} baud`);
          return result;
        } catch (err) {
          const msg = err.message.toLowerCase();
          if (msg.includes('not in sync') || msg.includes('not responding') || msg.includes('timeout') ||
              msg.includes('stk500') || msg.includes('access is denied') || msg.includes('cannot find')) {
            this.logger.warn(`Strategy "${strategy.label}" @ ${baud} failed: ${err.message}`);
            continue;
          }
          throw err;
        }
      }
    }
    throw new Error('Upload failed. Press the board\'s reset button and try again.');
  }

  /* ---------- Avrdude execution ---------- */

  _runAvrdude(avrdude, port, config, hexPath, onProgress, attempt) {
    return new Promise((resolve, reject) => {
      const args = ['-v'];
      if (this.avrdudeConf) args.push('-C', this.avrdudeConf);
      args.push('-p', config.mcu, '-c', config.protocol, '-P', port, '-b', String(config.baudRate), '-D', '-F',
        `flash:w:"${hexPath}":i`);
      if (config.avrdudeExtra) args.push(...config.avrdudeExtra);

      this.logger.info(`avrdude: ${avrdude} ${args.join(' ')}`);

      const proc = spawn(avrdude, args);
      let output = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        try { proc.kill('SIGKILL'); } catch (_) {}
        try { execSync('taskkill /F /PID ' + proc.pid + ' /T 2>nul', { stdio: 'pipe', timeout: 3000 }); } catch (_) {}
        try { execSync('powershell -NoProfile -Command "Get-Process avrdude,esptool -ErrorAction SilentlyContinue | Stop-Process -Force"', { stdio: 'pipe', timeout: 5000 }); } catch (_) {}
        reject(new Error(`avrdude timed out after ${this.avrdudeTimeout}ms\n${output}`));
      }, this.avrdudeTimeout);

      const handleData = (data) => {
        output += data.toString();
        if (onProgress) {
          const m = data.toString().match(/(\d+)%/);
          if (m) onProgress(parseInt(m[1]));
        }
      };

      proc.stdout.on('data', handleData);
      proc.stderr.on('data', handleData);

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) return;
        if (code === 0) resolve({ success: true, output });
        else reject(new Error(`avrdude exited with code ${code}\n${output}`));
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (!timedOut) reject(new Error(`Failed to run avrdude: ${err.message}`));
      });
    });
  }

  /* ---------- ESP32 (esptool) upload ---------- */

  async uploadESP32Bin(port, config, binPath, onProgress) {
    const esptool = this.esptoolPath || 'esptool.py';
    if (!this.esptoolPath) this.logger.warn('esptool not found, fallback to PATH');

    for (let attempt = 1; attempt <= 2; attempt++) {
      if (attempt > 1) this.logger.info(`ESP32 retry ${attempt}/2`);
      this.killStaleProcesses();
      onProgress && onProgress(0);

      try {
        const result = await this._runEsptool(esptool, port, config, binPath, onProgress, attempt);
        onProgress && onProgress(100);
        return result;
      } catch (err) {
        if (attempt < 2) {
          this.logger.warn(`ESP32 attempt ${attempt} failed, retrying...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          throw err;
        }
      }
    }
  }

  _runEsptool(esptool, port, config, binPath, onProgress, attempt) {
    return new Promise((resolve, reject) => {
      const args = [
        '--chip', config.chip, '--port', port, '--baud', String(config.baudRate),
        '--before', 'default_reset', '--after', 'hard_reset',
        'write_flash', '-z',
        '--flash_mode', config.flashMode, '--flash_freq', config.flashFreq, '--flash_size', config.flashSize,
        '0x1000', binPath
      ];

      this.logger.info(`esptool attempt ${attempt}: ${esptool} ${args.join(' ')}`);

      const proc = spawn(esptool, args, { shell: true });
      let output = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        reject(new Error(`esptool timed out after ${this.avrdudeTimeout}ms\n${output}`));
      }, this.avrdudeTimeout);

      const handleData = (data) => {
        output += data.toString();
        if (onProgress) {
          const m = data.toString().match(/(\d+)\s*%/);
          if (m) onProgress(parseInt(m[1]));
        }
      };

      proc.stdout.on('data', handleData);
      proc.stderr.on('data', handleData);

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) return;
        if (code === 0) resolve({ success: true, output });
        else reject(new Error(`esptool exited with code ${code}\n${output}`));
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (!timedOut) reject(new Error(`Failed to run esptool: ${err.message}`));
      });
    });
  }

  /* ---------- Helpers ---------- */

  async compileSketch(sketchPath, boardType, onProgress) {
    this.logger.info(`Compile sketch: ${sketchPath}`);
    if (onProgress) onProgress(50);
    const dir = path.dirname(sketchPath);
    const base = path.basename(sketchPath, '.ino');
    return path.join(dir, `${base}.${boardType.startsWith('esp32') ? 'bin' : 'hex'}`);
  }

  getSupportedBoards() {
    return Object.entries(this.boardConfigs).map(([id, c]) => ({ id, ...c }));
  }

  checkTools() {
    return {
      avrdude: !!this.avrdudePath,
      esptool: !!this.esptoolPath,
      avrdudePath: this.avrdudePath,
      avrdudeConf: this.avrdudeConf,
      esptoolPath: this.esptoolPath,
    };
  }
}

module.exports = FirmwareUploader;
