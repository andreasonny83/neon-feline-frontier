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

// In-memory player storage
let players = {};

// Game state
let projectiles = {};
let fish = {};
let stunned = {}; // { playerId: { until: timestamp, immuneUntil: timestamp } }
let playerCooldowns = {};
let scores = {}; // { playerId: fishCount }

// Constants
const WORLD_SIZE = 50000;
const PROJECTILE_SPEED = 25;
const PROJECTILE_LIFETIME = 2000;
const PROJECTILE_COOLDOWN = 500;
const STUN_DURATION = 3000;
const STUN_IMMUNITY = 5000;
const HIT_RADIUS = 30;
const FISH_SPAWN_INTERVAL = 1000;
const FISH_MAX_COUNT = 1000;
const FISH_COLLECTION_RADIUS = 50;

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send current state to newly connected player
  socket.emit('players-list', players);

  // Handle Player Join/Update
  socket.on('player-update', (data) => {
    // Check if player is stunned
    const now = Date.now();
    if (stunned[socket.id] && stunned[socket.id].until > now) {
      // Reject position update, keep other properties
      players[socket.id] = {
        ...players[socket.id],
        id: socket.id,
        direction: data.direction,
        skinType: data.skinType,
        name: data.name,
        color: data.color,
      };
    } else {
      // Normal update
      players[socket.id] = { ...data, id: socket.id };
    }
    // Use io.emit so EVERYONE (including the sender) gets the updated list
    io.emit('players-list', players);
  });

  // Handle incoming chat messages
  // The client sends 'chat-message' or 'send-chat'
  socket.on('chat-message', (msg) => {
    console.log(`Message from ${msg.name}: ${msg.text}`);

    // Broadcast to everyone except the sender
    // (Since the client adds the message locally immediately)
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
    const player = players[socket.id];
    if (!player) return;

    // Check if stunned
    const now = Date.now();
    if (stunned[socket.id] && stunned[socket.id].until > now) {
      return;
    }

    // Check cooldown
    const lastShot = playerCooldowns[socket.id] || 0;
    if (now - lastShot < PROJECTILE_COOLDOWN) {
      return;
    }

    // Create projectile
    const projectileId = `proj-${socket.id}-${now}`;
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
      ownerId: socket.id,
      createdAt: now,
    };

    playerCooldowns[socket.id] = now;
    io.emit('projectiles-update', Object.values(projectiles));
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete players[socket.id];
    delete stunned[socket.id];
    delete playerCooldowns[socket.id];
    delete scores[socket.id];
    io.emit('player-removed', socket.id);
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

    // Check collision with players
    for (let playerId in players) {
      if (playerId === proj.ownerId) continue;

      // Check immunity
      if (stunned[playerId] && stunned[playerId].immuneUntil > now) {
        continue;
      }

      const player = players[playerId];
      const dx = proj.x - player.x;
      const dy = proj.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < HIT_RADIUS) {
        // HIT!
        stunned[playerId] = {
          until: now + STUN_DURATION,
          immuneUntil: now + STUN_DURATION + STUN_IMMUNITY,
        };
        io.emit('player-stunned', {
          playerId,
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
    for (let playerId in players) {
      const player = players[playerId];
      const dx = f.x - player.x;
      const dy = f.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < FISH_COLLECTION_RADIUS) {
        // Collect fish
        scores[playerId] = (scores[playerId] || 0) + 1;
        io.emit('fish-collected', { fishId, playerId, newScore: scores[playerId] });
        delete fish[fishId];
        break;
      }
    }
  }

  // Broadcast state
  io.emit('projectiles-update', Object.values(projectiles));
  // io.emit('fish-update', Object.values(fish));
  io.emit('scores-update', scores);
}, 20); // 40 ticks per second

// Fish spawning
setInterval(() => {
  const currentFishCount = Object.keys(fish).length;

  if (currentFishCount < FISH_MAX_COUNT) {
    const fishId = `fish-${Date.now()}-${Math.random()}`;
    fish[fishId] = {
      id: fishId,
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      spawned: Date.now(),
    };
    io.emit('fish-update', Object.values(fish));
  }
}, FISH_SPAWN_INTERVAL);

server.listen(PORT, () => {
  console.log(`Neon Feline Server running on http://localhost:${PORT}`);
});
