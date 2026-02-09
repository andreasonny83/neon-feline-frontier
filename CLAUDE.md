# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neon Feline Frontier is a multiplayer browser-based game where players control neon-colored cats in a shared 50000x50000 pixel world. Built with TypeScript, Node.js, Express, Socket.io for real-time multiplayer, Vite for client bundling, and HTML5 Canvas for rendering.

## Commands

- `npm install` - Install dependencies
- `npm run dev` - Run both Vite dev server and Express server concurrently
- `npm run dev:server` - Run only the Express server (tsx watch mode)
- `npm run dev:client` - Run only the Vite dev server
- `npm run build` - Build both client (Vite) and server (tsc)
- `npm start` - Run production server from compiled output
- `npm run preview` - Build and run production server
- Set `PORT` environment variable to change Express server port (default: 3000)
- Dev client runs on port 5173 with proxy to Express server

## Architecture

### Shared Types ([src/shared/types.ts](src/shared/types.ts))

Shared interfaces, constants, and typed Socket.io event maps used by both server and client:
- Game constants: `WORLD_SIZE`, `PROJECTILE_SPEED`, `STUN_DURATION`, etc.
- Data interfaces: `Player`, `RemotePlayer`, `Projectile`, `Fish`, `StunState`
- Socket event maps: `ServerToClientEvents`, `ClientToServerEvents`

### Server ([src/server/index.ts](src/server/index.ts))

Express server with Socket.io handling real-time multiplayer communication:

- **In-memory state**: Players, projectiles, fish, scores stored in typed `Record<>` objects keyed by socket.id
- **Static file serving**: Serves `dist/client/` (production build) and `public/` as fallback
- **Game loop**: Runs every 20ms (50 ticks/sec) for projectile physics, collision detection, fish collection
- **Fish spawning**: Every 1000ms, up to 1000 fish
- **Socket events**:
  - `connection` - New player connects, receives current players list
  - `player-update` - Player position/state update, broadcasts to all clients (rejects position changes if stunned)
  - `fire-yarn` - Creates projectile with cooldown/stun checks
  - `chat-message` / `send-chat` - Chat messages, broadcast to all except sender
  - `disconnect` - Player removed from state, broadcasts removal

### Client ([src/client/](src/client/))

Modular TypeScript client with Vite bundling:

- **[main.ts](src/client/main.ts)** - Entry point: initializes canvas, socket, input handlers, starts game loop and 100ms state sync interval
- **[state.ts](src/client/state.ts)** - Game state object, `localPlayer` with random init, canvas/context refs, `initCanvas()`, `resize()`
- **[network.ts](src/client/network.ts)** - Socket.io client connection, all event handlers, `sendUpdate()`, `sendMessage()`, `fireYarn()`
- **[game.ts](src/client/game.ts)** - `update()` function: input processing, movement with world bounds, camera follow, remote player interpolation (15% lerp)
- **[renderer.ts](src/client/renderer.ts)** - Canvas 2D rendering: `draw()` (grid, fish, cats, projectiles), `drawMinimap()`
- **[input.ts](src/client/input.ts)** - Keyboard (WASD/Arrows/Space/Enter) and touch joystick handlers
- **[ui.ts](src/client/ui.ts)** - Chat display, player count, score/cooldown stats, leaderboard

### Key Implementation Details

- **Player synchronization**: Server is authoritative for player list but position updates are optimistic (client-side prediction with server broadcast)
- **Camera system**: Centers on local player, translates canvas context by `-camera.x, -camera.y`
- **Player interpolation**: Remote players lerp toward target positions to smooth network jitter
- **Stun system**: Hit by yarn = 3s stun (no movement) + 5s immunity after
- **No persistence**: All game state is in-memory and lost on server restart
- **Typed Socket.io**: Both server and client use typed event maps from shared types

## File Structure

```
/
├── index.html                 # HTML template (Vite entry point)
├── package.json               # Dependencies + scripts
├── tsconfig.json              # Base TypeScript config
├── tsconfig.server.json       # Server-specific TS config
├── vite.config.ts             # Vite client bundler config
├── src/
│   ├── shared/
│   │   └── types.ts           # Shared interfaces, constants, Socket.io event maps
│   ├── server/
│   │   └── index.ts           # Express + Socket.io server
│   └── client/
│       ├── main.ts            # Entry point
│       ├── state.ts           # Game state, canvas refs
│       ├── network.ts         # Socket.io client
│       ├── game.ts            # Update loop
│       ├── renderer.ts        # Canvas rendering
│       ├── input.ts           # Keyboard + touch input
│       └── ui.ts              # UI updates
├── dist/                      # Build output (gitignored)
│   ├── client/                # Vite build
│   └── server/                # tsc build
└── node_modules/
```

## Development Notes

- TypeScript with strict mode enabled
- Client bundled with Vite; server compiled with tsc
- `tsx` used for server dev mode (watch + auto-reload)
- Socket.io client imported as ES module (not CDN script tag)
- Tailwind CSS loaded via CDN for UI styling
- World bounds enforced client-side with `Math.max/min` clamping
