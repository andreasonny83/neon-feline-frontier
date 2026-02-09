# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neon Feline Frontier is a multiplayer browser-based game where players control neon-colored cats in a shared 5000x5000 pixel world. Built with Node.js, Express, Socket.io for real-time multiplayer, TypeScript for type safety, and Vite for client bundling.

## Commands

- `npm install` - Install dependencies
- `npm run dev` - Run both server and client in development mode (with HMR)
- `npm run dev:server` - Run only the server with hot reload (tsx watch)
- `npm run dev:client` - Run only the Vite dev server
- `npm run build` - Build both client and server for production
- `npm start` - Run production server
- `npx tsc --noEmit` - Type check without emitting

## Architecture

### Shared Types ([src/shared/types.ts](src/shared/types.ts))

Contains all TypeScript interfaces and constants shared between client and server:
- `Player`, `RemotePlayer`, `Projectile`, `Fish`, `StunState` interfaces
- Socket event payload types
- Game constants (WORLD_SIZE, PLAYER_SPEED, etc.)

### Server ([src/server/index.ts](src/server/index.ts))

Express server with typed Socket.io handling real-time multiplayer:

- **In-memory state**: Players, projectiles, fish, stunned states, scores
- **Static file serving**: Serves Vite build output or public folder
- **Socket events**:
  - `connection` - New player connects, receives current players list
  - `player-update` - Player position/state update, broadcasts to all clients
  - `chat-message` / `send-chat` - Chat messages, broadcast to all except sender
  - `fire-yarn` - Creates projectiles with cooldown checking
  - `disconnect` - Player removed from state
- **Game loop**: 40 ticks/sec for physics, collisions, fish collection
- **Fish spawning**: Every 2 seconds up to 500 fish

### Client Modules ([src/client/](src/client/))

Modular TypeScript client with Vite bundling:

- **[main.ts](src/client/main.ts)** - Entry point, initialization, game loop
- **[state.ts](src/client/state.ts)** - Game state, canvas references, constants
- **[network.ts](src/client/network.ts)** - Socket.io connection and event handlers
- **[game.ts](src/client/game.ts)** - Update loop, player movement, camera
- **[renderer.ts](src/client/renderer.ts)** - Canvas drawing (cats, fish, projectiles, minimap)
- **[input.ts](src/client/input.ts)** - Keyboard and touch joystick handlers
- **[ui.ts](src/client/ui.ts)** - Chat, scoreboard, stats display

### HTML Template ([index.html](index.html))

Clean HTML without inline JavaScript:
- UI elements (chat, scoreboard, stats, minimap)
- Tailwind CSS via CDN
- Vite module script entry point

## Development Workflow

In development mode (`npm run dev`):
1. Vite dev server runs on port 5173 with HMR
2. Express server runs on port 3000
3. Vite proxies `/socket.io` requests to Express
4. Access game at `http://localhost:5173`

For production:
1. `npm run build` compiles TypeScript and bundles client
2. `npm start` serves built client from `dist/client`

## File Structure

```
/
├── src/
│   ├── client/           # Client TypeScript modules
│   │   ├── main.ts       # Entry point
│   │   ├── state.ts      # Game state
│   │   ├── network.ts    # Socket.io client
│   │   ├── game.ts       # Game loop
│   │   ├── renderer.ts   # Canvas rendering
│   │   ├── input.ts      # Input handling
│   │   └── ui.ts         # UI updates
│   ├── server/
│   │   └── index.ts      # Express + Socket.io server
│   └── shared/
│       └── types.ts      # Shared TypeScript types
├── public/               # Static assets
├── index.html            # Vite entry HTML
├── package.json
├── tsconfig.json         # Base TypeScript config
├── tsconfig.server.json  # Server TypeScript config
└── vite.config.ts        # Vite configuration
```

## Key Implementation Details

- **Type-safe Socket.io**: Uses generic Socket.io types for event payloads
- **Player synchronization**: Server authoritative for player list, position updates optimistic
- **Camera system**: Centers on local player, translates canvas context
- **Player interpolation**: Remote players lerp toward target positions (15%)
- **No persistence**: All game state is in-memory
- **No physics/collision**: Players can overlap freely
