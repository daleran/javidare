export function createNetClient(wsUrl) {
  let ws = null;
  let onTickCb = null;
  let onJoinedCb = null;
  let onPlayerJoinedCb = null;
  let onPlayerLeftCb = null;
  let playerId = null;

  let lastTick = null;
  let prevTick = null;
  let tickTime = 0;        // ms since last tick arrived
  const TICK_MS = 50;      // 20 Hz

  // Build-phase progress tracking for sending build_requests
  let buildProgress = 0;
  let buildBodyId = null;
  let buildType = null;
  const BUILD_DURATION = 1.0;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join' }));
    };

    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === 'joined') {
        playerId = msg.playerId;
        if (onJoinedCb) onJoinedCb(msg);
      } else if (msg.type === 'tick') {
        prevTick = lastTick;
        lastTick = msg;
        tickTime = 0;
        if (onTickCb) onTickCb(msg);
      } else if (msg.type === 'player_joined' && onPlayerJoinedCb) {
        onPlayerJoinedCb(msg);
      } else if (msg.type === 'player_left' && onPlayerLeftCb) {
        onPlayerLeftCb(msg);
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => { ws = null; };
  }

  function sendInput(keys, pressed) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'input', keys, pressed }));
  }

  function sendBuildRequest(bodyId, buildingType) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'build_request', bodyId, buildingType }));
  }

  // Apply a server tick delta onto the local game state
  function applyTick(delta, state) {
    if (!delta) return;

    // Player ships
    const localId = playerId;
    const remotePlayers = [];
    const playersDelta = delta.players || {};
    for (const [id, p] of Object.entries(playersDelta)) {
      if (id === localId) {
        if (state.playerShip) {
          state.playerShip.x = p.x;
          state.playerShip.y = p.y;
          state.playerShip.vx = p.vx;
          state.playerShip.vy = p.vy;
          state.playerShip.heading = p.heading;
          state.playerShip.hp = p.hp;
          state.playerShip.maxHp = p.maxHp;
        } else {
          state.playerShip = { ...p, id };
        }
      } else {
        remotePlayers.push({ id, ...p });
      }
    }
    state.remotePlayers = remotePlayers;

    // If local player is absent from the tick, their ship was destroyed server-side
    if (localId !== null && !(localId in playersDelta)) {
      state.playerShip = null;
    }

    // Overwrite simulation arrays from server
    state.fleet = delta.fleet || [];
    state.enemies = delta.enemies || [];
    state.projectiles = delta.projectiles || [];
    state.pickups = delta.pickups || [];
    state.fx = delta.fx || [];
    state.wrecks = delta.wrecks || [];

    // Buildings: merge by id to preserve shape/heading for renderer
    if (delta.buildings) {
      state.buildings = delta.buildings.map(sb => {
        const existing = state.buildings.find(b => b.id === sb.id);
        return existing ? Object.assign(existing, sb) : sb;
      });
    }

    // Body positions from server
    if (delta.bodies) {
      const byId = {};
      for (const b of state.bodies) byId[b.id] = b;
      for (const sb of delta.bodies) {
        if (byId[sb.id]) {
          byId[sb.id].x = sb.x;
          byId[sb.id].y = sb.y;
          byId[sb.id].angle = sb.angle;
        }
      }
    }

    state.wallet = delta.wallet ?? state.wallet;
    state.incomePerSec = delta.incomePerSec ?? state.incomePerSec;
    state.waveIndex = delta.waveIndex ?? state.waveIndex;
    state.wavePhase = delta.wavePhase ?? state.wavePhase;
    state.waveTimer = delta.waveTimer ?? state.waveTimer;
    state.waveOrigins = delta.waveOrigins ?? state.waveOrigins;
    state.gameStatus = delta.gameStatus ?? state.gameStatus;
  }

  return {
    connect,
    sendInput,
    sendBuildRequest,
    applyTick,
    getPlayerId: () => playerId,
    isOpen: () => ws && ws.readyState === WebSocket.OPEN,
    onTick: (fn) => { onTickCb = fn; },
    onJoined: (fn) => { onJoinedCb = fn; },
    onPlayerJoined: (fn) => { onPlayerJoinedCb = fn; },
    onPlayerLeft: (fn) => { onPlayerLeftCb = fn; },
  };
}
