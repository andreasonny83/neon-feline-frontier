# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neon Feline Frontier is a multiplayer browser-based game where players control neon-colored cats in a shared 4000x4000 pixel world. Built with Node.js, Express, Socket.io for real-time multiplayer, and HTML5 Canvas for rendering.

## Commands

- `npm install` - Install dependencies
- `npm start` - Run the server (default port: 3000)
- `node server.js` - Alternative way to start the server
- Set `PORT` environment variable to change server port

## Architecture

### Server ([server.js](server.js))

Express server with Socket.io handling real-time multiplayer communication:

- **In-memory state**: Players stored in `players` object, keyed by socket.id
- **Static file serving**: Serves [public/index.html](public/index.html) as the game client
- **Gemini API proxy**: Handles `gemini-query` events to proxy requests to Gemini API (requires API key at line 12)
- **Socket events**:
  - `connection` - New player connects, receives current players list
  - `player-update` - Player position/state update, broadcasts to all clients
  - `chat-message` / `send-chat` - Chat messages, broadcast to all except sender
  - `disconnect` - Player removed from state, broadcasts removal

### Client ([public/index.html](public/index.html))

Single-file HTML/CSS/JavaScript client with embedded game logic:

- **Game loop**: RequestAnimationFrame-based update/draw cycle
- **World**: 4000x4000 pixel grid with camera following local player
- **Local player**: Managed client-side with WASD/Arrow controls (or touch joystick on mobile)
- **Remote players**: Interpolated smoothly toward target positions (15% lerp)
- **State sync**: Local player broadcasts position every 100ms via `player-update`
- **Rendering**: Canvas 2D context with:
  - Grid background (100px squares)
  - Cat sprites with 3 skin types (circle/square/triangle)
  - Player names displayed above cats
  - Minimap (150x150px) showing all players
- **Chat system**: Real-time text chat with color-coded player names
- **Mobile support**: Virtual joystick for touch devices (shown via media query)

### Key Implementation Details

- **Player synchronization**: Server is authoritative for player list but position updates are optimistic (client-side prediction with server broadcast)
- **Camera system**: Centers on local player, translates canvas context by `-camera.x, -camera.y`
- **Player interpolation**: Remote players lerp toward target positions to smooth network jitter
- **No persistence**: All game state is in-memory and lost on server restart
- **No physics/collision**: Players can overlap freely
- **API key required**: Gemini integration requires key in [server.js:12](server.js#L12)

## File Structure

```
/
├── server.js              # Main server with Socket.io
├── server copy.js         # Earlier version (simpler, no Gemini API)
├── public/
│   └── index.html         # Complete client: HTML + CSS + game logic
├── package.json           # Dependencies: express, socket.io, node-fetch
└── node_modules/          # Dependencies
```

## Development Notes

- No TypeScript, test framework, or linter configured
- All client code is in a single HTML file with inline styles and scripts
- Socket.io client script loaded from CDN path `/socket.io/socket.io.js` (auto-served by Socket.io server)
- Tailwind CSS loaded via CDN for UI styling
- World bounds enforced client-side with `Math.max/min` clamping
