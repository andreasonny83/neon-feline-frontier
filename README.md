# Neon Feline Frontier

A multiplayer neon cat game built with Socket.io, where players control colorful cats in a retro-futuristic world. Collect fish, shoot projectiles, and compete with other players in real-time!

## Features

- **Multiplayer Gameplay**: Real-time multiplayer action powered by Socket.io
- **Neon Aesthetic**: Retro-futuristic visual style with vibrant neon colors
- **Combat System**: Shoot projectiles to stun opponents
- **Collection Mechanics**: Gather fish scattered across the world to increase your score
- **Stun System**: Strategic combat with stun duration and immunity periods
- **Responsive Controls**: Smooth keyboard and touch controls for all devices

## Game Mechanics

- Move your neon cat around a large world (50,000 units)
- Collect fish to increase your score
- Shoot projectiles to stun other players
- Stunned players are temporarily immobilized
- Immunity period after being stunned prevents instant re-stuns
- Fish spawn continuously throughout the world

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd neon-feline-frontier
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. Open your browser and navigate to:

```
http://localhost:3000
```

## Technologies

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **Styling**: Tailwind CSS
- **Real-time Communication**: Socket.io

## Project Structure

```
neon-feline-frontier/
├── server.js           # Node.js server with Socket.io logic
├── package.json        # Project dependencies
├── public/
│   └── index.html     # Game client (HTML, CSS, and JavaScript)
└── README.md
```

## How to Play

1. When you join, you'll spawn as a colorful neon cat
2. Use arrow keys or WASD to move around
3. Click or tap to shoot projectiles
4. Collect fish to increase your score
5. Hit other players with projectiles to stun them
6. Avoid getting hit by staying mobile!

## Game Constants

- **World Size**: 50,000 units
- **Projectile Speed**: 25 units/frame
- **Projectile Cooldown**: 500ms
- **Stun Duration**: 3 seconds
- **Stun Immunity**: 5 seconds after being stunned
- **Fish Collection Radius**: 50 units
- **Maximum Fish**: 1,000 fish in the world

## Development

The game runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## License

MIT
