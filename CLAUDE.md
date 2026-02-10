# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start both Vite dev server (port 5173) and Express server (port 3000) with hot reload
- `npm run dev:server` — Server only with tsx watch
- `npm run dev:client` — Vite dev server only
- `npm run build` — Production build (client via Vite → `dist/client/`, server via tsc → `dist/server/`)
- `npm start` — Run production server from `dist/server/server/index.js`
- `npm run preview` — Build + start production server
- `PORT` env var changes Express server port (default 3000)

In development, open `http://localhost:5173`. Vite proxies `/socket.io` WebSocket traffic to the Express server on port 3000. In production, Express serves the built client from `dist/client/`.

No test framework, linter, or formatter is configured.

## Architecture

Multiplayer browser game — neon-colored cats in a shared 8000x8000 world. Node.js/Express/Socket.io backend, HTML5 Canvas frontend, all TypeScript with ESM modules.

### Build Setup

- **Client**: Vite bundles `src/client/` from root `index.html` entry point (`<script type="module" src="/src/client/main.ts">`)
- **Server**: `tsc -p tsconfig.server.json` compiles `src/server/` and `src/shared/` to `dist/server/` with `rootDir: "src"`, producing `dist/server/server/index.js`
- Server imports **must** use `.js` extensions (ESM requirement) — e.g., `import { createPlayer } from "./player.js"`
- Client imports do **not** need `.js` extensions (Vite handles resolution)

### Server (`src/server/`)

Express + Socket.io with all game state in-memory (lost on restart). Server is authoritative for player creation, fish collection validation, projectile collision/stun, and scoring.

- `index.ts` — Socket event handlers, game loop (30ms tick for projectile physics + collision), fish spawning interval
- `player.ts` — `createPlayer()` generates random cat names/colors; first connection gets special "Penny" character (skinType 4, dark color)

### Client (`src/client/`)

- `main.ts` — Entry point: canvas init, socket connect, input setup
- `state.ts` — Singleton game state object, canvas refs, resize handler
- `network.ts` — Socket.io connection, all event handlers, game loop (`requestAnimationFrame`), `sendUpdate()` every 250ms
- `game.ts` — `update()`: movement (WASD/joystick), world bounds clamping, remote player interpolation (15% lerp), client-side projectile simulation, optimistic fish collection
- `renderer.ts` — `draw()`: grid, fish, cats (4 skin types + Penny), yarn projectiles with rotation/glow
- `input.ts` — Keyboard (WASD/Space) and mobile touch joystick
- `ui.ts` — Player count, score display, cooldown bar, ranked leaderboard

### Shared (`src/shared/types.ts`)

All game constants and TypeScript interfaces shared between client and server. Socket.io events are fully typed via `ServerToClientEvents`/`ClientToServerEvents` maps.

### Client-Server Communication Pattern

Client-predicted movement with server broadcast. Fish collection is client-detected with server validation and optimistic local removal. Projectiles use creation/removal events (not position broadcasts) — client simulates physics locally between events.
