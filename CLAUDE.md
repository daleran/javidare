# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

2D vector-based space tower defense, Thronefall-inspired, single solar system. Vanilla JS + Canvas2D via Vite, no framework. Read the source to understand current game state. `SPEC.md` tracks future/unimplemented features only.

## Commands

```
npm run dev       # Vite dev server
npm run build     # production build
npm run preview   # preview built bundle
```

No test suite, no linter. Verification is manual — run the game and play it.

## Architecture

**Entry**: `src/main.js` → `createGame(canvas, hudContainer)` in `src/game/game.js` → `loop.start()`.

**Game loop** (`src/game/loop.js`): fixed 60 Hz simulation accumulator, render at rAF. `update(dt)` receives `dt = 1/60`; accumulator capped to 5 ticks (prevents spiral-of-death after tab blur). Render receives `alpha = accumulator / TICK_DT` for future interpolation.

**State** (`src/game/state.js` — `createState()`): single plain object, entity arrays by kind: `bodies`, `buildings`, `playerShip`, `fleet`, `enemies`, `projectiles`, `pickups`, `fx`, `wrecks`. No ECS. `nextId(state)` mints string IDs (`e1`, `e2`, …).

**Systems** (`src/systems/*.js`): pure functions, each `updateX(state, ...)`. Called in order each tick — orbits first so body positions are current for everything downstream.

**Entities** (`src/entities/*.js`): factory functions. Each file also exports its tuning constants (HP, speed, fire rate, range, damage, costs). **To rebalance, edit the entity file** — there is no central config.

**World** (`src/world/`): `bodies.js` owns the static solar-system layout and building-type mappings. `solarSystem.js` integrates orbit angles. Orbit parents must appear before children in `BODY_DEFS` — positions are computed in array order.

**Rendering** (`src/render/`): single full-window Canvas2D, `devicePixelRatio`-aware. Camera applies one transform per frame; all other code uses world coordinates.

**HUD** (`src/ui/hud.js`): HTML/CSS DOM overlay, no canvas text. Created once; `updateHud()` mutates the same DOM nodes each frame.

## Conventions

- **Coordinates**: world units, +x right / +y down (Canvas2D native). Headings in radians via `Math.atan2(dy, dx)`.
- **In-loop removal**: entity loops iterate back-to-front (`for (let i = arr.length - 1; i >= 0; i--)`) and remove with `splice` — preserve this when editing.
- **Visual palette**: Homeworld tactical-map aesthetic — cyan friendlies, amber enemies, steel-blue chrome, gold credits, near-black background. Colors are defined in `src/style.css` (CSS vars) and `src/render/renderer.js`. Don't introduce new palette colors without a deliberate aesthetic reason.
