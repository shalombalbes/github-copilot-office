const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const path = require('path');

// Resolve the @github/copilot bin entry point
const COPILOT_MODULE = path.resolve(__dirname, '../node_modules/@github/copilot/index.js');

function setupCopilotProxy(httpsServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpsServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `https://${request.headers.host}`);
    
    if (url.pathname === '/api/copilot') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected, spawning child process: node', COPILOT_MODULE);
    
    const child = spawn(process.execPath, [COPILOT_MODULE], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.on('error', (err) => {
      console.error('[Child] Spawn error:', err.message);
      ws.close(1011, 'Child process error');
    });

    child.on('exit', (code, signal) => {
      console.log(`[Child] Exited with code ${code}, signal ${signal}`);
      ws.close(1000, 'Child process exited');
    });

    // Proxy child stdout -> WebSocket
    child.stdout.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    // Log child stderr
    child.stderr.on('data', (data) => {
      console.error('[Child stderr]', data.toString());
    });

    // Proxy WebSocket -> child stdin
    ws.on('message', (data) => {
      if (!child.killed) {
        child.stdin.write(data);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected, killing child process');
      if (!child.killed) {
        child.kill();
      }
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Error:', err.message);
      if (!child.killed) {
        child.kill();
      }
    });
  });

  console.log('WebSocket proxy configured at wss://localhost:3000/api/copilot');
}

module.exports = { setupCopilotProxy };
