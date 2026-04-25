# Javidare — Space Tower Defense (MVP Spec)

## Context

We want a 2D vector-based space game in the spirit of **Thronefall**: you pilot a single "king" ship through a living solar system, build structures on planets/moons/asteroids, grow a follower fleet, and fight off escalating waves of enemies. The twist vs. Thronefall is that the world is continuous (no day/night split) and the "map" is a rotating solar system rather than a static kingdom.

The repo is currently a clean Vite vanilla-JS scaffold (one `index.html`, `src/main.js` counter demo, a `style.css` with theme tokens, Vite 8, no other deps). This spec defines an **MVP playable slice** we can implement on top of that scaffold.

---

## Design Pillars

1. **One-handed intensity.** Mouse aims, left hand drives. You never pause to manage a menu during a fight.
2. **Every planet matters.** Orbits bring structures in and out of position; where you build changes over time.
3. **The fleet is your presence.** Follower ships are a visible, growing reward — losing them stings.
4. **Small scope, high polish.** 1 solar system, 3–4 building types, 2–3 enemy types, ~5 waves + a boss finale.

---

## Core Loop

1. Fly around the solar system, autofire at nearest enemy.
2. Extractor buildings tick money into your wallet.
3. Fly over a valid build target, **hold Space** to spend money and build.
4. Waves arrive on a timer (continuous — no build phase). Defend the system and your ship.
5. Survive 5 waves + boss = win. Ship destroyed = lose.

---

## Controls

| Input | Action |
|---|---|
| Mouse position | Ship faces cursor |
| **W** | Thrust forward (ship-facing) |
| **S** | Reverse thrust |
| **A** | Strafe left (relative to facing) |
| **D** | Strafe right (relative to facing) |
| **Space (hold)** | Build on the body under ship (if valid target + funds) |
| Left click | *(reserved for future manual fire / ability)* |
| **Esc** | Pause overlay |

Autofire is always on for player ship, fleet ships, and turret buildings. Target = nearest enemy in range.

---

## World / Scene

- **Single solar system**, roughly 4000 × 4000 world units, centered on the sun.
- **Sun** at origin. Damages any ship that touches it (both enemy and player — environmental hazard).
- **~6–8 celestial bodies** on circular orbits at varying radii. Each rotates around the sun at its own angular velocity. Moons orbit their parent planet.
- **Camera** follows the player ship with slight lookahead toward the cursor. Fixed zoom in MVP.
- **Background** is a parallax starfield (two layers) drawn under the solar system.

### Celestial body archetypes (MVP)

| Type | Valid building | Orbit speed |
|---|---|---|
| Rocky planet | Turret platform | Medium |
| Gas giant | Shipyard | Slow |
| Moon (orbits a planet) | Light turret | Fast (around parent) |
| Asteroid field / large asteroid | Extractor | Variable |

One of the rocky planets is designated the **Home Planet** (starts with a pre-built extractor so you have seed income).

---

## Player Ship ("King")

- HP: 100. No shields in MVP.
- Auto-fires a fast low-damage pulse at nearest enemy within range.
- Acceleration-based movement with linear damping (feels weighty, not like Asteroids inertia, not like a top-down cursor).
- Collides with planets/sun (stops you; sun does chip damage).
- **If HP hits 0 → run ends (loss).**
- Respawns at the Home Planet only between runs.

---

## Build System

- While the ship is **overlapping a valid body** with **no existing building**, and you have funds, **hold Space** for ~1.0s to build.
- A radial progress indicator draws around the ship during the hold.
- Releasing Space early cancels with no cost.
- Each body type has **one** building type in MVP (see table above). Cost is fixed per type.
- Leaving the body's radius during the hold cancels the build.

Costs (tuning placeholders):
- Extractor: 50
- Light turret (moon): 75
- Turret platform (rocky): 120
- Shipyard (gas giant): 200

---

## Buildings (MVP Set)

| Building | Effect | Notes |
|---|---|---|
| **Extractor** | +X money / second, rate scales with asteroid size | No combat behavior. Destructible. |
| **Light turret** | Short range, fast fire rate, low damage | Autofires, lives on moons so it moves with the orbit. |
| **Turret platform** | Medium range, medium damage, slower fire | On rocky planets. Main defensive backbone. |
| **Shipyard** | Periodically spawns a follower ship that joins your fleet | Cap: 6 follower ships total across all shipyards. |

All buildings are destructible; destroyed buildings leave a wreck marker and the body becomes buildable again on a cooldown (~10s).

---

## Fleet (Follower Ships)

- Produced by shipyards, capped at **6**.
- Follow the player ship in a loose formation (offset positions, light steering).
- Autofire at nearest enemy in range.
- Weaker than player ship (HP 25, low damage).
- Do not respawn in-run — lost fleet is lost until a shipyard produces a replacement.

---

## Enemies & Waves

MVP: 3 enemy types, 5 waves + boss.

| Enemy | HP | Behavior | Target priority |
|---|---|---|---|
| **Skirmisher** | Low | Fast, strafes around target | Player ship > fleet |
| **Bomber** | Medium | Slow, heavy damage, suicide-rams | Nearest building > player |
| **Boss** (wave 6 only) | Very high | Multi-phase, spawns adds | Player ship |

### Wave structure

- Waves spawn from **random edges of the world bounds**, flying inward.
- Wave timer: 30s build-up → 45s combat. Next wave timer starts when the current wave's spawn budget is exhausted *and* 80% of spawned enemies are dead.
- Wave N spawn budget scales: `base * (1 + 0.35 * (N-1))`.
- Wave 6 = boss-only encounter.

Win = boss defeated. Lose = player ship destroyed.

---

## Economy

- Starting wallet: 100.
- Income sources (MVP): extractors only. Enemy kills give **no** money in MVP (keeps pressure on defending extractors).
- Spending: building construction only.
- Single resource ("credits"). No research/tech tree in MVP.

---

## UI (HTML/CSS overlays)

HTML/CSS sits on top of the canvas as positioned `<div>` layers — no canvas text.

| Element | Location | Shows |
|---|---|---|
| Wallet | Top-left | Current credits, income/sec |
| HP bar | Bottom-center | Player ship HP |
| Wave banner | Top-center | "Wave 3/6 — 00:22" |
| Build prompt | Follows ship when over valid body | "Hold SPACE — Turret (120)" + cost, greyed if unaffordable |
| Fleet counter | Top-right | "Fleet 3/6" |
| Pause / Game over / Victory | Full-screen modal | Buttons: Restart, Quit |

Style reuses the existing `style.css` color tokens (`--accent` purple) for a consistent neon feel.

---

## Rendering & Architecture

- **Canvas2D** single full-window canvas (`devicePixelRatio` aware).
- Fixed-timestep simulation (60 Hz) decoupled from render (rAF). Accumulator pattern.
- Simple typed-object entities (no ECS overkill). Entity arrays by kind for fast iteration: `planets`, `buildings`, `playerShip`, `fleet`, `enemies`, `projectiles`, `fx`.
- **Camera** transform applied once per frame; world coords everywhere else.
- **Spatial queries** for "nearest enemy" use a simple uniform grid or brute-force loop (fine at MVP counts: ≤ ~100 entities).
- Input: keyboard state object + mouse screen → world via inverse camera.

### Proposed file layout

```
src/
├── main.js                 # bootstrap, mounts canvas + UI, starts loop
├── game/
│   ├── game.js             # top-level orchestrator
│   ├── loop.js             # fixed-timestep loop
│   └── state.js            # game state container
├── world/
│   ├── solarSystem.js      # sun + orbits, rotation update
│   └── bodies.js           # planet/moon/asteroid definitions
├── entities/
│   ├── playerShip.js
│   ├── fleetShip.js
│   ├── enemy.js
│   ├── building.js
│   └── projectile.js
├── systems/
│   ├── input.js
│   ├── movement.js
│   ├── combat.js           # autofire + damage resolution
│   ├── build.js            # hold-to-build state machine
│   ├── economy.js
│   └── waves.js
├── render/
│   ├── camera.js
│   └── renderer.js         # Canvas2D draw routines
├── ui/
│   └── hud.js              # creates/updates HTML overlays
└── style.css               # existing + game-specific additions
```

`index.html` gets a `<canvas id="game">` and a `<div id="hud">` replacing the current scaffold markup. `src/counter.js` and the Vite welcome screen code in `main.js` are removed.

---

## MVP Scope / Cut List

**In MVP:**
- 1 solar system with ~6–8 bodies
- 4 building types
- 3 enemy types (one is a boss)
- 5 regular waves + boss
- Win / lose / restart
- HUD essentials

**Explicitly cut for v1 (fair game for v2):**
- Upgrade trees on buildings
- Meta-progression / unlocks between runs
- Multiple solar systems / levels
- Research / tech tree
- Audio (stub with placeholders, full pass later)
- Particle FX beyond basic hit sparks
- Mobile / touch controls
- Settings menu

---

## Open Questions (flag before implementation)

1. **Visual style** — retro vector (Asteroids-inspired outlines) vs. neon glow (Geometry Wars-ish) vs. flat shapes? Spec currently assumes neon matching existing purple accent.
2. **Sun damage** — should touching the sun be instant-kill or chip damage? Currently chip damage.
3. **Fleet cap 6** — is that the right feel? Easy to tune.
4. **Boss design** — should boss be a single multi-phase unit, or a "miniboss + adds" assault? Currently single multi-phase.
5. **Build cooldown on destroyed bodies** — prevents spam-rebuild abuse. 10s is a guess.

---

## Verification Plan

Once implemented:

1. `npm install && npm run dev` → dev server serves at default Vite port; canvas fills viewport.
2. **Controls sanity**: ship rotates to cursor; WASD moves in ship-relative directions; no keyboard ghosting.
3. **Build flow**: fly over home-planet's moon → hold Space → progress ring fills → light turret appears → wallet decrements → turret autofires at nearest enemy.
4. **Orbit motion**: planets visibly rotate around sun over ~60s; moons rotate around their parents.
5. **Wave loop**: first wave triggers within configured delay; enemies spawn from edges; wave counter advances; HUD updates.
6. **Loss**: tank hits until player HP hits 0 → game over modal; Restart returns to wave 1 with starting wallet.
7. **Win**: cheat-kill all enemies through boss → victory modal.
8. **Perf**: steady 60 fps in Chrome with ~50 enemies + 10 buildings + 6 fleet ships.

No automated tests in MVP — this is a hands-on-feel game; manual verification is the bar.
