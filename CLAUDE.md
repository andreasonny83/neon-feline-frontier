# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neon Feline Frontier is a multiplayer browser-based game where players control neon-colored cats in a shared 50,000x50,000 pixel world. Players collect fish, fire yarn projectiles to stun opponents, and compete on a leaderboard. Built with Node.js, Express, Socket.io for real-time multiplayer, and HTML5 Canvas for rendering.

## Commands

- `npm install` - Install dependencies
- `npm start` - Run the server (default port: 3000)
- `PORT=8080 npm start` - Run on custom port

## Architecture

### Server ([server.js](server.js))

Express server with Socket.io handling real-time multiplayer communication and authoritative game logic:

- **In-memory state**: `players`, `projectiles`, `fish`, `stunned`, `playerCooldowns`, `scores` objects
- **Session persistence**: `sessions`, `sessionScores`, `socketToSession` for persistent cat identity
- **Server game loop** (20ms/50Hz tick): Updates projectile positions, checks collisions, handles fish collection
- **Fish spawning**: New fish spawn every 1s up to 1000 max
- **Cat creation**: Server-side cat generation (name, color, skinType) with persistent sessions
- **Socket events**:
  - `request-session` - Client requests session with localStorage token, server creates/retrieves cat
  - `session-established` - Server sends cat data and token to client
  - `player-update` - Position/state update, rejects position changes while stunned
  - `fire-yarn` - Creates projectile if not stunned and off cooldown (500ms)
  - `chat-message` / `send-chat` - Chat broadcast
  - `disconnect` - Saves session score, then cleans up player state

### Client ([public/index.html](public/index.html))

Single-file HTML/CSS/JavaScript client with embedded game logic:

- **Session flow**: On connect, sends `request-session` with localStorage token; receives cat data via `session-established`
- **Game loop**: RequestAnimationFrame-based update/draw cycle
- **Controls**: WASD/Arrow keys to move, SPACE to fire yarn, ENTER for chat
- **Remote player interpolation**: 15% lerp toward target positions
- **State sync**: Broadcasts position every 100ms via `player-update`
- **UI elements**: Chat panel, minimap (150x150px), leaderboard, cooldown bar
- **Mobile support**: Virtual joystick for touch devices

### Game Mechanics

| Constant | Value | Description |
|----------|-------|-------------|
| `WORLD_SIZE` | 50,000px | Square world dimensions |
| `PLAYER_SPEED` | 6 | Movement speed per frame |
| `PROJECTILE_SPEED` | 25 | Yarn ball speed |
| `PROJECTILE_LIFETIME` | 2000ms | Time before projectile expires |
| `PROJECTILE_COOLDOWN` | 500ms | Minimum time between shots |
| `STUN_DURATION` | 3000ms | How long player is stunned |
| `STUN_IMMUNITY` | 5000ms | Immunity after stun ends |
| `HIT_RADIUS` | 30px | Projectile hit detection radius |
| `FISH_COLLECTION_RADIUS` | 50px | How close to collect fish |

### Key Implementation Details

- **Server-authoritative combat**: Projectile physics and hit detection run on server
- **Server-side cat creation**: Cat properties (name, color, skinType) assigned by server, not client
- **Session persistence**: localStorage token identifies returning players; cat identity and score persist across page refreshes
- **Position updates while stunned**: Server preserves last valid position, rejects movement
- **Immune players**: After stun, players blink and can't be hit for `STUN_IMMUNITY` duration
- **In-memory sessions**: Sessions lost on server restart, but persist across client reconnects
- **No collision**: Players can overlap freely
