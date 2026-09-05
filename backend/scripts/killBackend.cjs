const { execSync } = require('child_process');

try {
  const output = execSync('netstat -ano | findstr :5000', { encoding: 'utf-8' });
  const lines = output.trim().split('\n');
  const pids = new Set();
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5 && parts[1].includes(':5000')) {
      const pid = parseInt(parts[4], 10);
      if (pid && pid !== process.pid) pids.add(pid);
    }
  }
  if (pids.size === 0) {
    console.log('No active process found on port 5000.');
  } else {
    for (const pid of pids) {
      console.log(`Terminating process on port 5000 (PID: ${pid})...`);
      try {
        execSync(`taskkill /F /PID ${pid}`);
      } catch (_) {}
    }
    console.log('✓ Port 5000 is now free.');
  }
} catch (e) {
  console.log('No active process found on port 5000.');
}
