/**
 * Driver & Port Manager
 * Handles driver detection, port reset, and auto-detection for Arduino boards
 */

const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class DriverManager {
  constructor(logger) {
    this.logger = logger;
    this.knownDevices = [
      { vid: '1A86', pid: '7523', name: 'CH340/CH341', driver: 'CH341SER' },
      { vid: '1A86', pid: '5523', name: 'CH340/CH341 (alternative)', driver: 'CH341SER' },
      { vid: '2341', pid: '0043', name: 'Arduino Uno (Official)', driver: 'Arduino' },
      { vid: '2341', pid: '8036', name: 'Arduino Leonardo', driver: 'Arduino' },
      { vid: '2341', pid: '0058', name: 'Arduino Nano (Official)', driver: 'Arduino' },
      { vid: '2341', pid: '0242', name: 'Arduino Mega 2560 (Official)', driver: 'Arduino' },
      { vid: '239A', pid: '800A', name: 'Adafruit Feather', driver: 'Adafruit' },
      { vid: '239A', pid: '80A9', name: 'Adafruit ItsyBitsy nRF52840', driver: 'Adafruit' },
      { vid: '10C4', pid: 'EA60', name: 'CP2102/CP2104', driver: 'CP210x VCP' },
      { vid: '10C4', pid: 'EA70', name: 'CP2102N', driver: 'CP210x VCP' },
      { vid: '0403', pid: '6001', name: 'FT232R/FT231X', driver: 'FTDI VCP' },
      { vid: '0403', pid: '6015', name: 'FT231X', driver: 'FTDI VCP' },
      { vid: '2E8A', pid: '0005', name: 'Raspberry Pi Pico', driver: 'Pico' },
      { vid: '303A', pid: '0001', name: 'ESP32-S2/S3', driver: 'ESP32' },
    ];
    this.psScriptPath = path.join(__dirname, '../../tools/find-arduino-port.ps1');
  }

  /**
   * Find Arduino board by USB hardware ID (vendor/product)
   */
  async findArduino() {
    try {
      // Method 1: Use serialport library (already available)
      const { SerialPort } = require('serialport');
      const ports = await SerialPort.list();
      
      for (const port of ports) {
        const portVid = (port.vendorId || '').replace('0x', '').toUpperCase();
        const portPid = (port.productId || '').replace('0x', '').toUpperCase();
        
        for (const device of this.knownDevices) {
          if (portVid === device.vid && portPid === device.pid) {
            return {
              found: true,
              port: port.path,
              device: device.name,
              vid: portVid,
              pid: portPid,
              manufacturer: port.manufacturer || ''
            };
          }
        }

        // Fallback: match only by VID if PID doesn't match
        for (const device of this.knownDevices) {
          if (portVid === device.vid && !portPid) {
            return {
              found: true,
              port: port.path,
              device: device.name + ' (approximate)',
              vid: portVid,
              pid: portPid,
              manufacturer: port.manufacturer || ''
            };
          }
        }
      }

      return { found: false };
    } catch (err) {
      this.logger.error(`findArduino error: ${err.message}`);
      return { found: false };
    }
  }

  /**
   * Find port using PowerShell script (fallback)
   */
  async findPortWithPowerShell() {
    try {
      if (!fs.existsSync(this.psScriptPath)) {
        return { found: false };
      }
      const output = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${this.psScriptPath}"`,
        { encoding: 'utf8', timeout: 10000 }
      );
      const result = JSON.parse(output.trim());
      return result;
    } catch (err) {
      return { found: false };
    }
  }

  /**
   * All-in-one: find Arduino using any available method
   */
  async detectAnyArduino() {
    // Try primary method (serialport library)
    const result = await this.findArduino();
    if (result.found) return result;

    // Try PowerShell fallback
    const psResult = await this.findPortWithPowerShell();
    if (psResult.found) return psResult;

    // Last resort: scan raw port list
    try {
      const { SerialPort } = require('serialport');
      const ports = await SerialPort.list();
      if (ports.length > 0) {
        return { found: true, port: ports[0].path, device: ports[0].manufacturer || 'Unknown' };
      }
    } catch (e) {}

    // Fallback: use PowerShell to list COM ports
    try {
      const { execSync } = require('child_process');
      const output = execSync(
        `powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::getPortNames() | ForEach-Object { @{DeviceID=$_; Description='COM port'} } | ConvertTo-Json"`,
        { encoding: 'utf8', timeout: 5000 }
      );
      const parsed = JSON.parse(output.trim());
      const ports = Array.isArray(parsed) ? parsed : [parsed];
      if (ports.length > 0) {
        return { found: true, port: ports[0].DeviceID.toUpperCase(), device: 'Auto-detected COM port' };
      }
    } catch (e) {}

    return { found: false };
  }

  /**
   * Check driver status for known devices
   */
  async checkDriverStatus() {
    const result = { drivers: [], issues: [] };

    try {
      const { SerialPort } = require('serialport');
      const ports = await SerialPort.list();

      for (const device of this.knownDevices) {
        const matching = ports.find(p => {
          const vid = (p.vendorId || '').replace('0x', '').toUpperCase();
          const pid = (p.productId || '').replace('0x', '').toUpperCase();
          return vid === device.vid && pid === device.pid;
        });

        result.drivers.push({
          name: device.name,
          vid: device.vid,
          pid: device.pid,
          driverName: device.driver,
          detected: !!matching,
          port: matching ? matching.path : null,
          friendlyName: matching ? this.getFriendlyName(matching) : ''
        });
      }

      // Check for unknown CH340-like devices that might need attention
      const unknown = ports.filter(p => {
        const vid = (p.vendorId || '').replace('0x', '').toUpperCase();
        const pid = (p.productId || '').replace('0x', '').toUpperCase();
        return !this.knownDevices.some(d => d.vid === vid && d.pid === pid);
      });

      if (unknown.length > 0) {
        result.issues.push({
          type: 'unknown_device',
          message: `${unknown.length} UNKNOWN serial device(s) found`,
          devices: unknown.map(p => ({
            path: p.path,
            vid: p.vendorId,
            pid: p.productId,
            desc: p.manufacturer || 'Unknown'
          }))
        });
      }
    } catch (err) {
      result.issues.push({ type: 'error', message: err.message });
    }

    return result;
  }

  /**
   * Reset a stuck COM port using Windows WMI
   */
  async resetPort(portPath) {
    this.logger.info(`Resetting port: ${portPath}`);
    try {
      // Method 1: PowerShell disable/enable via WMI
      const comNumber = portPath.replace('COM', '').replace('com', '');
      execSync(
        `powershell -NoProfile -Command "$d=Get-WmiObject Win32_PnPEntity|?{$_.Name -match 'COM${comNumber}'}; if($d){$d.Disable();Start-Sleep 2;$d.Enable();Write-Output 'OK'}"`,
        { encoding: 'utf8', timeout: 15000 }
      );
      this.logger.info(`Port ${portPath} reset successfully`);
      return { success: true };
    } catch (err) {
      this.logger.error(`Failed to reset port ${portPath}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  getFriendlyName(port) {
    const vid = (port.vendorId || '').replace('0x', '').toUpperCase();
    const pid = (port.productId || '').replace('0x', '').toUpperCase();
    const device = this.knownDevices.find(d => d.vid === vid && d.pid === pid);
    return device ? `${device.name} (${port.path})` : `${port.path} (${port.manufacturer || 'Unknown'})`;
  }
}

module.exports = DriverManager;
