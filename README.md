# Neon Feline Frontier

A multiplayer browser game where players control neon-colored cats in a shared cyberpunk world. Collect fish, fire yarn balls to stun opponents, and climb the leaderboard.

Built with TypeScript, Express, Socket.io, Vite, and HTML5 Canvas.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. Open multiple tabs to test multiplayer.

## Controls

| Input | Action |
|-------|--------|
| WASD / Arrow Keys | Move |
| Space | Fire yarn ball |
| Touch joystick | Move (mobile) |

## Gameplay

- **Move** around an 8000x8000 neon grid world
- **Collect fish** that spawn across the map to earn points
- **Fire yarn balls** at other players to stun them for 3 seconds
- **Leaderboard** ranks all players by fish collected
- Each player gets a random cyberpunk cat name and neon color
- The first player to connect becomes **Penny**, a special dark-furred cat

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev servers (Vite on :5173, Express on :3000) |
| `npm run build` | Production build |
| `npm start` | Run production server on :3000 |
| `npm run preview` | Build + run production |

## Tech Stack

- **Server**: Node.js, Express, Socket.io
- **Client**: HTML5 Canvas, Socket.io Client, Tailwind CSS
- **Build**: Vite (client), tsc (server), tsx (dev)
- **Language**: TypeScript (strict, ESM)
