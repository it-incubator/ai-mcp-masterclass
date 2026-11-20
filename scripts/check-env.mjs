// Pre-flight check for students. Plain ESM, no dependencies, runs on any Node >= 14.
// Usage: node scripts/check-env.mjs [--ports]
import { execSync } from 'node:child_process';
import net from 'node:net';

const problems = [];

const [major, minor] = process.versions.node.split('.').map(Number);
const nodeOk = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 23;
if (!nodeOk) {
  problems.push(
    `Node ${process.versions.node} is not supported. Use Node 20.19+ or 22.12+ (22 LTS recommended: "nvm install 22").`,
  );
}

try {
  execSync('docker info', { stdio: 'ignore' });
} catch {
  problems.push('Docker is not available. Install/start Docker Desktop and wait until it says "running".');
}

function isBusy(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: 'localhost' });
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('error', () => resolve(false));
  });
}

if (process.argv.includes('--ports')) {
  for (const [port, what] of [[3000, 'backend'], [5180, 'frontend']]) {
    if (await isBusy(port)) {
      problems.push(`Port ${port} (${what}) is already in use. Stop the other process (is "npm run dev" already running?).`);
    }
  }
}

if (problems.length) {
  console.error('\nCannot continue:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
  process.exit(1);
}
console.log(`Environment OK (Node ${process.versions.node}, Docker running).`);
