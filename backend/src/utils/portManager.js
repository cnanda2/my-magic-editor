const { execSync } = require('child_process');
const os = require('os');

class PortManager {
  constructor(logger) {
    this.logger = logger;
  }

  killStaleProcesses() {
    if (os.platform() === 'win32') {
      const cmds = [
        'taskkill /F /IM avrdude.exe /T 2>nul',
        'taskkill /F /IM avrdude-snooze.exe /T 2>nul',
        'taskkill /F /IM esptool.exe /T 2>nul',
        'taskkill /F /IM esptool.py /T 2>nul',
        'powershell -NoProfile -Command "Get-Process avrdude,esptool,esptool.py -ErrorAction SilentlyContinue | Stop-Process -Force" 2>nul'
      ];
      for (const c of cmds) {
        try { execSync(c, { stdio: 'pipe', timeout: 5000 }); } catch (_) {}
      }
    } else {
      const cmds = ['pkill -9 avrdude 2>/dev/null', 'pkill -9 esptool 2>/dev/null'];
      for (const c of cmds) {
        try { execSync(c, { stdio: 'pipe', timeout: 5000 }); } catch (_) {}
      }
    }
  }

  forceReleasePort(port) {
    if (os.platform() === 'win32') {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = execSync(
            `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = New-Object System.IO.Ports.SerialPort '${port}',115200,None,8,One; try { $p.Open(); Start-Sleep -Milliseconds 200; $p.Close(); Write-Host OK } catch { Write-Host FAIL:$($_.Exception.Message) } finally { $p.Dispose(); [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers() }"`,
            { stdio: 'pipe', timeout: 10000 }
          );
          const out = result.toString().trim();
          if (out === 'OK') { this.logger.info(`forceReleasePort OK (attempt ${attempt + 1})`); return; }
          this.logger.warn(`forceReleasePort attempt ${attempt + 1}: ${out}`);
        } catch (e) {
          this.logger.warn(`forceReleasePort attempt ${attempt + 1} failed: ${e.message}`);
        }
        if (attempt < 2) require('child_process').execSync(`powershell -NoProfile -Command "Start-Sleep -Milliseconds 500"`, { stdio: 'pipe', timeout: 3000 });
      }
    }
  }

  async dtrReset(port) {
    this.logger.info(`DTR reset on ${port} (post-upload)...`);
    if (os.platform() === 'win32') {
      try {
        const result = execSync(
          `powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = New-Object System.IO.Ports.SerialPort '${port}',115200,None,8,One; try { $p.Open(); Start-Sleep -Milliseconds 100; $p.DtrEnable = $true; Start-Sleep -Milliseconds 100; $p.DtrEnable = $false; Start-Sleep -Milliseconds 500; $p.DtrEnable = $true; Start-Sleep -Milliseconds 100; $p.Close(); Write-Host OK } catch { Write-Host FAIL } finally { $p.Dispose() }"`,
          { stdio: 'pipe', timeout: 10000 }
        );
        if (result.toString().trim() === 'OK') { this.logger.info('DTR reset OK'); }
      } catch (e) {
        this.logger.warn(`DTR reset failed on ${port}: ${e.message}`);
      }
    }
  }

  async ensurePortFree(port, serialManager) {
    this.logger.info(`Ensuring port ${port} is free...`);
    this.killStaleProcesses();

    if (serialManager) {
      try {
        await Promise.race([
          serialManager.disconnectByPort(port, { skipDtr: true }),
          new Promise(r => setTimeout(r, 3000))
        ]);
      } catch (_) {}
    }

    this.forceReleasePort(port);
    await new Promise(r => setTimeout(r, 2000));
    this.killStaleProcesses();
    this.logger.info(`Port ${port} should now be free`);
  }
}

module.exports = PortManager;
