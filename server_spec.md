# Javidare Multiplayer — Server Spec

## Overview

Co-op multiplayer via Cloudflare Workers + Durable Objects. Up to 2 players share one game room. The Durable Object is the single source of truth; clients are thin renderers that send input and display server state.

```
Browser A ──WS──┐
Browser B ──WS──┤── Durable Object "GameRoom" (one per room)
                │     • runs authoritative simulation at 20 Hz
                │     • receives: { type:'input', keys, pressed }
                └──── broadcasts: { type:'tick', ...full state delta }

Cloudflare Worker (HTTP + WS upgrade)
  POST /rooms           → create room, return { roomId }
  GET  /rooms/:id/ws    → upgrade WebSocket → proxy to DO
```

---

## Session Lifecycle

1. Player A calls `POST /rooms` → gets `{ roomId }`.
2. Player A opens `wss://<worker>/rooms/<roomId>/ws` → joins as player 1.
3. DO sends `{ type:'joined', playerId, roomId }` + `{ type:'tick', ... }` with initial state.
4. Player B opens the same WS URL → joins as player 2. DO sends `{ type:'player_joined', playerId }` to player A.
5. Both players play. DO runs simulation while ≥1 player is connected.
6. On disconnect: DO sends `{ type:'player_left', playerId }` to remaining players. If room empties, DO stops the alarm (simulation pauses).

Room limit: **2 players**. A third connection receives `{ type:'error', reason:'room_full' }` and is closed.

---

## Message Protocol

### Upstream (Client → Server)

```jsonc
// Send on every client frame (60 Hz) — server uses latest received input each tick
{ "type": "input", "keys": { "KeyW": true, "KeyA": false, "KeyD": true, "KeyS": false }, "pressed": { "Space": true } }

// Sent once when build progress bar completes on client
{ "type": "build_request", "bodyId": "keth", "buildingType": "turretPlatform" }
```

### Downstream (Server → Client)

```jsonc
// Sent on join
{ "type": "joined", "playerId": "p1", "roomId": "abc123" }

// Sent at 20 Hz — full state snapshot (not delta for simplicity)
{
  "type": "tick",
  "tick": 1042,
  "players":     { "p1": { "x": 100, "y": 200, "heading": 1.2, "hp": 80, "maxHp": 100 } },
  "fleet":       [{ "id": "e3", "x": 50, "y": 180, "heading": 0.8, "hp": 50 }],
  "enemies":     [{ "id": "e7", "type": "skirmisher", "x": 1000, "y": 500, "heading": 3.1, "hp": 20 }],
  "projectiles": [{ "x": 120, "y": 210, "vx": 0, "vy": -600, "faction": "friendly", "ttl": 0.8 }],
  "pickups":     [{ "x": 900, "y": 480, "value": 2, "ttl": 10 }],
  "fx":          [{ "x": 900, "y": 480, "vx": 80, "vy": -40, "ttl": 0.3, "maxTtl": 0.8, "color": "#ff8c00", "len": 12 }],
  "buildings":   [{ "id": "e1", "type": "extractor", "bodyId": "keth", "x": 620, "y": 0, "hp": 100, "heading": 0 }],
  "bodies":      [{ "id": "keth", "x": 620, "y": 0, "angle": 0.01 }],
  "wrecks":      [{ "bodyId": "keth", "timer": 8.2 }],
  "wallet":      42,
  "waveIndex":   2,
  "wavePhase":   "combat",
  "waveTimer":   18.4,
  "waveOrigins": [{ "angle": 1.2, "x": 2200, "y": 0 }],
  "gameStatus":  "playing"
}

// Presence events
{ "type": "player_joined", "playerId": "p2" }
{ "type": "player_left",   "playerId": "p2" }

// Build result
{ "type": "build_result", "ok": true,  "bodyId": "keth", "buildingType": "turretPlatform" }
{ "type": "build_result", "ok": false, "reason": "insufficient_funds" }

// Error
{ "type": "error", "reason": "room_full" }
```

---

## Tick Model

- **Server tick rate**: 20 Hz (50 ms alarm interval).
- **Client render rate**: 60 Hz via `requestAnimationFrame`. Client interpolates between last two received ticks.
- **Input handling**: Server stores the last received input per player. Each tick uses whatever keys were held at that moment — no input buffering or prediction.
- **Tick dt**: `1/20` s = 0.05 s per tick. Physics constants in entity files are tuned for per-tick `dt`; large `dt` is compensated by the same formulas already in place.

---

## Multiplayer Semantics

| Topic | Decision |
|-------|----------|
| Wallet | Shared between all players |
| Build authority | Client sends `build_request`; server validates and applies |
| Build conflict | First valid request wins; server sends `build_result` |
| Fleet | Follows player 1 (first to join); future: assign frigates per player |
| Gameover | All player ships at 0 HP → `gameStatus = 'gameover'` |
| Victory | Miniboss killed → `gameStatus = 'victory'` |
| Rejoin | Not supported in v1; reconnect gets a `room_full` or re-adds if slot open |

---

## Server-Side Simulation

The DO runs a self-contained simulation. It imports shared pure-JS modules from `src/` (no browser globals):
- `src/game/state.js` — `createState`, `nextId`
- `src/world/solarSystem.js` — `initBodies`, `updateOrbits`
- `src/entities/*.js` — entity factories and tuning constants
- `src/systems/combat.js` — `updateCombat`
- `src/systems/economy.js` — `updateEconomy`
- `src/systems/waves.js` — `updateWaves`

Movement is written inline in `server/room.js` (the existing `updateMovement` takes browser `input`; the server uses an `inputBuffers` map instead).

Build placement is handled via `handleBuildRequest()` in `room.js`, mirroring `completeBuild()` from `src/systems/build.js`.

### State shape on server

```js
{
  ...createState(),  // all standard fields
  players: {},       // { [playerId]: playerShipEntity }
  playerShip: null,  // unused; set transiently before fleet movement
  leaderPlayerId: null,  // first player to join; fleet follows this ship
}
```

`src/systems/combat.js` and `src/systems/economy.js` are modified to call `getAllPlayerShips(state)` which returns `Object.values(state.players)` when `state.players` is set, or `[state.playerShip]` otherwise (single-player backward compat).

---

## Client Architecture

### Multiplayer mode

`createGame(canvas, hudContainer, net)` accepts an optional `net` client. When present:
- The game loop does **not** run the simulation systems.
- Each update, the client captures input keys and sends them via `net.sendInput(keys)`.
- When `Space` hold completes the build progress bar, the client sends `net.sendBuildRequest(bodyId, buildingType)`.
- `net` calls back with server tick deltas, which are applied to `state` directly.
- `state.remotePlayers` holds other players' ships for rendering.

### Single-player mode (no net)

Unchanged. All existing systems run locally as before.

---

## Files Changed / Created

| Path | Action |
|------|--------|
| `server_spec.md` | Created — this file |
| `wrangler.toml` | Created — Cloudflare build config |
| `server/worker.js` | Created — HTTP lobby + WS upgrade |
| `server/room.js` | Created — Durable Object, game loop |
| `src/net/client.js` | Created — browser WS client |
| `src/game/state.js` | Modified — add `remotePlayers: []` |
| `src/game/game.js` | Modified — multiplayer mode via `net` param |
| `src/systems/combat.js` | Modified — multi-player ship targeting |
| `src/systems/economy.js` | Modified — multi-player pickup collection |
| `src/render/renderer.js` | Modified — render remote players |
| `package.json` | Modified — add wrangler |

---

## Known Limitations (v1)

- No client-side prediction; movement latency equals round-trip time to DO edge node (~20-200 ms).
- No interpolation between server ticks; remote ships may stutter at 20 Hz.
- No rejoin on disconnect.
- Fleet follows player 1 only.
- `Math.random()` on server is not seeded; no deterministic replay.
- Single region; no geo-routing between DO locations.
