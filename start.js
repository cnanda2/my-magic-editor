const net = require('net');
const fs = require('fs');
const readline = require('readline');
const { spawn, execSync } = require('child_process');
const path = require('path');

const CANDIDATES = [3001, 3000, 8080, 8000, 4000, 5000, 9000, 9001];

function checkPort(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => { srv.close(); resolve(true); });
    srv.listen(port, '0.0.0.0');
  });
}

async function scanPorts() {
  const free = [];
  for (const p of CANDIDATES) {
    if (await checkPort(p)) free.push(p);
  }
  return free;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); });
  });
}

function startServer(port) {
  console.log('\n\x1b[32m✔ Starting StemEducatorApp on port ' + port + '\x1b[0m');
  console.log('\x1b[36m  Open: http://localhost:' + port + '\x1b[0m\n');

  const env = Object.assign({}, process.env, { PORT: String(port) });
  const server = spawn(process.execPath, [path.join(__dirname, 'backend', 'src', 'index.js')], {
    env,
    stdio: 'inherit',
    cwd: path.join(__dirname, 'backend'),
  });

  server.on('exit', (code) => {
    console.log('\nServer stopped (exit code ' + code + ')');
    process.exit(code || 0);
  });
}

(async () => {
  console.log('\n\x1b[1m╔══════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m║      StemEducatorApp — Launcher      ║\x1b[0m');
  console.log('\x1b[1m╚══════════════════════════════════════╝\x1b[0m\n');

  // ── dependency guard (fixes MODULE_NOT_FOUND: express) ─────────────────
  const backendDepsOk = fs.existsSync(path.join(__dirname, 'backend', 'node_modules', 'express', 'package.json'));
  if (!backendDepsOk) {
    console.log('\x1b[33m  ⚠  Backend dependencies missing (express not found).\x1b[0m');
    console.log('     Attempting auto-install: cd backend && npm install --omit=dev\n');
    try {
      execSync('npm install --omit=dev', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
      console.log('\x1b[32m  ✔  Backend dependencies installed.\x1b[0m\n');
    } catch (e) {
      console.log('\x1b[33m     Retrying with --legacy-peer-deps...\x1b[0m');
      try {
        execSync('npm install --legacy-peer-deps', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
        console.log('\x1b[32m  ✔  Backend dependencies installed.\x1b[0m\n');
      } catch (e2) {
        console.error('\x1b[31m  ✘  Failed to install backend dependencies.\x1b[0m');
        console.error('     Run manually:  cd backend && npm install');
        console.error('     Or re-run:    setup.bat  /  Setup.ps1  /  node setup.js');
        process.exit(1);
      }
    }
    if (!fs.existsSync(path.join(__dirname, 'backend', 'node_modules', 'express', 'package.json'))) {
      console.error('\x1b[31m  ✘  Verification failed - express still missing after install.\x1b[0m');
      process.exit(1);
    }
  }
  // ensure logs dir exists for winston
  try { fs.mkdirSync(path.join(__dirname, 'backend', 'logs'), { recursive: true }); } catch {}

  console.log('Scanning available ports...\n');
  const freePorts = await scanPorts();

  if (freePorts.length === 0) {
    console.error('\x1b[31mNo free ports found. Close other applications and try again.\x1b[0m');
    process.exit(1);
  }

  console.log('Available ports:');
  freePorts.forEach((p, i) => {
    const tag = i === 0 ? '  \x1b[32m← recommended\x1b[0m' : '';
    console.log('  [' + (i + 1) + '] ' + p + tag);
  });
  console.log('  [c] Enter a custom port\n');

  const ans = await ask('Choose a port [press Enter for ' + freePorts[0] + ']: ');

  if (ans === '' || ans === '1') {
    startServer(freePorts[0]);
  } else if (ans === 'c' || ans === 'C') {
    const custom = await ask('Enter port number: ');
    const num = parseInt(custom, 10);
    if (isNaN(num) || num < 1 || num > 65535) {
      console.error('\x1b[31mInvalid port number.\x1b[0m');
      process.exit(1);
    }
    const isFree = await checkPort(num);
    if (!isFree) {
      console.error('\x1b[31mPort ' + num + ' is already in use.\x1b[0m');
      process.exit(1);
    }
    startServer(num);
  } else {
    const idx = parseInt(ans, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= freePorts.length) {
      console.error('\x1b[31mInvalid selection.\x1b[0m');
      process.exit(1);
    }
    startServer(freePorts[idx]);
  }
})();
