/**
 * Dev launcher: runs the STEM Educator backend (:3001) and the
 * portal frontend (:5173) together from a single `npm start`.
 *
 *   npm start          -> backend + frontend
 *   npm start backend  -> backend only
 *   npm start frontend -> frontend only
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT = __dirname;
const BACKEND_DIR = path.join(ROOT, 'backend');
const FRONTEND_DIR = path.join(ROOT, 'frontend');

const ONLY = process.argv[2];

const colors = {
  backend: '\x1b[36m[backend]\x1b[0m',
  frontend: '\x1b[35m[frontend]\x1b[0m',
  info: '\x1b[33m[stem-educator]\x1b[0m',
};

const children = [];

function start(name, color, cwd, command, args) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  child.stdout.on('data', (d) => process.stdout.write(`${color} ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`${color} ${d}`));
  child.on('exit', (code, signal) => {
    if (signal) {
      // killed by us on shutdown; ignore
    } else if (code !== 0 && code !== null) {
      process.stderr.write(`${color} ${name} exited with code ${code}\n`);
    }
  });

  children.push({ name, child });
  return child;
}

function shutdown() {
  process.stdout.write(`\n${colors.info} shutting down...\n`);
  for (const { name, child } of children) {
    try {
      child.kill('SIGTERM');
    } catch (_) {
      // ignore
    }
  }
  // Give them a moment, then force-kill any survivors
  setTimeout(() => {
    for (const { child } of children) {
      try {
        if (!child.killed) child.kill('SIGKILL');
      } catch (_) {
        // ignore
      }
    }
    process.exit(0);
  }, 2000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (ONLY !== 'frontend') {
  console.log(`${colors.info} starting backend on http://localhost:3001`);
  start('backend', colors.backend, BACKEND_DIR, 'node', ['src/index.js']);
}

if (ONLY !== 'backend') {
  console.log(`${colors.info} starting frontend on http://localhost:5173`);
  start('frontend', colors.frontend, FRONTEND_DIR, 'npm', ['run', 'dev']);
}

console.log(`${colors.info} ready. Press Ctrl+C to stop both.\n`);
