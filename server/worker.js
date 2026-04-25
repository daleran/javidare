import { GameRoom } from './room.js';
export { GameRoom };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS for dev
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // POST /rooms — create a new room
    if (request.method === 'POST' && path === '/rooms') {
      const roomId = crypto.randomUUID().slice(0, 8);
      const stub = getRoomStub(env, roomId);
      // Ping the DO to initialize it
      await stub.fetch(new Request('http://do/init'));
      return json({ roomId }, corsHeaders);
    }

    // GET /rooms/:id/ws — WebSocket upgrade into the DO
    const wsMatch = path.match(/^\/rooms\/([^/]+)\/ws$/);
    if (wsMatch) {
      const roomId = wsMatch[1];
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }
      const stub = getRoomStub(env, roomId);
      return stub.fetch(request);
    }

    // GET /rooms/:id — room info (player count)
    const infoMatch = path.match(/^\/rooms\/([^/]+)$/);
    if (infoMatch && request.method === 'GET') {
      const roomId = infoMatch[1];
      const stub = getRoomStub(env, roomId);
      return stub.fetch(new Request('http://do/info'));
    }

    return new Response('Not found', { status: 404 });
  },
};

function getRoomStub(env, roomId) {
  const id = env.GAME_ROOM.idFromName(roomId);
  return env.GAME_ROOM.get(id);
}

function json(data, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
