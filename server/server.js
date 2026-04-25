import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { GameRoom } from './room.js';

const PORT = process.env.PORT || 8787;
const rooms = new Map();

const httpServer = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const path = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // POST /rooms — create a new room
  if (req.method === 'POST' && path === '/rooms') {
    const roomId = crypto.randomUUID().slice(0, 8);
    rooms.set(roomId, new GameRoom(roomId, () => rooms.delete(roomId)));
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ roomId }));
    return;
  }

  // GET /rooms/:id — room info
  const infoMatch = path.match(/^\/rooms\/([^/]+)$/);
  if (infoMatch && req.method === 'GET') {
    const room = rooms.get(infoMatch[1]);
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ players: room ? room.playerCount() : 0 }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://localhost`);
  const wsMatch = url.pathname.match(/^\/rooms\/([^/]+)\/ws$/);
  if (!wsMatch) { socket.destroy(); return; }

  const room = rooms.get(wsMatch[1]);
  if (!room) { socket.destroy(); return; }

  wss.handleUpgrade(req, socket, head, (ws) => {
    room.handleWebSocket(ws);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Game server listening on :${PORT}`);
});
