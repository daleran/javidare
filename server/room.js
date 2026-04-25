import { createState, nextId } from '../src/game/state.js';
import { initBodies, updateOrbits } from '../src/world/solarSystem.js';
import { createPlayerShip, PLAYER_HP, PLAYER_SPEED, PLAYER_ACCEL, PLAYER_DAMPING,
         PLAYER_FIRE_RATE, PLAYER_PROJECTILE_SPEED, PLAYER_PROJECTILE_DAMAGE, PLAYER_FIRE_RANGE,
         HOME_HEAL_RADIUS, HOME_HEAL_RATE } from '../src/entities/playerShip.js';
import { createBuilding } from '../src/entities/building.js';
import { createFleetShip, FLEET_SPEED, FLEET_ACCEL, FLEET_DAMPING, getSlotOffset } from '../src/entities/fleetShip.js';
import { updateCombat } from '../src/systems/combat.js';
import { updateEconomy } from '../src/systems/economy.js';
import { updateWaves } from '../src/systems/waves.js';
import { BUILDING_FOR_BODY, BUILDING_COST } from '../src/world/bodies.js';

const TICK_RATE = 20;           // Hz
const TICK_MS = 1000 / TICK_RATE;
const TICK_DT = 1 / TICK_RATE;
const CLIENT_HZ = 60;           // client simulation rate — server sub-steps to match
const MAX_PLAYERS = 2;
const TURN_SPEED = 3.2;
const FOLLOW_ENTER_RADIUS = 2.8;
const WORLD_HALF = 4400;

export class GameRoom {
  constructor(roomId, onEmpty) {
    this.roomId = roomId;
    this.onEmpty = onEmpty;     // called when last player leaves so server can clean up
    this.sessions = new Map();  // playerId → WebSocket
    this.inputBuffers = new Map(); // playerId → { keys, pressed }
    this.gameState = null;
    this.tick = 0;
    this.running = false;
    this.tickInterval = null;
  }

  playerCount() {
    return this.sessions.size;
  }

  handleWebSocket(ws) {
    if (this.sessions.size >= MAX_PLAYERS) {
      ws.send(JSON.stringify({ type: 'error', reason: 'room_full' }));
      ws.close(1008, 'room_full');
      return;
    }

    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      this.webSocketMessage(ws, msg);
    });

    ws.on('close', () => this.webSocketClose(ws));
    ws.on('error', () => this.webSocketClose(ws));
  }

  webSocketMessage(ws, msg) {
    const playerId = this.playerIdFor(ws);

    if (msg.type === 'join') {
      this.handleJoin(ws, msg);
      return;
    }

    if (!playerId) return;

    if (msg.type === 'input') {
      this.inputBuffers.set(playerId, {
        keys: msg.keys || {},
        pressed: msg.pressed || {},
      });
      return;
    }

    if (msg.type === 'build_request') {
      this.handleBuildRequest(playerId, msg);
      return;
    }
  }

  webSocketClose(ws) {
    const playerId = this.playerIdFor(ws);
    if (!playerId) return;

    this.sessions.delete(playerId);
    this.inputBuffers.delete(playerId);

    if (this.gameState && this.gameState.players) {
      delete this.gameState.players[playerId];
    }

    this.broadcast({ type: 'player_left', playerId });

    if (this.sessions.size === 0) {
      this.stopLoop();
      if (this.onEmpty) this.onEmpty();
    }
  }

  playerIdFor(ws) {
    for (const [id, sock] of this.sessions) {
      if (sock === ws) return id;
    }
    return null;
  }

  handleJoin(ws, msg) {
    const playerId = msg.playerId || `p${this.sessions.size}`;

    if (!this.gameState) {
      this.initGameState();
    }

    this.sessions.set(playerId, ws);
    this.inputBuffers.set(playerId, { keys: {}, pressed: {} });

    const home = this.gameState.bodies.find(b => b.isHome);
    const angle = Math.random() * Math.PI * 2;
    const spawnX = home.x + Math.cos(angle) * (home.radius + 30);
    const spawnY = home.y + Math.sin(angle) * (home.radius + 30);
    const ship = createPlayerShip(spawnX, spawnY);
    ship.id = playerId;
    this.gameState.players[playerId] = ship;

    if (!this.gameState.leaderPlayerId) {
      this.gameState.leaderPlayerId = playerId;
    }

    ws.send(JSON.stringify({ type: 'joined', playerId, roomId: this.roomId }));
    this.broadcast({ type: 'player_joined', playerId }, ws);

    ws.send(JSON.stringify({ type: 'tick', tick: this.tick, ...this.buildDelta() }));

    if (!this.running) {
      this.startLoop();
    }
  }

  initGameState() {
    this.gameState = createState();
    this.gameState.playerShip = null;
    this.gameState.players = {};
    this.gameState.leaderPlayerId = null;

    this.gameState.bodies = initBodies();

    const home = this.gameState.bodies.find(b => b.isHome);
    const extId = nextId(this.gameState);
    const extractor = createBuilding(extId, 'extractor', home.id, home.x, home.y);
    this.gameState.buildings.push(extractor);
    home.buildings.push({ type: 'extractor', id: extId });

    this.gameState.buildPhase = 'idle';
    this.gameState.buildProgress = 0;
    this.gameState.buildBodyId = null;
    this.gameState.buildCost = 0;
    this.gameState.buildType = null;
    this.gameState.buildAffordable = false;
  }

  startLoop() {
    if (this.running) return;
    this.running = true;
    this.tickInterval = setInterval(() => this.runTick(), TICK_MS);
  }

  stopLoop() {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  runTick() {
    const gs = this.gameState;
    if (!gs || gs.gameStatus !== 'playing') return;

    this.tick++;

    updateOrbits(gs.bodies, TICK_DT);
    this.tickAllPlayerMovement(TICK_DT);

    const leaderShip = gs.players[gs.leaderPlayerId] || Object.values(gs.players)[0] || null;
    gs.playerShip = leaderShip;

    updateCombat(gs, TICK_DT);
    updateEconomy(gs, TICK_DT);
    updateWaves(gs, TICK_DT);

    for (const bldg of gs.buildings) {
      const body = gs.bodies.find(b => b.id === bldg.bodyId);
      if (body) { bldg.x = body.x; bldg.y = body.y; }
    }

    this.broadcast({ type: 'tick', tick: this.tick, ...this.buildDelta() });
  }

  tickAllPlayerMovement(dt) {
    const gs = this.gameState;
    const subSteps = Math.round(CLIENT_HZ * dt); // e.g. 3 sub-steps of 1/60 per 1/20 s tick
    const subDt = dt / subSteps;

    for (const [playerId, ship] of Object.entries(gs.players)) {
      const input = this.inputBuffers.get(playerId) || { keys: {}, pressed: {} };
      for (let i = 0; i < subSteps; i++) {
        tickShipMovement(ship, input.keys, gs.bodies, subDt);
      }
    }

    const leader = gs.players[gs.leaderPlayerId] || Object.values(gs.players)[0];
    if (leader) {
      tickFleetMovement(gs.fleet, leader, dt);
    }
  }

  handleBuildRequest(playerId, msg) {
    const gs = this.gameState;
    const { bodyId, buildingType } = msg;

    const body = gs.bodies.find(b => b.id === bodyId);
    if (!body) return this.sendTo(playerId, { type: 'build_result', ok: false, reason: 'body_not_found' });

    const allowed = (BUILDING_FOR_BODY[body.type] || []).includes(buildingType);
    if (!allowed) return this.sendTo(playerId, { type: 'build_result', ok: false, reason: 'not_allowed' });

    if (body.buildings.find(b => b.type === buildingType)) {
      return this.sendTo(playerId, { type: 'build_result', ok: false, reason: 'already_built' });
    }

    const now = Date.now() / 1000;
    const cd = (body.cooldowns && body.cooldowns[buildingType]) || 0;
    if (now < cd) return this.sendTo(playerId, { type: 'build_result', ok: false, reason: 'on_cooldown' });

    const cost = BUILDING_COST[buildingType];
    if (gs.wallet < cost) {
      return this.sendTo(playerId, { type: 'build_result', ok: false, reason: 'insufficient_funds' });
    }

    gs.wallet -= cost;
    const id = nextId(gs);
    const building = createBuilding(id, buildingType, body.id, body.x, body.y);
    gs.buildings.push(building);
    body.buildings.push({ type: buildingType, id });

    if (buildingType === 'shipyard') {
      gs.shipyardCount++;
      gs.fleetCap = gs.shipyardCount * 4;
      for (const slot of building.slots) {
        slot.respawnTimer = 2;
      }
    }

    this.broadcast({ type: 'build_result', ok: true, bodyId, buildingType });
  }

  buildDelta() {
    const gs = this.gameState;
    return {
      players:     Object.fromEntries(
        Object.entries(gs.players).map(([id, s]) => [id, { x: s.x, y: s.y, vx: s.vx, vy: s.vy, heading: s.heading, hp: s.hp, maxHp: s.maxHp }])
      ),
      fleet:       gs.fleet.map(f => ({ id: f.id, x: f.x, y: f.y, heading: f.heading, hp: f.hp })),
      enemies:     gs.enemies.map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, heading: e.heading, hp: e.hp, maxHp: e.maxHp })),
      projectiles: gs.projectiles.map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, faction: p.faction, ttl: p.ttl })),
      pickups:     gs.pickups.map(p => ({ x: p.x, y: p.y, value: p.value, ttl: p.ttl })),
      fx:          gs.fx.map(f => ({ x: f.x, y: f.y, vx: f.vx, vy: f.vy, ttl: f.ttl, maxTtl: f.maxTtl, color: f.color, len: f.len })),
      buildings:   gs.buildings.map(b => ({ id: b.id, type: b.type, bodyId: b.bodyId, x: b.x, y: b.y, hp: b.hp, maxHp: b.maxHp, heading: b.heading || 0 })),
      bodies:      gs.bodies.map(b => ({ id: b.id, x: b.x, y: b.y, angle: b.angle })),
      wrecks:      gs.wrecks.map(w => ({ bodyId: w.bodyId, timer: w.timer })),
      wallet:      gs.wallet,
      incomePerSec: gs.incomePerSec,
      waveIndex:   gs.waveIndex,
      wavePhase:   gs.wavePhase,
      waveTimer:   gs.waveTimer,
      waveOrigins: gs.waveOrigins,
      gameStatus:  gs.gameStatus,
    };
  }

  sendTo(playerId, msg) {
    const ws = this.sessions.get(playerId);
    if (ws) ws.send(JSON.stringify(msg));
  }

  broadcast(msg, excludeWs = null) {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    for (const ws of this.sessions.values()) {
      if (ws !== excludeWs) ws.send(text);
    }
  }
}

// ─── Server-side movement (mirrors src/systems/movement.js) ─────────────────

function tickShipMovement(ship, keys, bodies, dt) {
  if (keys.KeyA) ship.heading -= TURN_SPEED * dt;
  if (keys.KeyD) ship.heading += TURN_SPEED * dt;

  const thrusting = keys.KeyW || keys.KeyS;
  ship.thrustTime = thrusting ? Math.min(1, ship.thrustTime + dt * 3.5) : 0;
  const eased = ship.thrustTime * ship.thrustTime;

  const cos = Math.cos(ship.heading);
  const sin = Math.sin(ship.heading);
  let thrustX = 0, thrustY = 0;
  if (keys.KeyW) { thrustX = cos; thrustY = sin; }
  if (keys.KeyS) { thrustX = -cos; thrustY = -sin; }

  ship.vx = (ship.vx + thrustX * PLAYER_ACCEL * eased * dt) * Math.pow(PLAYER_DAMPING, dt * 60);
  ship.vy = (ship.vy + thrustY * PLAYER_ACCEL * eased * dt) * Math.pow(PLAYER_DAMPING, dt * 60);

  const spd = Math.hypot(ship.vx, ship.vy);
  if (spd > PLAYER_SPEED) {
    ship.vx = ship.vx / spd * PLAYER_SPEED;
    ship.vy = ship.vy / spd * PLAYER_SPEED;
  }

  if (!keys.KeyW && !keys.KeyS) {
    for (const body of bodies) {
      if (body.type === 'sun') continue;
      const dx = ship.x - body.x;
      const dy = ship.y - body.y;
      const dist = Math.hypot(dx, dy);
      if (dist < body.radius * FOLLOW_ENTER_RADIUS) {
        if (ship.orbitBodyId !== body.id) {
          ship.orbitBodyId = body.id;
          ship.followDx = ship.x - body.x;
          ship.followDy = ship.y - body.y;
        }
        ship.x = body.x + ship.followDx;
        ship.y = body.y + ship.followDy;
        ship.vx = 0;
        ship.vy = 0;
        return;
      }
    }
    ship.orbitBodyId = null;
  } else {
    ship.orbitBodyId = null;
  }

  ship.x = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, ship.x + ship.vx * dt));
  ship.y = Math.max(-WORLD_HALF, Math.min(WORLD_HALF, ship.y + ship.vy * dt));
}

function tickFleetMovement(fleet, leader, dt) {
  const cos = Math.cos(leader.heading);
  const sin = Math.sin(leader.heading);

  for (const frigate of fleet) {
    const slot = getSlotOffset(frigate.slotIndex);
    const targetX = leader.x + cos * slot.x - sin * slot.y;
    const targetY = leader.y + sin * slot.x + cos * slot.y;

    const dx = targetX - frigate.x;
    const dy = targetY - frigate.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      const force = Math.min(dist * 12, FLEET_ACCEL);
      frigate.vx += (dx / dist) * force * dt;
      frigate.vy += (dy / dist) * force * dt;
    }

    frigate.vx *= Math.pow(FLEET_DAMPING, dt * 60);
    frigate.vy *= Math.pow(FLEET_DAMPING, dt * 60);

    const spd = Math.hypot(frigate.vx, frigate.vy);
    if (spd > FLEET_SPEED) {
      frigate.vx = frigate.vx / spd * FLEET_SPEED;
      frigate.vy = frigate.vy / spd * FLEET_SPEED;
    }

    frigate.x += frigate.vx * dt;
    frigate.y += frigate.vy * dt;
    if (spd > 20) frigate.heading = Math.atan2(frigate.vy, frigate.vx);
  }
}
