const { spawn } = require('child_process');

function runProcess(command, args, name, envOverrides = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...envOverrides }
  });
  child.on('close', (code) => {
    console.log(`${name} exited with code ${code}`);
    process.exit(code || 1);
  });
  return child;
}

console.log('Starting EchoMetrics full-stack application...');
// Backend runs internally on port 3000
runProcess('node', ['backend/dist/main/server.js'], 'Backend', { PORT: '3000' });
// Frontend runs on the container's public PORT (defaults to 8080 on Cloud Run)
runProcess('node', ['frontend/dist/frontend/server/server.mjs'], 'Frontend');
