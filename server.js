const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files (your index.html)
app.use(express.static(path.join(__dirname, 'public')));

// In-memory player storage - keyed by session token
let players = {}; // token → { id, x, y, color, skinType, name, direction }

// Game state - all keyed by session token
let projectiles = {};
let fish = {};
let stunned = {}; // token → { until: timestamp, immuneUntil: timestamp }
let playerCooldowns = {}; // token → timestamp
let scores = {}; // token → fishCount

// Session persistence storage
let sessions = {}; // token → { name, color, skinType, createdAt }
let socketToSession = {}; // socketId → token (maps current socket to session)

// Cat generation constants
const CAT_NAMES = [
  'Meow-tron',
  'Cyber-Whiskers',
  'Pixel-Paw',
  'Bit-Kitten',
  'Neon-Tabby',
  'Glitch-Cat',
  'Data-Pounce',
  'Synth-Claw',
  'Logic-Tail',
  'Laser-Mew',
  'Matrix-Mog',
  'Aero-Fluff',
];

const NEON_COLORS = ['#ff0055', '#00ff99', '#00ccff', '#cc00ff', '#ffcc00'];

// Cat generation helpers
function generateSessionToken() {
  return 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function createNewCat() {
  return {
    name: CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)] + '-' + Math.floor(Math.random() * 99),
    color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
    skinType: Math.floor(Math.random() * 3),
    createdAt: Date.now(),
  };
}

function getRandomSpawnPosition() {
  return {
    x: Math.random() * WORLD_SIZE,
    y: Math.random() * WORLD_SIZE,
  };
}

// Constants
const WORLD_SIZE = 50000;
const PROJECTILE_SPEED = 25;
const PROJECTILE_LIFETIME = 2000;
const PROJECTILE_COOLDOWN = 500;
const STUN_DURATION = 3000;
const STUN_IMMUNITY = 5000;
const HIT_RADIUS = 30;
const FISH_SPAWN_INTERVAL = 2000; // Spawn fish every 2 seconds (was 1s)
const FISH_MAX_COUNT = 50; // Reduced from 1000 to 50 for performance
const FISH_COLLECTION_RADIUS = 50;

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Send current state to newly connected player
  socket.emit('players-list', players);
  socket.emit('fish-sync', Object.values(fish)); // Full fish list only on connect

  // Handle session request (new connection flow for persistent cats)
  socket.on('request-session', (data) => {
    let token = data?.token;
    let session;
    let isReturning = false;

    // Check if valid existing session
    if (token && sessions[token]) {
      session = sessions[token];
      isReturning = true;
      console.log(`Returning player: ${session.name} (token: ${token})`);

      // Map this socket to the existing session
      socketToSession[socket.id] = token;

      // If player entry doesn't exist (was cleaned up), recreate with persisted position or new spawn
      if (!players[token]) {
        // Player was removed, create new spawn position
        const spawn = getRandomSpawnPosition();
        players[token] = {
          id: token,
          x: spawn.x,
          y: spawn.y,
          color: session.color,
          skinType: session.skinType,
          name: session.name,
          direction: 1,
        };
      }
      // Player entry exists - keep their position (persist across refresh)
    } else {
      // Create new session
      token = generateSessionToken();
      session = createNewCat();
      sessions[token] = session;
      scores[token] = 0;
      console.log(`New player created: ${session.name} (token: ${token})`);

      // Map this socket to the session
      socketToSession[socket.id] = token;

      // Generate spawn position
      const spawn = getRandomSpawnPosition();

      // Initialize player in players object
      players[token] = {
        id: token,
        x: spawn.x,
        y: spawn.y,
        color: session.color,
        skinType: session.skinType,
        name: session.name,
        direction: 1,
      };
    }

    // Send session data to client
    socket.emit('session-established', {
      token: token,
      player: {
        id: token,
        x: players[token].x,
        y: players[token].y,
        color: session.color,
        skinType: session.skinType,
        name: session.name,
        direction: players[token].direction || 1,
      },
      score: scores[token] || 0,
      isReturning: isReturning,
    });

    // Broadcast updated player list to all clients
    io.emit('players-list', players);
  });

  // Handle Player Join/Update
  socket.on('player-update', (data) => {
    if (!data || !data.token) return;

    const token = data.token;

    // Verify this socket owns this token
    if (socketToSession[socket.id] !== token) {
      console.log(`Token mismatch: socket ${socket.id} tried to update token ${token}`);
      return;
    }

    // Check if player is stunned
    const now = Date.now();
    if (stunned[token] && stunned[token].until > now) {
      // Reject position update, keep other properties
      players[token] = {
        ...players[token],
        id: token,
        direction: data.direction,
        skinType: data.skinType,
        name: data.name,
        color: data.color,
      };
    } else {
      // Normal update - merge with existing data
      players[token] = {
        ...players[token],
        id: token,
        x: data.x,
        y: data.y,
        color: data.color,
        direction: data.direction,
        skinType: data.skinType,
        name: data.name,
      };
    }
    // Don't broadcast here - let the game loop handle it to reduce traffic
  });

  // Handle incoming chat messages
  socket.on('chat-message', (msg) => {
    console.log(`Message from ${msg.name}: ${msg.text}`);

    // Broadcast to everyone except the sender
    socket.broadcast.emit('chat-message', {
      senderId: msg.senderId,
      name: msg.name,
      text: msg.text,
      color: msg.color,
      timestamp: Date.now(),
    });
  });

  // Fallback for the secondary event name emitted by the client
  socket.on('send-chat', (msg) => {
    socket.broadcast.emit('chat-message', {
      senderId: msg.senderId,
      name: msg.name,
      text: msg.text,
      color: msg.color,
      timestamp: Date.now(),
    });
  });

  // Handle yarn firing
  socket.on('fire-yarn', (data) => {
    // Get token from socket mapping
    const token = socketToSession[socket.id];
    if (!token) return;

    const player = players[token];
    if (!player) return;

    // Check if stunned
    const now = Date.now();
    if (stunned[token] && stunned[token].until > now) {
      return;
    }

    // Check cooldown
    const lastShot = playerCooldowns[token] || 0;
    if (now - lastShot < PROJECTILE_COOLDOWN) {
      return;
    }

    // Create projectile
    const projectileId = `proj-${token}-${now}`;
    const { directionX, directionY } = data;

    // Normalize direction
    const mag = Math.sqrt(directionX * directionX + directionY * directionY);
    if (mag === 0) return;

    projectiles[projectileId] = {
      id: projectileId,
      x: player.x,
      y: player.y,
      vx: (directionX / mag) * PROJECTILE_SPEED,
      vy: (directionY / mag) * PROJECTILE_SPEED,
      ownerId: token, // Use token as owner ID
      createdAt: now,
    };

    playerCooldowns[token] = now;
    io.emit('projectiles-update', Object.values(projectiles));
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    const token = socketToSession[socket.id];
    console.log(`Socket disconnected: ${socket.id} (token: ${token})`);

    if (token) {
      // Remove socket-to-session mapping
      delete socketToSession[socket.id];

      // DON'T delete the player - keep them in the game for reconnection
      // Their position persists until server restart
      // Only broadcast player-removed if no other socket controls this token
      // (This handles multiple tabs scenario)

      // Check if any other socket is using this token
      const tokenStillActive = Object.values(socketToSession).includes(token);
      if (!tokenStillActive) {
        // No active socket for this player, but keep their data for reconnection
        // Optionally: you could set a timeout to remove inactive players after X minutes
        console.log(`Player ${token} has no active connections but data preserved`);
      }
    }

    // Don't broadcast player-removed - player persists for reconnection
  });
});

// Server game loop - physics and collision detection
setInterval(() => {
  const now = Date.now();

  // Update projectiles
  for (let id in projectiles) {
    const proj = projectiles[id];

    // Move projectile
    proj.x += proj.vx;
    proj.y += proj.vy;

    // Remove if out of bounds or expired
    if (
      proj.x < 0 ||
      proj.x > WORLD_SIZE ||
      proj.y < 0 ||
      proj.y > WORLD_SIZE ||
      now - proj.createdAt > PROJECTILE_LIFETIME
    ) {
      delete projectiles[id];
      continue;
    }

    // Check collision with players (players keyed by token)
    for (let token in players) {
      if (token === proj.ownerId) continue;

      // Check immunity
      if (stunned[token] && stunned[token].immuneUntil > now) {
        continue;
      }

      const player = players[token];
      const dx = proj.x - player.x;
      const dy = proj.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < HIT_RADIUS) {
        // HIT!
        stunned[token] = {
          until: now + STUN_DURATION,
          immuneUntil: now + STUN_DURATION + STUN_IMMUNITY,
        };
        io.emit('player-stunned', {
          playerId: token, // Send token as playerId for client to match
          until: now + STUN_DURATION,
          immuneUntil: now + STUN_DURATION + STUN_IMMUNITY,
        });
        delete projectiles[id];
        break;
      }
    }
  }

  // Check fish collection
  for (let fishId in fish) {
    const f = fish[fishId];
    for (let token in players) {
      const player = players[token];
      const dx = f.x - player.x;
      const dy = f.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < FISH_COLLECTION_RADIUS) {
        // Collect fish - scores keyed by token
        scores[token] = (scores[token] || 0) + 1;

        io.emit('fish-collected', {
          fishId,
          playerId: token,
          newScore: scores[token],
          allScores: scores, // Include all scores for leaderboard update
        });
        delete fish[fishId];
        break;
      }
    }
  }

  // Broadcast state (batched for efficiency)
  io.emit('players-list', players);
  io.emit('projectiles-update', Object.values(projectiles));
  // Note: scores are sent via fish-collected event, not every tick
}, 100); // 10 ticks per second for better performance

// Fish spawning
setInterval(() => {
  const currentFishCount = Object.keys(fish).length;

  if (currentFishCount < FISH_MAX_COUNT) {
    const fishId = `fish-${Date.now()}-${Math.random()}`;
    const newFish = {
      id: fishId,
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      spawned: Date.now(),
    };
    fish[fishId] = newFish;
    // Only send the new fish, not all fish
    io.emit('fish-spawned', newFish);
  }
}, FISH_SPAWN_INTERVAL);

server.listen(PORT, () => {
  console.log(`Neon Feline Server running on http://localhost:${PORT}`);
});
