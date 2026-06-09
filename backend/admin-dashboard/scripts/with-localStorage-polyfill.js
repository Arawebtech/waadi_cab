#!/usr/bin/env node

// Load localStorage polyfill before anything else
require('../localStorage-polyfill.js');

// Now execute the original command
const { spawn } = require('child_process');
const args = process.argv.slice(2);

const child = spawn('npx', ['react-scripts', ...args], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

