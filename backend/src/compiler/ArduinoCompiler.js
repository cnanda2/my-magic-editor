/**
 * Arduino Compiler & Uploader
 * Uses arduino-cli to compile and upload sketches
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const PythonTranspiler = require('./PythonTranspiler');

class ArduinoCompiler {
  constructor(logger) {
    this.logger = logger;
    this.transpiler = new PythonTranspiler();
    this.sketchDir = path.join(__dirname, '../../temp_sketches');
    
    // Find arduino-cli
    this.cliPath = this.findArduinoCli();
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.sketchDir)) {
      fs.mkdirSync(this.sketchDir, { recursive: true });
    }
  }

  findArduinoCli() {
    // Check common locations
    const locations = [
      path.join(__dirname, '../../../tools/arduino-cli/arduino-cli.exe'),
      path.join(__dirname, '../../tools/arduino-cli/arduino-cli.exe'),
      'C:\\Program Files\\Arduino IDE\\resources\\app\\lib\\backend\\resources\\arduino-cli.exe',
      'arduino-cli', // system PATH
    ];
    
    for (const loc of locations) {
      try {
        const resolved = path.resolve(loc);
        if (fs.existsSync(resolved)) return resolved;
      } catch (e) { /* continue */ }
    }
    
    // Try system path
    try {
      execSync('arduino-cli version', { stdio: 'pipe' });
      return 'arduino-cli';
    } catch (e) { /* not in PATH */ }
    
    return null;
  }

  isAvailable() {
    return !!this.cliPath;
  }

  /**
   * Transpile Python to C++ Arduino code
   */
  transpile(pythonCode) {
    return this.transpiler.transpile(pythonCode);
  }

  /**
   * Compile Arduino sketch and return the hex path
   */
  compile(cppCode, board = 'arduino:avr:uno') {
    if (!this.cliPath) throw new Error('arduino-cli not found');

    // Create sketch directory
    const sketchName = 'user_sketch_' + Date.now();
    const sketchPath = path.join(this.sketchDir, sketchName);
    const inoPath = path.join(sketchPath, sketchName + '.ino');

    fs.mkdirSync(sketchPath, { recursive: true });
    fs.writeFileSync(inoPath, cppCode, 'utf8');

    try {
      // Compile
      const cmd = `"${this.cliPath}" compile -b ${board} "${sketchPath}"`;
      this.logger.info(`Compiling: ${cmd}`);
      const output = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
      this.logger.info(`Compile output: ${output}`);

      // Find the hex file - look in sketch dir and subdirs
      let hexFile = fs.readdirSync(sketchPath).find(f => f.endsWith('.hex'));
      if (!hexFile) {
        // Some versions put it in a subdirectory
        const subDirs = fs.readdirSync(sketchPath).filter(f => fs.statSync(path.join(sketchPath, f)).isDirectory());
        for (const dir of subDirs) {
          const dirPath = path.join(sketchPath, dir);
          hexFile = fs.readdirSync(dirPath).find(f => f.endsWith('.hex'));
          if (hexFile) {
            return {
              success: true,
              hexPath: path.join(dirPath, hexFile),
              sketchPath,
              output
            };
          }
        }
        throw new Error('Compilation succeeded but no .hex file found');
      }

      return {
        success: true,
        hexPath: path.join(buildDir, hexFile),
        sketchPath,
        output
      };
    } catch (err) {
      // Clean up on error
      this.cleanup(sketchPath);
      throw new Error('Compilation failed: ' + (err.stderr || err.message));
    }
  }

  /**
   * Upload compiled hex to board
   */
  upload(hexPath, port, board = 'arduino:avr:uno') {
    if (!this.cliPath) throw new Error('arduino-cli not found');

    const cmd = `"${this.cliPath}" upload --fqbn ${board} --port ${port} --input-file "${hexPath}"`;
    this.logger.info(`Uploading: ${cmd}`);

    try {
      const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
      this.logger.info(`Upload output: ${output}`);
      return { success: true, output };
    } catch (err) {
      throw new Error('Upload failed: ' + (err.stderr || err.message));
    }
  }

  /**
   * Full pipeline: Python → C++ → Compile → Upload
   */
  async compileAndUpload(pythonCode, port, board = 'arduino:avr:uno', onProgress, serialManager) {
    if (!this.cliPath) throw new Error('arduino-cli not found. Install it in tools/arduino-cli/');

    // Step 1: Transpile
    if (onProgress) onProgress({ step: 'transpile', progress: 10, message: 'Converting Python to C++...' });
    const cppCode = this.transpile(pythonCode);

    // Step 2: Compile
    if (onProgress) onProgress({ step: 'compile', progress: 40, message: 'Compiling Arduino sketch...' });
    const compileResult = this.compile(cppCode, board);

    // Step 3: Disconnect serial before upload (arduino-cli needs exclusive access)
    let reconnected = false;
    if (serialManager) {
      await serialManager.disconnectByPort(port);
    }

    let uploadResult;
    try {
      // Step 3b: Upload
      if (onProgress) onProgress({ step: 'upload', progress: 70, message: 'Uploading to board...' });
      uploadResult = this.upload(compileResult.hexPath, port, board);
    } finally {
      // Step 3c: Always reconnect serial regardless of upload outcome
      if (serialManager) {
        try {
          await serialManager.connect(port, { baudRate: 115200, boardType: board });
          reconnected = true;
        } catch (e) {
          this.logger.warn(`Failed to reconnect serial after upload: ${e.message}`);
        }
      }
    }

    // Step 4: Cleanup
    if (onProgress) onProgress({ step: 'done', progress: 100, message: 'Upload complete!' });
    this.cleanup(compileResult.sketchPath);

    return {
      success: true,
      cppCode,
      compileOutput: compileResult.output,
      uploadOutput: uploadResult.output,
      reconnected
    };
  }

  /**
   * List available boards/ports
   */
  listBoards() {
    if (!this.cliPath) return [];
    try {
      const output = execSync(`"${this.cliPath}" board list --format json`, { encoding: 'utf8' });
      return JSON.parse(output);
    } catch (e) {
      return [];
    }
  }

  cleanup(sketchPath) {
    try {
      fs.rmSync(sketchPath, { recursive: true, force: true });
    } catch (e) { /* ignore */ }
  }
}

module.exports = ArduinoCompiler;
